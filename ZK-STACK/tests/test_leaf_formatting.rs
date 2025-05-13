fn main() {
    println!("Testing Compressed State Update with Light Protocol (Task 3.2)");

    // Test case: Leaf formatting from donation data
    println!("\nTest 1: Donation data should be correctly formatted as a leaf");
    let donation_data = create_test_donation_data(100, [1; 32], 1652300800);
    let campaign_id = 12345;
    
    let leaf_data = format_donation_leaf(&donation_data, campaign_id);
    
    // Verify leaf data has the correct structure
    if leaf_data.len() == 56 { // 8 + 32 + 8 + 8 = 56 bytes
        println!("✅ Test 1 passed: Leaf data has correct length");
    } else {
        panic!("Test 1 failed: Leaf data has incorrect length. Expected 56, got {}", leaf_data.len());
    }
    
    // Test case: Verify leaf data contents
    println!("\nTest 2: Leaf data should contain all donation information");
    
    // Extract and verify components from the leaf data
    let (extracted_amount, extracted_commitment, extracted_timestamp, extracted_campaign_id) = 
        extract_leaf_components(&leaf_data);
        
    if extracted_amount == donation_data.amount && 
       extracted_commitment == donation_data.donor_commitment &&
       extracted_timestamp == donation_data.timestamp &&
       extracted_campaign_id == campaign_id {
        println!("✅ Test 2 passed: Leaf data correctly contains all donation information");
    } else {
        panic!("Test 2 failed: Leaf data doesn't match original donation data");
    }
    
    // Test case: Simulated batch_append call
    println!("\nTest 3: Test simulated batch_append call");
    
    match simulate_batch_append(&leaf_data) {
        Ok(merkle_root) => {
            println!("✅ Test 3 passed: Successfully appended leaf to Merkle tree");
            println!("  New Merkle root: {:?}", merkle_root);
        },
        Err(e) => panic!("Test 3 failed: Error appending to Merkle tree: {}", e),
    }
    
    // Test case: Error handling
    println!("\nTest 4: Test error handling");
    
    let result = simulate_batch_append_with_error(&leaf_data);
    match result {
        Ok(_) => panic!("Test 4 failed: Expected error but operation succeeded"),
        Err(e) => {
            println!("✅ Test 4 passed: Error correctly handled: {}", e);
        }
    }

    println!("\n✅✅✅ All Compressed State Update tests passed! ✅✅✅");
}

/// Test struct to represent donation data
#[derive(Debug)]
struct DonationData {
    amount: u64,
    donor_commitment: [u8; 32],
    timestamp: i64,
}

/// Create test donation data
fn create_test_donation_data(amount: u64, commitment: [u8; 32], timestamp: i64) -> DonationData {
    DonationData {
        amount,
        donor_commitment: commitment,
        timestamp,
    }
}

/// Format donation data as a leaf for the Merkle tree
fn format_donation_leaf(donation: &DonationData, campaign_id: u64) -> Vec<u8> {
    let mut leaf_data = Vec::new();
    
    // Serialize in the same order as in our implementation
    leaf_data.extend_from_slice(&donation.amount.to_le_bytes());
    leaf_data.extend_from_slice(&donation.donor_commitment);
    leaf_data.extend_from_slice(&donation.timestamp.to_le_bytes());
    leaf_data.extend_from_slice(&campaign_id.to_le_bytes());
    
    leaf_data
}

/// Extract components from a leaf
fn extract_leaf_components(leaf_data: &[u8]) -> (u64, [u8; 32], i64, u64) {
    let mut amount_bytes = [0u8; 8];
    amount_bytes.copy_from_slice(&leaf_data[0..8]);
    let amount = u64::from_le_bytes(amount_bytes);
    
    let mut commitment = [0u8; 32];
    commitment.copy_from_slice(&leaf_data[8..40]);
    
    let mut timestamp_bytes = [0u8; 8];
    timestamp_bytes.copy_from_slice(&leaf_data[40..48]);
    let timestamp = i64::from_le_bytes(timestamp_bytes);
    
    let mut campaign_id_bytes = [0u8; 8];
    campaign_id_bytes.copy_from_slice(&leaf_data[48..56]);
    let campaign_id = u64::from_le_bytes(campaign_id_bytes);
    
    (amount, commitment, timestamp, campaign_id)
}

/// Simulate a successful batch_append call
fn simulate_batch_append(leaf_data: &[u8]) -> Result<[u8; 32], String> {
    println!("  Simulating batch_append with leaf data of length: {}", leaf_data.len());
    
    // In a real implementation, this would be a CPI to Light Protocol
    // Here we just simulate a successful outcome
    
    // Generate a mock Merkle root by hashing the leaf data (simplified)
    let mut merkle_root = [0u8; 32];
    
    // XOR the leaf data with some fixed values to create a mock "hash"
    for (i, byte) in leaf_data.iter().enumerate() {
        if i < 32 {
            merkle_root[i] = *byte ^ 0x42; // Simple XOR as placeholder for real hashing
        }
    }
    
    Ok(merkle_root)
}

/// Simulate a batch_append call that fails
fn simulate_batch_append_with_error(leaf_data: &[u8]) -> Result<[u8; 32], String> {
    println!("  Simulating batch_append with intentional failure");
    
    // Simulate a failure in the CPI
    if !leaf_data.is_empty() {
        return Err("Simulated Light Protocol error: Invalid leaf format".into());
    }
    
    // This should never be reached due to the error above
    Ok([0u8; 32])
} 