import { Keypair } from '@solana/web3.js';
import { LightProtocolService } from '../services/LightProtocolService';
import { MerkleProofService } from '../services/MerkleProofService';
import { Wallet } from '@coral-xyz/anchor';

async function main() {
  try {
    console.log('Starting Merkle Proof SDK example...');
    
    // Initialize Light Protocol service
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
    
    // Create a keypair (in a real app, this would likely be loaded from a wallet)
    const keypair = Keypair.generate();
    console.log('Generated keypair:', keypair.publicKey.toString());
    
    // Create wallet for initialization
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: () => Promise.resolve(null as any),
      signAllTransactions: () => Promise.resolve([]),
      payer: keypair,
    } as Wallet;
    
    // Initialize program
    try {
      await lightService.initializeProgram(wallet);
      console.log('Program initialized successfully');
    } catch (e) {
      console.warn('Program initialization failed (this is expected if IDL is not available):', e);
    }
    
    // Initialize the Merkle Proof Service
    const merkleService = new MerkleProofService(lightService, {
      maxRetries: 3,
      useCache: true
    });
    
    console.log('Merkle Proof Service initialized');
    
    // Example: Fetch Merkle Tree State
    const treeId = 'example-tree';
    console.log(`\nFetching Merkle tree state for "${treeId}"...`);
    
    try {
      const state = await merkleService.fetchMerkleState(treeId);
      console.log('Merkle tree state:', {
        treeId: state.treeId,
        root: state.root,
        height: state.height,
        nodeCount: state.nodeCount,
        leaves: state.leaves.length
      });
    } catch (error) {
      console.error('Failed to fetch Merkle state:', error);
    }
    
    // Example: Generate Merkle Proof
    console.log('\nGenerating Merkle proof...');
    
    try {
      const leafIndex = 3;
      const leafData = 'example-data';
      
      const proof = await merkleService.generateProof(treeId, leafIndex, leafData);
      
      console.log('Generated proof:', {
        leafIndex: proof.leafIndex,
        leaf: proof.leaf,
        root: proof.root,
        siblings: proof.siblings.length
      });
      
      // Verify the generated proof
      console.log('\nVerifying the proof...');
      const isValid = await merkleService.verifyProof(proof);
      
      if (isValid) {
        console.log('✅ Proof is valid!');
      } else {
        console.error('❌ Proof is invalid!');
      }
      
      // Calculate root from proof
      console.log('\nCalculating root from proof...');
      const calculatedRoot = merkleService.calculateRootFromProof(proof.leaf, proof.siblings);
      console.log('Calculated root:', calculatedRoot);
      
      // Test caching
      console.log('\nTesting cache functionality...');
      
      console.log('Fetching same state again (should use cache)...');
      const cachedState = await merkleService.fetchMerkleState(treeId);
      
      console.log('Generating same proof again (should use cache)...');
      const cachedProof = await merkleService.generateProof(treeId, leafIndex, leafData);
      
      console.log('Forcing refresh of data...');
      const freshState = await merkleService.fetchMerkleState(treeId, true);
      
      console.log('Clearing caches...');
      merkleService.clearCache();
      
    } catch (error) {
      console.error('Error in proof operations:', error);
    }
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the example
main().catch(console.error); 