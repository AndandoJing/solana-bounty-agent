use anchor_lang::prelude::*;
use crate::{state::Escrow, errors::EscrowError};

#[derive(Accounts)]
pub struct ConfirmDelivery<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mut, has_one = maker)]
    pub escrow: Account<'info, Escrow>,
}

pub fn handler(ctx: Context<ConfirmDelivery>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    require!(!escrow.executed, EscrowError::AlreadyExecuted);

    escrow.buyer_confirmed = true;
    Ok(())
}
