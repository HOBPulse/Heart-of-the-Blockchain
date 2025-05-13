use anchor_lang::prelude::*;
use anchor_spl::token::*;
use anchor_spl::associated_token::*;
use account_compression::program::AccountCompression;
use account_compression::cpi::accounts::CreateTree;
use account_compression::cpi::create_tree;

use crate::state::CampaignInfo;

mod light_programs {
    use anchor_lang::declare_id;
    declare_id!("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
}

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, description: String, max_depth: u32, max_buffer_size: u32)]
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

    /// CHECK: The Merkle tree account (tree_config) to be created via CPI.
    /// Authority is the campaign_account_info PDA.
    /// Payer is the creator.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    #[account(address = light_programs::ID)]
    pub light_account_compression_program: Program<'info, AccountCompression>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> InitializeCampaign<'info> {
    pub fn init_campaign(
        &mut self,
        campaign_id: u64,
        title: String,
        description: String,
        max_depth: u32,
        max_buffer_size: u32,
    ) -> Result<()> {
        let campaign = &mut self.campaign_account_info;
        campaign.creator = self.creator.key();
        campaign.title = title.clone();
        campaign.description = description;
        campaign.mint = self.mint.key();
        campaign.token_account = self.campaign_token_account.key();
        campaign.total_donation_received = 0;
        
        // Initialize the new fields
        campaign.latest_merkle_root = [0u8; 32]; // Initial empty root
        campaign.donation_count = 0;
        campaign.last_update_time = Clock::get()?.unix_timestamp;

        let cpi_program = self.light_account_compression_program.to_account_info();
        let cpi_accounts = CreateTree {
            tree_config: self.merkle_tree.to_account_info(),
            authority: campaign.to_account_info(),
            payer: self.creator.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };

        let campaign_seeds = &[
            campaign_id.to_le_bytes().as_ref(),
            title.as_bytes().as_ref(),
            &[*self.ctx.bumps.get("campaign_account_info").unwrap()]
        ];
        let signer_seeds = &[&campaign_seeds[..]];
        
        msg!("Creating Merkle tree via CPI...");
        create_tree(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            max_depth,
            max_buffer_size
        )?;

        campaign.merkle_tree = self.merkle_tree.key();

        msg!("Campaign and Merkle Tree initialized. Campaign: {:?}, Merkle Tree: {}", campaign, campaign.merkle_tree);
        Ok(())
    }
}
