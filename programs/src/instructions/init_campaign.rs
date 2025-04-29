use anchor_lang::prelude::*;
use anchor_spl::token::*;
use anchor_spl::associated_token::*;

use crate::state::CampaignInfo;

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String)]
pub struct InitializeCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        seeds = [campaign_id.to_le_bytes().as_ref(), title.as_bytes().as_ref()],
        bump,
        space = 8 + CampaignInfo::INIT_SPACE,
    )]
    pub campaign_account_info: Account<'info, CampaignInfo>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub campaign_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> InitializeCampaign<'info> {
    pub fn init_campaign(
        &mut self,
        _campaign_id: u64,
        title: String,
        description: String,
    ) -> Result<()> {
        let campaign = &mut self.campaign_account_info;
        campaign.creator = self.creator.key();
        campaign.title = title;
        campaign.description = description;
        campaign.mint = self.mint.key();
        campaign.token_account = self.campaign_token_account.key();
        campaign.total_donation_received = 0;

        msg!("Campaign initialized: {:?}", campaign);
        Ok(())
    }
}
