use anchor_lang::prelude::*;

// PDA 种子常量与托管账户状态。
pub const ESCROW_SEED: &[u8] = b"escrow";

#[derive(InitSpace)]
#[account(discriminator = 1)]
pub struct Escrow {
    pub seed: u64,
    pub maker: Pubkey,

    // Token A: maker 托管到 vault 的资产
    pub mint_a: Pubkey,

    // 下面两项是你原来的“交换条款”，暂时保留（不影响 agent 逻辑）
    pub mint_b: Pubkey,
    pub receive: u64,

    // ===== Agent 关键字段 =====
    pub deposit: u64,          // 实际托管数量（Token A）
    pub buyer_confirmed: bool, // maker 是否确认交付/验收
    pub deadline: i64,         // 截止时间 unix 秒
    pub executed: bool,        // 防止重复执行

    pub bump: u8,
}
