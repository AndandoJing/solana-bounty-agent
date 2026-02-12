import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("escrow_agent (agent-enforced settlement)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = (anchor.workspace as any).BlueshiftAnchorEscrow as Program;

  const connection = provider.connection;
  const payer = (provider.wallet as any).payer as anchor.web3.Keypair;

  const maker = payer;
  const keeper = anchor.web3.Keypair.generate();

  let mintA: anchor.web3.PublicKey;
  let makerAtaA: anchor.web3.PublicKey;
  let keeperAtaA: anchor.web3.PublicKey;

  const deposit = new anchor.BN("1000000");
  const receive = new anchor.BN("1");

  before(async () => {
    const sig = await connection.requestAirdrop(
      keeper.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig);

    mintA = await createMint(connection, maker, maker.publicKey, null, 6);

    const makerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      mintA,
      maker.publicKey
    );
    makerAtaA = makerAta.address;

    const keeperAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keeper,
      mintA,
      keeper.publicKey
    );
    keeperAtaA = keeperAta.address;

    await mintTo(
      connection,
      maker,
      mintA,
      makerAtaA,
      maker,
      BigInt(deposit.toString())
    );
  });

  it("release path", async () => {
    const now = Math.floor(Date.now() / 1000);
    const seed = new anchor.BN(Date.now().toString());        // 防重复
    const deadline = new anchor.BN((now + 3600).toString());  // ✅ 未来 1 小时

    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        Buffer.from(seed.toArray("le", 8)),
      ],
      program.programId
    );

    const vault = anchor.web3.Keypair.generate();

    await program.methods
      .make(seed, deposit, receive, deadline)
      .accounts({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA,
        mintB: mintA,
        makerAtaA,
        vault: vault.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([vault])
      .rpc();

    await program.methods
      .confirmDelivery()
      .accounts({
        maker: maker.publicKey,
        escrow: escrowPda,
      })
      .rpc();

    await program.methods
      .checkAndExecute()
      .accounts({
        keeper: keeper.publicKey,
        maker: maker.publicKey,
        escrow: escrowPda,
        makerAtaA,
        keeperAtaA,
        vault: vault.publicKey,
        mintA,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([keeper])
      .rpc();

    const keeperAfter = await getAccount(connection, keeperAtaA);

    assert.equal(
      Number(keeperAfter.amount),
      Number(deposit.toString()),
      "keeper should receive deposit"
    );
  });
    
    it("refund path", async () => {
    const now = Math.floor(Date.now() / 1000);
    const seed = new anchor.BN(Date.now( - 1).toString());            // 也用时间戳即可，避免重复
    const deadline = new anchor.BN((now - 1).toString());         // ✅ 已过期，但不是负数
    const deposit2 = new anchor.BN("1000000");
    const receive2 = new anchor.BN("1");


    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        Buffer.from(seed.toArray("le", 8)),
      ],
      program.programId
    );

    const vault = anchor.web3.Keypair.generate();

    // ✅ 关键：给 makerAtaA 再铸一次，保证有余额做第二次 make
    await mintTo(
      connection,
      maker,
      mintA,
      makerAtaA,
      maker,
      BigInt(deposit2.toString())
    );

    const makerBefore = await getAccount(connection, makerAtaA);


    await program.methods
      .make(seed, deposit2, receive2, deadline)
      .accounts({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA,
        mintB: mintA,
        makerAtaA,
        vault: vault.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([vault])
      .rpc();

    // no confirmDelivery here

    await program.methods
      .checkAndExecute()
      .accounts({
        keeper: keeper.publicKey,
        maker: maker.publicKey,
        escrow: escrowPda,
        makerAtaA,
        keeperAtaA,
        vault: vault.publicKey,
        mintA,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([keeper])
      .rpc();

    const makerAfter = await getAccount(connection, makerAtaA);

    assert.equal(
      Number(makerAfter.amount),
      Number(makerBefore.amount),
      "maker should be refunded after deadline without confirmation"
    );
  });

});
