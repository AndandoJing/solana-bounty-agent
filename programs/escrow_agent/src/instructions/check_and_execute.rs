use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::{errors::EscrowError, state::Escrow};

#[derive(Accounts)]
pub struct CheckAndExecute<'info> {
    /// keeper：任何人可触发，不参与决策
    #[account(mut)]
    pub keeper: Signer<'info>,

    /// maker：退款/返租金的目的地
    /// CHECK: only used for address + ATA authority
    #[account(mut)]
    pub maker: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow", maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
        has_one = maker
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_a: InterfaceAccount<'info, TokenAccount>,

    /// 演示用：释放给 keeper（体现 keeper trigger + rule enforced）
    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = keeper,
        associated_token::token_program = token_program
    )]
    pub keeper_ata_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint_a,
        token::authority = escrow,
        token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub mint_a: InterfaceAccount<'info, Mint>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<CheckAndExecute>) -> Result<()> {
    // ---- copy values first (avoid borrow conflicts) ----
    let buyer_confirmed = ctx.accounts.escrow.buyer_confirmed;
    let executed = ctx.accounts.escrow.executed;
    let deposit = ctx.accounts.escrow.deposit;
    let deadline = ctx.accounts.escrow.deadline;
    let seed = ctx.accounts.escrow.seed;
    let bump = ctx.accounts.escrow.bump;

    require!(!executed, EscrowError::AlreadyExecuted);

    let now = Clock::get()?.unix_timestamp;

    let maker_key = ctx.accounts.maker.key();
    let seed_bytes = seed.to_le_bytes();

    // escrow PDA signer seeds
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        maker_key.as_ref(),
        seed_bytes.as_ref(),
        &[bump],
    ]];

    // cache AccountInfo (so we don't re-borrow escrow after mutable updates)
    let escrow_ai = ctx.accounts.escrow.to_account_info();

    if buyer_confirmed {
        // release -> keeper
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint_a.to_account_info(),
                    to: ctx.accounts.keeper_ata_a.to_account_info(),
                    authority: escrow_ai.clone(),
                },
                signer_seeds,
            ),
            deposit,
            ctx.accounts.mint_a.decimals,
        )?;
    } else {
        // not confirmed: only refund after deadline
        require!(now > deadline, EscrowError::NotReady);

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint_a.to_account_info(),
                    to: ctx.accounts.maker_ata_a.to_account_info(),
                    authority: escrow_ai.clone(),
                },
                signer_seeds,
            ),
            deposit,
            ctx.accounts.mint_a.decimals,
        )?;
    }

    // close vault rent -> maker
    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: escrow_ai,
        },
        signer_seeds,
    ))?;

    // mark executed
    ctx.accounts.escrow.executed = true;
    Ok(())
}
