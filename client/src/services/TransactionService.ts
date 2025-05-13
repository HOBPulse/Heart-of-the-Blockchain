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

/**
 * Service for building and sending transactions with proofs
 */
export class TransactionService {
  private lightService: LightProtocolService;
  private merkleService: MerkleProofService;
  private pendingTransactions: Map<string, TransactionStatus> = new Map();
  
  /**
   * Create a new TransactionService
   * 
   * @param lightService The LightProtocolService instance
   * @param merkleService The MerkleProofService instance (optional, will create if not provided)
   */
  constructor(
    lightService: LightProtocolService,
    merkleService?: MerkleProofService
  ) {
    this.lightService = lightService;
    this.merkleService = merkleService || new MerkleProofService(lightService);
    
    console.log('TransactionService initialized');
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
} 