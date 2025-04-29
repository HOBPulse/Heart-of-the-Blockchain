use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct DonerInfo {
    pub doner: Pubkey,
    pub amount: u64,
    pub campaign: Pubkey,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct CampaignInfo {
    pub creator: Pubkey,

    #[max_len(50)]
    pub title: String,

    #[max_len(200)]
    pub description: String,

    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub total_donation_received: u64,
}
