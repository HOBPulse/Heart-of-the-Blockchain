import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Rpc, createRpc } from '@lightprotocol/stateless.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration options for LightProtocolService
 */
export interface LightProtocolConfig {
  /** Solana RPC endpoint URL */
  rpcUrl?: string;
  /** Compression RPC endpoint URL */
  compressionRpcUrl?: string;
  /** Prover endpoint URL */
  proverUrl?: string;
  /** Commitment level for confirmations */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** Program ID for the Heart of Blockchain program */
  programId?: string;
  /** Path to IDL file if required */
  idlPath?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<LightProtocolConfig> = {
  rpcUrl: 'http://localhost:8899', // Default to local Solana node
  compressionRpcUrl: 'http://localhost:8784',
  proverUrl: 'http://localhost:3001',
  commitment: 'confirmed',
  programId: '9FHnJ6S5P1UoWtyd6iqXYESy4WEGvGArA5W17f6H1gQk', // Heart of Blockchain program ID
  idlPath: '../target/idl/heart_of_blockchain.json'
};

/**
 * Service class to manage Light Protocol SDK operations
 */
export class LightProtocolService {
  private rpc: Rpc;
  private connection: Connection;
  private config: Required<LightProtocolConfig>;

  /**
   * Create a new LightProtocolService instance
   *
   * @param config Configuration options
   */
  constructor(config: LightProtocolConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Solana connection
    this.connection = new Connection(
      this.config.rpcUrl,
      this.config.commitment
    );

    // Initialize Light Protocol RPC connection
    this.rpc = createRpc(
      this.config.rpcUrl,
      this.config.compressionRpcUrl,
      this.config.proverUrl
    );

    console.log('LightProtocolService initialized with config:', {
      rpcUrl: this.config.rpcUrl,
      compressionRpcUrl: this.config.compressionRpcUrl,
      proverUrl: this.config.proverUrl,
      commitment: this.config.commitment,
      programId: this.config.programId
    });
  }

  /**
   * Initialize a connection to the Heart of Blockchain program
   *
   * @param wallet Wallet instance for transaction signing
   * @returns The AnchorProvider instance
   */
  async initializeProgram(wallet: Wallet): Promise<AnchorProvider> {
    try {
      // Set up provider
      const provider = new AnchorProvider(
        this.connection,
        wallet,
        { commitment: this.config.commitment }
      );
      // Optionally, load program IDL if needed for Anchor workflows
      const idlPath = path.resolve(this.config.idlPath);
      if (!fs.existsSync(idlPath)) {
        throw new Error(`IDL file not found at ${idlPath}`);
      }
      // IDL loading is left for downstream consumers if needed
      console.log('AnchorProvider initialized successfully');
      return provider;
    } catch (error) {
      console.error('Failed to initialize AnchorProvider:', error);
      throw error;
    }
  }

  /**
   * Test the connection to the Light Protocol and Solana
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test basic connection to Solana
      const version = await this.connection.getVersion();
      console.log('Connected to Solana:', version);
      // Test Light Protocol RPC
      const slot = await this.rpc.getSlot();
      console.log('Light Protocol RPC connected. Current slot:', slot);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the Light Protocol RPC connection
   */
  getRpc(): Rpc {
    return this.rpc;
  }

  /**
   * Get the Solana connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  // TODO: Add compressTokens and other Light Protocol methods as needed, using the correct SDK APIs.
} 