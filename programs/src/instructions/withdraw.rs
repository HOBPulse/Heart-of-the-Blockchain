use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::*};

use crate::state::CampaignInfo;

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, withdraw_amount: u64)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [campaign_id.to_le_bytes().as_ref(), title.as_bytes().as_ref()],
        bump,
        has_one = creator,
    )]
    pub campaign_account_info: Account<'info, CampaignInfo>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = campaign_account_info.key(),
    )]
    pub campaign_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, campaign_id: u64, title: String, withdraw_amount: u64) -> Result<()> {
        // Ownership and state checks
        require!(self.campaign_account_info.creator == self.creator.key(), ErrorCode::Unauthorized);
        require!(self.campaign_account_info.total_donation_received >= withdraw_amount, ErrorCode::InsufficientFunds);

        // Transfer tokens from campaign to creator
        let cpi_accounts = TransferChecked {
            from: self.campaign_token_account.to_account_info(),
            to: self.creator_token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.campaign_account_info.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        let seeds = &[
            campaign_id.to_le_bytes().as_ref(),
            title.as_bytes().as_ref(),
            &[*self.ctx.bumps.get("campaign_account_info").unwrap()],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer_checked(cpi_ctx, withdraw_amount, self.mint.decimals)?;

        // Update state
        self.campaign_account_info.total_donation_received -= withdraw_amount;
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only the campaign creator can withdraw.")]
    Unauthorized,
    #[msg("Insufficient funds in campaign account.")]
    InsufficientFunds,
} 