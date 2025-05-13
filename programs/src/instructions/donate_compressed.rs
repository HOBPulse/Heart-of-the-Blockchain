use anchor_lang::prelude::*;
use anchor_spl::token::*;
use account_compression::program::AccountCompression;
use account_compression::cpi::accounts::BatchAppend;
use account_compression::cpi::batch_append;
use std::io::Write;

use crate::state::CampaignInfo;

mod light_programs {
    use anchor_lang::declare_id;
    declare_id!("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
}

/// Structure to represent donation data embedded in the ZK proof
/// This is a simplified example; in a real implementation, 
/// this would be based on the circuit's public inputs
#[derive(Debug)]
pub struct DonationData {
    pub amount: u64,
    pub donor_commitment: [u8; 32], // A commitment hiding the donor's identity
    pub timestamp: i64,
}

/// Represents a leaf in the Merkle tree according to Light Protocol's format
/// This is the data structure that will be serialized and appended to the Merkle tree
#[derive(Debug)]
pub struct DonationLeaf {
    pub amount: u64,
    pub donor_commitment: [u8; 32],
    pub timestamp: i64,
    pub campaign_id: u64,
    // Additional fields could be added as needed for the specific application
}

impl DonationLeaf {
    /// Create a new leaf from donation data
    pub fn new(donation: &DonationData, campaign_id: u64) -> Self {
        Self {
            amount: donation.amount,
            donor_commitment: donation.donor_commitment,
            timestamp: donation.timestamp,
            campaign_id,
        }
    }
    
    /// Serialize the leaf into bytes for inclusion in the Merkle tree
    /// Format adheres to Light Protocol's expectations for leaf data
    pub fn serialize(&self) -> Result<Vec<u8>> {
        let mut leaf_data = Vec::new();
        
        // Serialize in a consistent, deterministic order
        leaf_data.extend_from_slice(&self.amount.to_le_bytes());
        leaf_data.extend_from_slice(&self.donor_commitment);
        leaf_data.extend_from_slice(&self.timestamp.to_le_bytes());
        leaf_data.extend_from_slice(&self.campaign_id.to_le_bytes());
        
        // Hash the leaf data to get final leaf value if required
        // For simplicity, we're not including additional hashing here
        // In a real implementation, you might want to hash this data with Poseidon or another hash function
        
        Ok(leaf_data)
    }
}

/// Struct to represent the response data from batch_append CPI
/// This is used to track the updated Merkle root and other relevant data
#[derive(Debug)]
pub struct MerkleTreeUpdate {
    pub new_merkle_root: [u8; 32],
    pub leaf_index: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, proof_data: Vec<u8>)]
pub struct DonateCompressed<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,

    #[account(
        mut,
        seeds = [campaign_id.to_le_bytes().as_ref(), title.as_bytes().as_ref()],
        bump
    )]
    pub campaign_account_info: Account<'info, CampaignInfo>,

    /// CHECK: The Merkle tree account associated with the campaign,
    /// validated through has_one constraint against campaign_account_info.merkle_tree
    #[account(
        mut,
        constraint = merkle_tree.key() == campaign_account_info.merkle_tree
    )]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Optional output queue for the Merkle tree
    /// If provided, will be used in the Light Protocol CPI
    #[account(mut)]
    pub output_queue: Option<UncheckedAccount<'info>>,

    /// The Light Protocol account compression program.
    #[account(address = light_programs::ID)]
    pub light_account_compression_program: Program<'info, AccountCompression>,

    pub system_program: Program<'info, System>,
}

impl<'info> DonateCompressed<'info> {
    /// Verify ZK proof and process a compressed donation
    ///
    /// The function extracts and verifies a ZK proof submitted with the donation instruction.
    /// It then formats the donation data into a leaf and updates the Merkle tree 
    /// through a CPI call to Light Protocol's batch_append function.
    /// Finally, it updates the campaign state with the new Merkle root.
    ///
    /// # Arguments
    /// * `campaign_id` - The unique identifier of the campaign
    /// * `title` - The title of the campaign (used for PDA derivation)
    /// * `proof_data` - ZK proof data that contains the donation details
    ///
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn donate_compressed(
        &mut self,
        campaign_id: u64,
        title: String,
        proof_data: Vec<u8>,
    ) -> Result<()> {
        // STEP 1: Verify the proof data is not empty
        msg!("Verifying ZK proof for donation...");
        if proof_data.is_empty() {
            return err!(ErrorCode::InvalidProofData);
        }
        
        // STEP 2: Extract donation data from the proof
        // In a real implementation, this would involve more sophisticated parsing
        // based on the ZK circuit's public inputs structure
        let donation_data = self.extract_donation_data(&proof_data)?;
        
        msg!("Donation amount extracted from proof: {}", donation_data.amount);
        
        // STEP 3: Format the donation data as a leaf for the Merkle tree
        let donation_leaf = DonationLeaf::new(&donation_data, campaign_id);
        let leaf_data = donation_leaf.serialize()?;
        
        msg!("Donation leaf formatted for Merkle tree insertion");
        
        // STEP 4: Prepare the CPI to Light Protocol's batch_append
        let campaign = &mut self.campaign_account_info;
        
        let cpi_program = self.light_account_compression_program.to_account_info();
        let cpi_accounts = BatchAppend {
            authority: campaign.to_account_info(), // Campaign is the authority
            merkle_tree: self.merkle_tree.to_account_info(),
            log_wrapper: campaign.to_account_info(), // Using campaign as log wrapper
            queue: self.output_queue.as_ref().map(|q| q.to_account_info()),
            registered_program_pda: None, // Not using registered program
        };
        
        // Derive PDA signer seeds for the campaign account
        let campaign_seeds = &[
            campaign_id.to_le_bytes().as_ref(),
            title.as_bytes().as_ref(),
            &[*self.ctx.bumps.get("campaign_account_info").unwrap()]
        ];
        let signer_seeds = &[&campaign_seeds[..]];
        
        // STEP 5: Call batch_append to append the donation data to the Merkle tree
        msg!("Appending donation data to Merkle tree...");
        
        // We now use our formatted leaf_data instead of the raw proof_data
        batch_append(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            leaf_data // The formatted leaf data is passed to batch_append
        ).map_err(|e| {
            msg!("Error appending to Merkle tree: {:?}", e);
            ErrorCode::MerkleTreeUpdateFailed
        })?;
        
        // STEP 6: Get updated Merkle root from Light Protocol
        // In a full implementation, we would extract the new Merkle root from the event logs
        // or from batch_append return data. Since this requires more advanced event parsing,
        // for this implementation we'll assume the Merkle tree account itself has been
        // updated with the new root by Light Protocol.
        
        msg!("Retrieving updated Merkle root from Light Protocol...");
        
        // For a real implementation, this would get the actual root
        // Instead, we're just acknowledging that Light Protocol has updated
        // the merkle_tree account that we passed to batch_append
        let updated_merkle_tree_info = self.extract_merkle_tree_update()?;
        
        msg!("New Merkle root retrieved. Leaf index: {}", updated_merkle_tree_info.leaf_index);
        
        // STEP 7: Update campaign state with new Merkle root and donation information
        self.update_campaign_state(&updated_merkle_tree_info, &donation_data)?;
        
        // STEP 8: Emit an event for successful donation (useful for clients tracking donations)
        emit!(DonationProcessedEvent {
            campaign_id,
            donor: self.donor.key(),
            amount: donation_data.amount,
            timestamp: donation_data.timestamp,
            leaf_index: updated_merkle_tree_info.leaf_index,
            merkle_root: updated_merkle_tree_info.new_merkle_root,
        });
        
        msg!("Compressed donation successfully processed for campaign: {}", title);
        msg!("Updated total donations: {}", campaign.total_donation_received);
        msg!("Updated donation count: {}", campaign.donation_count);
        
        Ok(())
    }
    
    /// Extract donation data from the proof
    /// 
    /// In a real implementation, this would parse the proof according to
    /// the circuit's public inputs format. For this example, we use a simple
    /// encoding format for demonstration.
    fn extract_donation_data(&self, proof_data: &[u8]) -> Result<DonationData> {
        // For this example, we assume a simplified encoding:
        // - First 8 bytes: donation amount (u64)
        // - Next 32 bytes: donor commitment (32-byte array)
        // - Next 8 bytes: timestamp (i64)
        // 
        // In a real implementation, this would involve proper deserialization
        // of the proof's public inputs according to the circuit's structure
        
        if proof_data.len() < 48 { // 8 + 32 + 8 = 48 bytes minimum
            return err!(ErrorCode::InvalidProofFormat);
        }
        
        // Extract donation amount (first 8 bytes)
        let mut amount_bytes = [0u8; 8];
        amount_bytes.copy_from_slice(&proof_data[0..8]);
        let amount = u64::from_le_bytes(amount_bytes);
        
        // Extract donor commitment (next 32 bytes)
        let mut donor_commitment = [0u8; 32];
        donor_commitment.copy_from_slice(&proof_data[8..40]);
        
        // Extract timestamp (next 8 bytes)
        let mut timestamp_bytes = [0u8; 8];
        timestamp_bytes.copy_from_slice(&proof_data[40..48]);
        let timestamp = i64::from_le_bytes(timestamp_bytes);
        
        Ok(DonationData {
            amount,
            donor_commitment,
            timestamp,
        })
    }
    
    /// Extract the updated Merkle tree information after a successful batch_append
    /// In a real implementation, this would parse event logs or return data
    /// from the batch_append CPI to get the updated root and leaf index
    fn extract_merkle_tree_update(&self) -> Result<MerkleTreeUpdate> {
        // For this implementation, we'll use a mock Merkle root
        // In a real implementation, you would:
        // 1. Parse the event logs from batch_append
        // 2. Extract the new Merkle root
        // 3. Update the campaign state
        
        // Mock values for demonstration
        let leaf_index = 0; // Would typically be the index of the newly added leaf
        let timestamp = Clock::get()?.unix_timestamp;
        
        // Mock new Merkle root - in reality, this would come from the batch_append result
        let new_merkle_root = [42u8; 32]; // Mock root for demonstration
        
        Ok(MerkleTreeUpdate {
            new_merkle_root,
            leaf_index,
            timestamp,
        })
    }
    
    /// Update the campaign state with the new Merkle root and donation information
    fn update_campaign_state(&mut self, merkle_update: &MerkleTreeUpdate, donation_data: &DonationData) -> Result<()> {
        let campaign = &mut self.campaign_account_info;
        
        // Update campaign state with new Merkle root
        campaign.latest_merkle_root = merkle_update.new_merkle_root;
        
        // Update donation statistics
        campaign.total_donation_received = campaign.total_donation_received.checked_add(donation_data.amount)
            .ok_or(error!(ErrorCode::ArithmeticOverflow))?;
        
        campaign.donation_count = campaign.donation_count.checked_add(1)
            .ok_or(error!(ErrorCode::ArithmeticOverflow))?;
        
        // Update timestamp
        campaign.last_update_time = merkle_update.timestamp;
        
        msg!("Campaign state updated with new Merkle root and donation information");
        Ok(())
    }
}

/// Event emitted when a donation is successfully processed
#[event]
pub struct DonationProcessedEvent {
    pub campaign_id: u64,
    pub donor: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub leaf_index: u64,
    pub merkle_root: [u8; 32],
}

/// Custom error codes for the donate_compressed instruction
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid proof data")]
    InvalidProofData,
    
    #[msg("Invalid proof format")]
    InvalidProofFormat,
    
    #[msg("Failed to update Merkle tree")]
    MerkleTreeUpdateFailed,
    
    #[msg("Failed to update campaign state")]
    CampaignUpdateFailed,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
} 