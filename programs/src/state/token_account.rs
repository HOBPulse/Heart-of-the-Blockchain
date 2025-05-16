use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct TokenAccount {
    /// SPL Token mint address
    pub mint: Pubkey,

    /// Owner of the token account (e.g., campaign PDA)
    pub owner: Pubkey,

    /// Token account address (SPL Token account)
    pub token_account: Pubkey,

    /// Total tokens received (for audit)
    pub total_received: u64,

    /// Last update timestamp
    pub last_update_time: i64,
} 