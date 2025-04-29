use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::*};

use crate::state::{CampaignInfo, DonerInfo};

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, donation_amount: u64)]
pub struct DonateAmount<'info> {
    #[account(mut)]
    pub doner: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [campaign_id.to_le_bytes().as_ref(), title.as_bytes().as_ref()],
        bump
    )]
    pub campaign_account_info: Account<'info, CampaignInfo>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = doner,
    )]
    pub doner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = campaign_account_info.creator,
    )]
    pub campaign_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"doner", campaign_account_info.key().as_ref(), doner.key().as_ref()],
        bump
    )]
    pub doner_account_info: Account<'info, DonerInfo>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> DonateAmount<'info> {
    pub fn donate_amount(&mut self, campaign_id: u64, title: String, donation_amount: u64) -> Result<()> {
        // Transfer tokens from doner to campaign
        let cpi_accounts = TransferChecked {
            from: self.doner_token_account.to_account_info(),
            to: self.campaign_token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.doner.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, donation_amount, self.mint.decimals)?;

        // Update state
        self.doner_account_info.amount += donation_amount;
        self.campaign_account_info.total_donation_received += donation_amount;

        msg!("{} donated {}", self.doner.key(), donation_amount);
        Ok(())
    }
}
