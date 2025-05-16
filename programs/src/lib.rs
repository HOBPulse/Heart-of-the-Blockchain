pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9FHnJ6S5P1UoWtyd6iqXYESy4WEGvGArA5W17f6H1gQk");

#[program]
pub mod heart_of_blockchain {
    use super::*;

    pub fn init_campaign(ctx: Context<InitializeCampaign>, campaign_id: u64, title: String, description: String) -> Result<()> {
        ctx.accounts.init_campaign(campaign_id, title, description)
    }

    pub fn init_doner(ctx: Context<InitDoner>, campaign: Pubkey) -> Result<()> {
        ctx.accounts.init_doner(campaign)
    }

    pub fn donate_amount(ctx: Context<DonateAmount>, campaign_id: u64, title: String, donation_amount: u64) -> Result<()> {
        ctx.accounts.donate_amount(campaign_id, title, donation_amount)
    }
    
    pub fn donate_compressed(ctx: Context<DonateCompressed>, campaign_id: u64, title: String, proof_data: Vec<u8>) -> Result<()> {
        ctx.accounts.donate_compressed(campaign_id, title, proof_data)
    }

    pub fn withdraw(ctx: Context<Withdraw>, campaign_id: u64, title: String, withdraw_amount: u64) -> Result<()> {
        ctx.accounts.withdraw(campaign_id, title, withdraw_amount)
    }
}
