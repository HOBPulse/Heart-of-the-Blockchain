import { Keypair } from '@solana/web3.js';
import { LightProtocolService } from '../services/LightProtocolService';
import { MerkleProofService } from '../services/MerkleProofService';
import { TransactionService, TransactionStatus } from '../services/TransactionService';
import { Wallet } from '@coral-xyz/anchor';

async function main() {
  try {
    console.log('Starting Transaction with Proof Example...');
    
    // Initialize services
    const lightService = new LightProtocolService({
      // For testnet use: 'https://api.testnet.solana.com'
      rpcUrl: 'http://localhost:8899',
      commitment: 'confirmed'
    });
    
    // Test connection
    console.log('Testing connection...');
    const connectionResult = await lightService.testConnection();
    
    if (!connectionResult) {
      console.error('Connection test failed. Please check your RPC URL and try again.');
      return;
    }
    
    // Create keypairs (in a real app, these would be loaded from a wallet)
    const sender = Keypair.generate();
    const recipient = Keypair.generate();
    
    console.log('Generated sender keypair:', sender.publicKey.toString());
    console.log('Generated recipient keypair:', recipient.publicKey.toString());
    
    // Create wallet for initialization
    const wallet = {
      publicKey: sender.publicKey,
      signTransaction: () => Promise.resolve(null as any),
      signAllTransactions: () => Promise.resolve([]),
      payer: sender,
    } as Wallet;
    
    // Initialize program
    try {
      await lightService.initializeProgram(wallet);
      console.log('Program initialized successfully');
    } catch (e) {
      console.warn('Program initialization failed (this is expected if IDL is not available):', e);
    }
    
    // Initialize Merkle and Transaction services
    const merkleService = new MerkleProofService(lightService);
    const transactionService = new TransactionService(lightService, merkleService);
    
    console.log('Services initialized');
    
    // Example: Generate proof and build transaction
    console.log('\nGenerating proof and building transaction...');
    
    const treeId = 'example-tree';
    const leafIndex = 5;
    const leafData = 'transfer-data';
    const amount = 1_000_000; // 1 SOL in lamports
    
    try {
      // First, let's fetch the Merkle tree state (for demonstration)
      console.log(`Fetching Merkle tree state for "${treeId}"...`);
      const state = await merkleService.fetchMerkleState(treeId);
      
      console.log('Merkle tree state:', {
        root: state.root.substring(0, 10) + '...',
        height: state.height,
        leaves: state.leaves.length
      });
      
      // Generate a proof directly (for demonstration)
      console.log('\nGenerating proof for leaf...');
      const proof = await merkleService.generateProof(treeId, leafIndex, leafData);
      
      console.log('Proof generated:', {
        leafIndex: proof.leafIndex,
        siblings: proof.siblings.length
      });
      
      // Build a transaction with the proof
      console.log('\nBuilding transaction with proof...');
      const transaction = await transactionService.buildTransactionWithProof(
        proof,
        recipient.publicKey,
        amount
      );
      
      console.log('Transaction built with:', {
        instructions: transaction.instructions.length,
        recentBlockhash: transaction.recentBlockhash || 'not set'
      });
      
      // Alternatively, generate proof and build transaction in one step
      console.log('\nGenerating proof and building transaction in one step...');
      const combinedTransaction = await transactionService.generateProofAndBuildTransaction(
        treeId,
        leafIndex,
        leafData,
        recipient.publicKey,
        amount
      );
      
      console.log('Transaction built with:', {
        instructions: combinedTransaction.instructions.length,
        recentBlockhash: combinedTransaction.recentBlockhash || 'not set'
      });
      
      // Send transaction (this will fail in this example since we're using mock data)
      console.log('\nAttempting to send transaction (will fail in this example)...');
      try {
        // In a real app, we would need to sign and get a recent blockhash
        const result = await transactionService.sendTransaction(
          combinedTransaction,
          [sender], // Signers
          {
            maxRetries: 2,
            confirmOptions: { commitment: 'confirmed' }
          }
        );
        
        if (result.status === TransactionStatus.CONFIRMED) {
          console.log('✅ Transaction confirmed! Signature:', result.signature);
          
          // Wait for confirmation 
          await transactionService.waitForConfirmation(result.signature);
        } else {
          console.error('❌ Transaction failed:', result.error?.message);
        }
      } catch (e) {
        console.error('Expected error when sending transaction with mock data:', e);
      }
      
      // Example of transaction status tracking
      console.log('\nExample of transaction status tracking...');
      const mockSignature = 'mock-signature-' + Date.now();
      
      // Check status (will be null since it's a mock)
      const status = transactionService.getPendingTransactionStatus(mockSignature);
      console.log('Status for mock signature:', status || 'Not tracked');
      
      // Check confirmation (will be false since it's a mock)
      const isConfirmed = await transactionService.isTransactionConfirmed(mockSignature);
      console.log('Is mock transaction confirmed?', isConfirmed);
      
    } catch (error) {
      console.error('Error in transaction operations:', error);
    }
    
    console.log('\nExample completed!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the example
main().catch(console.error); 