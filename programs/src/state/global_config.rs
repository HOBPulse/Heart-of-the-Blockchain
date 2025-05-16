use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct GlobalConfig {
    /// Admin authority (upgrade authority, can update config)
    pub admin: Pubkey,

    /// Fee basis points (e.g., 100 = 1%)
    pub fee_bps: u16,

    /// Treasury account (donde van las fees)
    pub treasury: Pubkey,

    /// Is the program paused?
    pub paused: bool,

    /// Last config update timestamp
    pub last_update_time: i64,
} 