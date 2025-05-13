use anchor_lang::prelude::*;
use account_compression::program::AccountCompression; // Import the Light Protocol program
use account_compression::cpi::accounts::InitializeBatchedStateMerkleTreeAndQueue as AccCompInitializeBatchedTreeAndQueue;
use account_compression::cpi::initialize_batched_state_merkle_tree;
use account_compression::cpi::accounts::BatchAppend;
use account_compression::cpi::batch_append;

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
    /// - `params_bytes`: Serialized InitStateTreeAccountsInstructionData.
    ///
    /// Accounts:
    /// - `user`: The signer initializing the campaign.
    /// - `campaign`: The campaign account (PDA) to be initialized.
    /// - `merkle_tree`: The account for the Merkle tree, created via CPI to Light Protocol.
    /// - `output_queue`: The account for the output queue, created via CPI to Light Protocol.
    /// - `light_account_compression_program`: The Light Protocol account compression program.
    /// - `system_program`: Required for creating the campaign PDA.
    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: u64,
        title: String,
        description: String,
        params_bytes: Vec<u8>, // Serialized InitStateTreeAccountsInstructionData
    ) -> Result<()> {
        msg!("Initializing campaign and Light Protocol state...");
        let campaign = &mut ctx.accounts.campaign;
        campaign.user = *ctx.accounts.user.key;
        campaign.campaign_id = campaign_id;
        campaign.title = title.clone(); // Clone if title is used in PDA seeds
        campaign.description = description;
        campaign.bump = ctx.bumps.campaign; // Actualización para la nueva versión de Anchor

        // Prepare CPI accounts for creating the Merkle Tree and Queue
        let cpi_program = ctx.accounts.light_account_compression_program.to_account_info();
        
        let cpi_accounts = AccCompInitializeBatchedTreeAndQueue {
            authority: campaign.to_account_info(), // Campaign PDA is authority
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            queue: ctx.accounts.output_queue.to_account_info(),
            registered_program_pda: None, // Assuming not used for direct CPI like this
        };

        // Derive PDA signer seeds for the campaign account (authority)
        let campaign_pda_seeds = &[
            b"campaign".as_ref(),
            campaign.user.as_ref(),
            &campaign.campaign_id.to_le_bytes()[..],
            &[campaign.bump]
        ];
        let signer_seeds = &[&campaign_pda_seeds[..]];

        msg!("Initializing Light Protocol Merkle tree and queue via CPI...");
        initialize_batched_state_merkle_tree(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            params_bytes // Pass the serialized params directly
        )?;

        // Store the pubkeys of the initialized tree and queue
        campaign.merkle_tree = ctx.accounts.merkle_tree.key();
        campaign.output_queue = ctx.accounts.output_queue.key();

        msg!(
            "Campaign initialized: {}, Title: {}, Merkle Tree: {}, Output Queue: {}",
            campaign_id,
            campaign.title,
            campaign.merkle_tree,
            campaign.output_queue
        );
        Ok(())
    }

    pub fn donate_compressed_amount(
        ctx: Context<DonateCompressedAmount>,
        _campaign_id: u64, // Used to derive campaign PDA, might not be needed if campaign account is passed directly and validated
        _leaf_data: Vec<u8>, // Placeholder for actual donation data / leaf representation
        proof_data: Vec<u8>, // Placeholder for ZK proof data
    ) -> Result<()> {
        msg!("Attempting to make a compressed donation...");

        let campaign = &ctx.accounts.campaign;
        // TODO: 1. Client must serialize InstructionDataBatchAppendInputs (from Light Protocol) and pass as proof_data or a new param.
        // For ahora, proof_data se espera que sea el Vec<u8> serializado correcto.
        // Ver: external/light-protocol/programs/account-compression/src/lib.rs (batch_append)

        // Prepare CPI context for batch_append
        let cpi_program = ctx.accounts.light_account_compression_program.to_account_info();
        let cpi_accounts = BatchAppend {
            authority: campaign.to_account_info(), // Campaign PDA is authority
            registered_program_pda: None, // Not used in this context
            log_wrapper: ctx.accounts.campaign.to_account_info(), // Placeholder, NOOP account may be needed
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            output_queue: ctx.accounts.output_queue.to_account_info(), // Ahora utilizamos output_queue propiamente
        };
        let campaign_pda_seeds = &[
            b"campaign".as_ref(),
            campaign.user.as_ref(),
            &campaign.campaign_id.to_le_bytes()[..],
            &[campaign.bump]
        ];
        let signer_seeds = &[&campaign_pda_seeds[..]];

        // CPI call to batch_append (Light Protocol)
        // TODO: Replace proof_data with the correct serialization of InstructionDataBatchAppendInputs
        batch_append(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            proof_data // Should be the serialized InstructionDataBatchAppendInputs
        )?;

        msg!("Compressed donation processed for campaign: {}", campaign.title);
        Ok(())
    }
}

/// Context for the initialize_campaign instruction.
#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, description: String, params_bytes: Vec<u8>)]
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

    /// CHECK: The Merkle tree account to be initialized by Light Protocol.
    /// Assumed to be created and rent-paid by the client before this instruction.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: The Output queue account to be initialized by Light Protocol.
    /// Assumed to be created and rent-paid by the client before this instruction.
    #[account(mut)]
    pub output_queue: UncheckedAccount<'info>,

    /// The Light Protocol account compression program.
    #[account(address = light_programs::ID)]
    pub light_account_compression_program: Program<'info, AccountCompression>,

    /// Solana System Program.
    pub system_program: Program<'info, System>,
}

/// Context for the donate_compressed_amount instruction
#[derive(Accounts)]
#[instruction(_campaign_id: u64, _leaf_data: Vec<u8>, proof_data: Vec<u8>)] // Match args with handler
pub struct DonateCompressedAmount<'info> {
    #[account(mut)]
    pub user_donator: Signer<'info>, // The one making the donation and signing

    // Campaign account, needs to be verified or use Account<'info, Campaign>
    #[account(mut, has_one = merkle_tree)] // merkle_tree field in Campaign struct must match the merkle_tree account below.
    pub campaign: Account<'info, Campaign>,

    /// CHECK: The Merkle tree account associated with the campaign.
    /// Authority should be the campaign PDA.
    #[account(mut)] // Tree is modified
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: The Output queue account associated with the campaign.
    #[account(mut)] // Queue is modified
    pub output_queue: UncheckedAccount<'info>,

    #[account(address = light_programs::ID)]
    pub light_account_compression_program: Program<'info, AccountCompression>,

    // Payer for any transaction fees if not user_donator implicitly
    // pub system_program: Program<'info, System>, // May not be needed if no new accounts created by this instruction directly
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
    /// Public key of the associated output queue account (managed by Light Protocol).
    pub output_queue: Pubkey,
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
        + 32 // output_queue pubkey
        + 1; // bump u8
}
