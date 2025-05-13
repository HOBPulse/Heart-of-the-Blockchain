import { Keypair } from '@solana/web3.js';
import { LightProtocolService } from '../services/LightProtocolService';
import { Wallet } from '@coral-xyz/anchor';

async function main() {
  try {
    console.log('Starting Light Protocol SDK example...');
    
    // Create service with default or custom configuration
    const service = new LightProtocolService({
      // For testnet use: 'https://api.testnet.solana.com'
      rpcUrl: 'http://localhost:8899', 
      commitment: 'confirmed'
    });
    
    // Test connection
    console.log('Testing connection...');
    const connectionResult = await service.testConnection();
    
    if (!connectionResult) {
      console.error('Connection test failed. Please check your RPC URL and try again.');
      return;
    }
    
    // Create a keypair (in a real app, this would likely be loaded from a wallet)
    const keypair = Keypair.generate();
    console.log('Generated keypair:', keypair.publicKey.toString());
    
    // Initialize program with wallet
    try {
      // Create a wallet that implements the Wallet interface
      const wallet = {
        publicKey: keypair.publicKey,
        signTransaction: () => Promise.resolve(null as any),
        signAllTransactions: () => Promise.resolve([]),
        payer: keypair,
      } as Wallet;
      
      await service.initializeProgram(wallet);
      console.log('Program initialized successfully');
    } catch (e) {
      console.warn('Program initialization failed (this is expected if IDL is not available):', e);
    }
    
    // Test compression (this is a basic example from Light Protocol)
    try {
      // Note: This will fail unless the keypair has SOL
      await service.testCompression(
        keypair,
        1e9, // 1 SOL in lamports
        keypair.publicKey
      );
    } catch (e) {
      console.warn('Compression test failed (expected if keypair has no SOL):', e);
    }
    
    console.log('Example completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the example
main().catch(console.error); 