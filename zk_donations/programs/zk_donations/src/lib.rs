use anchor_lang::prelude::*;
use account_compression::program::AccountCompression; // Import the Light Protocol program
use account_compression::cpi::accounts::CreateTree;
use account_compression::cpi::create_tree;

// Define the Account Compression Program ID
mod light_programs {
    use anchor_lang::declare_id;
    declare_id!("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
}

declare_id!("9PY5ThauBNu2GJCKmeP5y8LN6zbNvEdXnVaKwnvHGZCW");

#[program]
pub mod zk_donations {
    use super::*;

    /// Initializes a new donation campaign and its associated compressed donation state tree.
    ///
    /// Arguments:
    /// - `ctx`: Context struct containing required accounts.
    /// - `campaign_id`: A unique identifier for the campaign within the user's scope.
    /// - `title`: The title of the campaign.
    /// - `description`: A description of the campaign.
    /// - `max_depth`: The maximum depth of the Merkle tree for compressed donations.
    /// - `max_buffer_size`: The maximum number of leaves that can be appended in a single transaction.
    ///
    /// Accounts:
    /// - `user`: The signer initializing the campaign.
    /// - `campaign`: The campaign account (PDA) to be initialized.
    /// - `merkle_tree`: The account for the Merkle tree, created via CPI to Light Protocol.
    /// - `light_account_compression_program`: The Light Protocol account compression program.
    /// - `system_program`: Required for creating the campaign PDA.
    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: u64,
        title: String,
        description: String,
        max_depth: u32,
        max_buffer_size: u32,
    ) -> Result<()> {
        msg!("Initializing campaign...");
        let campaign = &mut ctx.accounts.campaign;
        campaign.user = *ctx.accounts.user.key;
        campaign.campaign_id = campaign_id;
        campaign.title = title;
        campaign.description = description;
        campaign.bump = *ctx.bumps.get("campaign").unwrap();

        // Prepare CPI accounts for creating the Merkle Tree
        let cpi_program = ctx.accounts.light_account_compression_program.to_account_info();
        // NOTE: `merkle_tree` account passed to this instruction *is* the `tree_config` account for the CPI
        let cpi_accounts = CreateTree {
            tree_config: ctx.accounts.merkle_tree.to_account_info(),
            // The campaign PDA will be the authority that can modify the tree
            authority: campaign.to_account_info(),
            payer: ctx.accounts.user.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            // NOTE: Log wrapper is not explicitly required here as it's handled by Anchor/runtime if needed
            // log_wrapper: ?, // No explicit log_wrapper needed usually
        };

        // Derive PDA signer seeds for the campaign account (authority)
        let seeds = &[
            b"campaign".as_ref(),
            campaign.user.as_ref(),
            &campaign.campaign_id.to_le_bytes()[..],
            &[campaign.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        msg!("Creating Merkle tree via CPI...");
        // Execute the CPI to create the tree
        create_tree(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            max_depth,
            max_buffer_size
        )?;

        // Store the actual Merkle Tree account pubkey in the campaign state
        campaign.merkle_tree = ctx.accounts.merkle_tree.key();

        msg!(
            "Campaign initialized: {}, Title: {}, Merkle Tree: {}",
            campaign_id,
            campaign.title,
            campaign.merkle_tree
        );
        Ok(())
    }

    // TODO: Add donate_compressed_amount instruction
    // TODO: Add withdraw_compressed instruction
}

/// Context for the initialize_campaign instruction.
#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, description: String, max_depth: u32, max_buffer_size: u32)] // Add args for CPI
pub struct InitializeCampaign<'info> {
    /// The user initializing the campaign (signer).
    #[account(mut)]
    pub user: Signer<'info>,

    /// The campaign account (PDA) to be created and act as tree authority.
    #[account(
        init,
        payer = user,
        space = Campaign::LEN, // Calculate space accurately
        seeds = [b"campaign".as_ref(), user.key().as_ref(), campaign_id.to_le_bytes().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: The Merkle tree account (tree_config) to be created via CPI.
    /// Authority is the campaign PDA.
    /// Payer is the user.
    /// We use CHECK as it's initialized by another program.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// The Light Protocol account compression program.
    #[account(address = light_programs::ID)]
    pub light_account_compression_program: Program<'info, AccountCompression>,

    /// Solana System Program.
    pub system_program: Program<'info, System>,
}

/// State account for a donation campaign.
#[account]
pub struct Campaign {
    /// The user who initialized the campaign.
    pub user: Pubkey,
    /// Unique identifier for the campaign (within user scope).
    pub campaign_id: u64,
    /// Title of the campaign.
    pub title: String,
    /// Description of the campaign.
    pub description: String,
    /// Public key of the associated Merkle tree account (managed by Light Protocol).
    pub merkle_tree: Pubkey,
    /// PDA bump seed.
    pub bump: u8,
    // TODO: Add other fields like goal amount, deadline, total raised (if needed off-chain)
}

impl Campaign {
    // Calculate the space needed for the Campaign account.
    // Adjust sizes based on actual data types and string lengths.
    const LEN: usize = 8 // Discriminator
        + 32 // user pubkey
        + 8 // campaign_id u64
        + 4 + 50 // title String (assuming max 50 chars)
        + 4 + 200 // description String (assuming max 200 chars)
        + 32 // merkle_tree pubkey
        + 1; // bump u8
}
