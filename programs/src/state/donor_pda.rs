use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct DonorPDA {
    /// Donor wallet address
    pub donor: Pubkey,

    /// Associated campaign
    pub campaign: Pubkey,

    /// Total amount donated
    pub total_donated: u64,

    /// Last donation timestamp
    pub last_donation_time: i64,
} 