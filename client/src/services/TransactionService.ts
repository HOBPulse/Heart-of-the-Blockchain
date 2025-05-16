import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  sendAndConfirmTransaction,
  SendOptions,
  Signer,
  ConfirmOptions,
  Commitment
} from '@solana/web3.js';
import { LightProtocolService } from './LightProtocolService';
import { MerkleProofService, MerkleProof } from './MerkleProofService';
import BN from 'bn.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
// @ts-ignore: Anchor types may not be present in node_modules
import { Program, AnchorProvider, Idl, Wallet } from '@coral-xyz/anchor';
// @ts-ignore: JSON import for Anchor IDL
import idl from '../../idl/zk_donations.json';

/**
 * Status of a transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

/**
 * Options for transaction submission
 */
export interface TransactionOptions {
  /** Confirmation strategy */
  confirmOptions?: ConfirmOptions;
  /** Send options */
  sendOptions?: SendOptions;
  /** Skip preflight checks */
  skipPreflight?: boolean;
  /** Max retries for transaction */
  maxRetries?: number;
}

/**
 * Result of a transaction submission
 */
export interface TransactionResult {
  /** Transaction signature */
  signature: string;
  /** Transaction status */
  status: TransactionStatus;
  /** Error if transaction failed */
  error?: Error;
  /** Confirmation details */
  confirmationDetails?: any;
}

const PROGRAM_ID = new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq');
const CAMPAIGN_SEED = Buffer.from('campaign');

/**
 * Service for building and sending transactions with proofs
 */
export class TransactionService {
  private program: Program;
  private lightService: any;
  private merkleService: any;
  private pendingTransactions: Map<string, TransactionStatus> = new Map();
  
  /**
   * Create a new TransactionService
   * 
   * @param connection The Solana connection
   * @param wallet The wallet for signing transactions
   * @param lightService The LightProtocolService instance (optional, will create if not provided)
   * @param merkleService The MerkleProofService instance (optional, will create if not provided)
   */
  constructor(
    connection: Connection,
    wallet: Wallet,
    lightService?: any,
    merkleService?: any
  ) {
    this.lightService = lightService;
    this.merkleService = merkleService;
    // Ensure wallet implements the required interface for AnchorProvider
    const provider = new AnchorProvider(connection, wallet as any, {});
    this.program = new Program(idl as Idl, PROGRAM_ID, provider);
    
    console.log('TransactionService initialized');
  }
  
  /**
   * Deriva la PDA de campaign según el IDL (seeds: ['campaign', user, campaign_id])
   */
  static async deriveCampaignPDA(user: PublicKey, campaignId: number): Promise<[PublicKey, number]> {
    // Serializa campaignId como Buffer de 8 bytes little-endian
    const campaignIdBuf = Buffer.alloc(8);
    new BN(campaignId).toArray('le', 8).forEach((b, i) => campaignIdBuf[i] = b);
    return await PublicKey.findProgramAddress(
      [
        CAMPAIGN_SEED,
        user.toBuffer(),
        campaignIdBuf
      ],
      PROGRAM_ID
    );
  }
  
  /**
   * Serializa los parámetros de la campaña para paramsBytes (placeholder, adapta según tu layout real)
   */
  static serializeCampaignParams(params: Record<string, any>): Buffer {
    // TODO: Serializa según el layout real esperado por el programa (ejemplo: Borsh, Buffer, etc)
    // Aquí solo serializa como JSON para ejemplo
    return Buffer.from(JSON.stringify(params));
  }
  
  /**
   * Serializa leafData (placeholder, adapta según tu layout real)
   */
  static serializeLeafData(data: Record<string, any>): Buffer {
    // TODO: Serializa según el layout real esperado por el programa
    return Buffer.from(JSON.stringify(data));
  }
  
  /**
   * Serializa proofData (placeholder, adapta según tu layout real)
   */
  static serializeProofData(data: Record<string, any>): Buffer {
    // TODO: Serializa según el layout real esperado por el programa
    return Buffer.from(JSON.stringify(data));
  }
  
  /**
   * Build a transaction that includes a proof
   * 
   * @param proof The Merkle proof to include
   * @param recipient Recipient address
   * @param amount Amount to transfer
   * @returns The built transaction
   */
  async buildTransactionWithProof(
    proof: MerkleProof,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction> {
    console.log('Building transaction with proof for:', recipient.toString());
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // In a real implementation, this would use the Light Protocol SDK
    // to build instructions that include the proof
    const instructions = await this.createProofInstructions(proof, recipient, amount);
    
    // Add instructions to transaction
    transaction.add(...instructions);
    
    return transaction;
  }
  
  /**
   * Send a transaction with a proof
   * 
   * @param transaction The transaction to send
   * @param signers Signers for the transaction
   * @param options Transaction options
   * @returns Transaction result
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Signer[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const connection = this.lightService.getConnection();
    const defaultOptions = {
      confirmOptions: { commitment: 'confirmed' as Commitment },
      skipPreflight: false,
      maxRetries: 3
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    console.log('Sending transaction...');
    
    let currentRetry = 0;
    let lastError: Error | undefined;
    
    while (currentRetry <= mergedOptions.maxRetries) {
      try {
        // Send and confirm transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          signers,
          mergedOptions.confirmOptions
        );
        
        console.log('Transaction confirmed:', signature);
        
        // Update transaction status
        this.pendingTransactions.set(signature, TransactionStatus.CONFIRMED);
        
        return {
          signature,
          status: TransactionStatus.CONFIRMED
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Transaction attempt ${currentRetry + 1}/${mergedOptions.maxRetries + 1} failed:`, error);
        
        currentRetry++;
        
        // Wait before retrying
        if (currentRetry <= mergedOptions.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
        }
      }
    }
    
    // If we get here, all retries failed
    const errorResult: TransactionResult = {
      signature: 'failed',
      status: TransactionStatus.FAILED,
      error: lastError
    };
    
    return errorResult;
  }
  
  /**
   * Generate a proof and build a transaction in one step
   * 
   * @param treeId Merkle tree ID
   * @param leafIndex Leaf index to prove
   * @param leafData Leaf data
   * @param recipient Recipient address
   * @param amount Amount to transfer
   * @returns Built transaction with proof
   */
  async generateProofAndBuildTransaction(
    treeId: string,
    leafIndex: number,
    leafData: string,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction> {
    console.log(`Generating proof for leaf ${leafIndex} in tree ${treeId} and building transaction`);
    
    // Generate the proof
    const proof = await this.merkleService.generateProof(treeId, leafIndex, leafData);
    
    // Build transaction with the proof
    return this.buildTransactionWithProof(proof, recipient, amount);
  }
  
  /**
   * Get the status of a pending transaction
   * 
   * @param signature Transaction signature
   * @returns Transaction status or null if not found
   */
  getPendingTransactionStatus(signature: string): TransactionStatus | null {
    return this.pendingTransactions.has(signature) ?
      this.pendingTransactions.get(signature)! :
      null;
  }
  
  /**
   * Check if a transaction is confirmed
   * 
   * @param signature Transaction signature
   * @returns True if confirmed
   */
  async isTransactionConfirmed(signature: string): Promise<boolean> {
    // First check our internal tracking
    if (this.pendingTransactions.get(signature) === TransactionStatus.CONFIRMED) {
      return true;
    }
    
    // If not in our tracking or not confirmed, check on-chain
    try {
      const connection = this.lightService.getConnection();
      const status = await connection.getSignatureStatus(signature);
      
      if (status && status.value && status.value.confirmationStatus === 'confirmed') {
        // Update our tracking
        this.pendingTransactions.set(signature, TransactionStatus.CONFIRMED);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return false;
    }
  }
  
  /**
   * Wait for a transaction to be confirmed
   * 
   * @param signature Transaction signature
   * @param timeout Timeout in milliseconds
   * @returns Transaction result
   */
  async waitForConfirmation(
    signature: string,
    timeout = 30000
  ): Promise<TransactionResult> {
    console.log(`Waiting for transaction ${signature} to be confirmed (timeout: ${timeout}ms)`);
    
    const connection = this.lightService.getConnection();
    
    try {
      const startTime = Date.now();
      let confirmed = false;
      
      while (!confirmed && Date.now() - startTime < timeout) {
        const status = await connection.getSignatureStatus(signature);
        
        if (status && status.value && status.value.confirmationStatus === 'confirmed') {
          confirmed = true;
          this.pendingTransactions.set(signature, TransactionStatus.CONFIRMED);
          break;
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (confirmed) {
        return {
          signature,
          status: TransactionStatus.CONFIRMED
        };
      } else {
        return {
          signature,
          status: TransactionStatus.PENDING,
          error: new Error('Transaction confirmation timeout')
        };
      }
    } catch (error) {
      console.error('Error waiting for transaction confirmation:', error);
      
      return {
        signature,
        status: TransactionStatus.FAILED,
        error: error as Error
      };
    }
  }
  
  /**
   * Create instructions for a transaction with a proof
   * 
   * @param proof The Merkle proof
   * @param recipient Recipient address
   * @param amount Amount to transfer
   * @returns Array of instructions
   */
  private async createProofInstructions(
    proof: MerkleProof,
    recipient: PublicKey,
    amount: number
  ): Promise<TransactionInstruction[]> {
    // In a real implementation, this would use the Light Protocol SDK
    // to create instructions that include the proof data
    
    // For now, we'll create a mock instruction
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: recipient, isSigner: false, isWritable: true }
        ],
        programId: new PublicKey('9FHnJ6S5P1UoWtyd6iqXYESy4WEGvGArA5W17f6H1gQk'),
        data: Buffer.from([
          // Mock instruction data that would include proof
          0, 1, 2, 3, // Instruction code
          ...Buffer.from(proof.root), // Root
          ...Buffer.from(proof.leaf), // Leaf
          ...Buffer.from(amount.toString()) // Amount
        ])
      })
    ];
  }

  /**
   * Inicializa una campaña usando Anchor y el IDL
   * Deriva la PDA automáticamente y serializa paramsBytes
   */
  async createCampaign(params: {
    user: PublicKey,
    merkleTree: PublicKey,
    outputQueue: PublicKey,
    lightAccountCompressionProgram: PublicKey,
    systemProgram: PublicKey,
    campaignId: number,
    title: string,
    description: string,
    campaignParams: Record<string, any>
  }): Promise<string> {
    const [campaignPDA] = await TransactionService.deriveCampaignPDA(params.user, params.campaignId);
    const paramsBytes = TransactionService.serializeCampaignParams(params.campaignParams);
    return await this.program.methods
      .initializeCampaign(
        new BN(params.campaignId),
        params.title,
        params.description,
        Array.from(paramsBytes)
      )
      .accounts({
        user: params.user,
        campaign: campaignPDA,
        merkleTree: params.merkleTree,
        outputQueue: params.outputQueue,
        lightAccountCompressionProgram: params.lightAccountCompressionProgram,
        systemProgram: params.systemProgram
      })
      .rpc();
  }

  /**
   * Donación comprimida con ZK proof usando Anchor
   * Serializa leafData y proofData automáticamente
   */
  async donateCompressed(params: {
    userDonator: PublicKey,
    campaign: PublicKey,
    merkleTree: PublicKey,
    outputQueue: PublicKey,
    lightAccountCompressionProgram: PublicKey,
    campaignId: number,
    leafData: Record<string, any>,
    proofData: Record<string, any>
  }): Promise<string> {
    const leafDataBuf = TransactionService.serializeLeafData(params.leafData);
    const proofDataBuf = TransactionService.serializeProofData(params.proofData);
    return await this.program.methods
      .donateCompressedAmount(
        new BN(params.campaignId),
        Array.from(leafDataBuf),
        Array.from(proofDataBuf)
      )
      .accounts({
        userDonator: params.userDonator,
        campaign: params.campaign,
        merkleTree: params.merkleTree,
        outputQueue: params.outputQueue,
        lightAccountCompressionProgram: params.lightAccountCompressionProgram
      })
      .rpc();
  }

  /**
   * Retiro de fondos de campaña
   * @param params Parámetros del retiro
   * @returns Transacción lista para firmar
   */
  async withdraw(params: {
    creator: PublicKey,
    mint: PublicKey,
    campaignId: number,
    title: string,
    withdrawAmount: number,
    campaignAccountInfo: PublicKey,
    creatorTokenAccount: PublicKey,
    campaignTokenAccount: PublicKey,
    tokenProgram: PublicKey,
    systemProgram: PublicKey,
    associatedTokenProgram: PublicKey,
  }): Promise<Transaction> {
    // Derivar PDA de campaign_account_info
    // ...
    // Construir instrucción Anchor (usando layout real)
    // ...
    const ix = new TransactionInstruction({
      keys: [
        { pubkey: params.creator, isSigner: true, isWritable: true },
        { pubkey: params.mint, isSigner: false, isWritable: false },
        { pubkey: params.campaignAccountInfo, isSigner: false, isWritable: true },
        { pubkey: params.creatorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: params.campaignTokenAccount, isSigner: false, isWritable: true },
        { pubkey: params.tokenProgram, isSigner: false, isWritable: false },
        { pubkey: params.systemProgram, isSigner: false, isWritable: false },
        { pubkey: params.associatedTokenProgram, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey('9FHnJ6S5P1UoWtyd6iqXYESy4WEGvGArA5W17f6H1gQk'),
      data: Buffer.alloc(0) // TODO: serializar datos reales según Anchor IDL
    });
    const tx = new Transaction().add(ix);
    return tx;
  }
} 