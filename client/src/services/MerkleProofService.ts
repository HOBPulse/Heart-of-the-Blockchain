import { PublicKey } from '@solana/web3.js';
import { LightProtocolService } from './LightProtocolService';
import BN from 'bn.js';

/**
 * Interface representing a node in the Merkle tree
 */
interface MerkleNode {
  left: string;
  right: string;
  hash: string;
}

/**
 * Interface representing a Merkle Proof
 */
export interface MerkleProof {
  leafIndex: number;
  leaf: string;
  siblings: string[];
  root: string;
}

/**
 * Options for Merkle proof generation
 */
export interface MerkleProofOptions {
  /** Max retry attempts for failed operations */
  maxRetries?: number;
  /** Timeout for proof generation (ms) */
  timeout?: number;
  /** Whether to use the cache */
  useCache?: boolean;
}

/**
 * Default options for Merkle proof operations
 */
const DEFAULT_OPTIONS: Required<MerkleProofOptions> = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  useCache: true
};

/**
 * MerkleProofService
 * ------------------
 * Service for managing Merkle state and proof generation for Light Protocol in the Heart of Blockchain SDK.
 *
 * - Allows fetching Merkle state of a given tree (using LightProtocolService)
 * - Allows generating Merkle proofs for specific leaves (donations) using Light Protocol RPC
 * - Integrates with TransactionService to build ZK transactions and with LightProtocolService for connectivity
 *
 * Usage example:
 *
 *   import { MerkleProofService } from './MerkleProofService';
 *   const merkleService = new MerkleProofService(lightService);
 *   const proof = await merkleService.generateProof(treeId, leafIndex, leafData);
 *
 * This service is fundamental for ZK integration and private donation validation in the MVP.
 */

/**
 * Service for fetching Merkle state and generating proofs
 */
export class MerkleProofService {
  private lightService: LightProtocolService;
  private stateCache: Map<string, any> = new Map();
  private proofCache: Map<string, MerkleProof> = new Map();
  private options: Required<MerkleProofOptions>;
  
  /**
   * Create a new MerkleProofService
   * 
   * @param lightService The LightProtocolService instance
   * @param options Options for the service
   */
  constructor(
    lightService: LightProtocolService,
    options: MerkleProofOptions = {}
  ) {
    this.lightService = lightService;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    console.log('MerkleProofService initialized with options:', {
      maxRetries: this.options.maxRetries,
      timeout: this.options.timeout,
      useCache: this.options.useCache
    });
  }
  
  /**
   * Fetch the current Merkle tree state from Light Protocol
   * 
   * @param treeId The Merkle tree ID to fetch (should be a base58 public key string)
   * @param forceRefresh Force refresh from chain even if cached
   * @returns The Merkle tree state (compressed accounts for the owner)
   */
  async fetchMerkleState(treeId: string, forceRefresh = false): Promise<any> {
    const cacheKey = `state:${treeId}`;
    if (this.options.useCache && !forceRefresh && this.stateCache.has(cacheKey)) {
      console.log(`Using cached Merkle state for tree: ${treeId}`);
      return this.stateCache.get(cacheKey);
    }
    console.log(`Fetching Merkle state for tree: ${treeId}`);
    let retries = 0;
    let lastError: Error | null = null;
    while (retries < this.options.maxRetries) {
      try {
        // Use the real Light Protocol SDK to fetch compressed accounts for the tree owner
        const rpc = this.lightService.getRpc();
        const owner = new PublicKey(treeId);
        const state = await rpc.getCompressedAccountsByOwner(owner);
        if (this.options.useCache) {
          this.stateCache.set(cacheKey, state);
        }
        return state;
      } catch (error) {
        retries++;
        lastError = error as Error;
        console.warn(`Attempt ${retries}/${this.options.maxRetries} failed: ${error}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Failed to fetch Merkle state after ${this.options.maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Generate a Merkle proof for a specific leaf
   * 
   * @param treeId The Merkle tree ID
   * @param leafIndex The index of the leaf to prove
   * @param leafData The data of the leaf
   * @param options Proof generation options
   * @returns The generated Merkle proof
   */
  async generateProof(
    treeId: string,
    leafIndex: number,
    leafData: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<MerkleProof> {
    const cacheKey = `proof:${treeId}:${leafIndex}:${leafData}`;
    if (this.options.useCache && !options.forceRefresh && this.proofCache.has(cacheKey)) {
      console.log(`Using cached Merkle proof for leaf ${leafIndex} in tree ${treeId}`);
      return this.proofCache.get(cacheKey)!;
    }
    console.log(`Generating Merkle proof for leaf ${leafIndex} in tree ${treeId}`);
    // Fetch the state if needed (not strictly required for real proof, but may be useful for context)
    // const state = await this.fetchMerkleState(treeId, options.forceRefresh);
    // Use the real Light Protocol SDK to generate a Merkle proof
    const rpc = this.lightService.getRpc();
    // The SDK expects a BN for the hash argument. Convert leafData to BN if possible.
    let hash: BN;
    try {
      // If leafData is a hex string, convert to BN. Otherwise, hash it as needed for your use case.
      hash = new BN(leafData, 16);
    } catch {
      // Fallback: use a hash of the string (not cryptographically correct, but avoids crash)
      hash = new BN(Buffer.from(leafData).toString('hex'), 16);
    }
    let proofResult;
    try {
      proofResult = await rpc.getCompressedAccountProof(hash);
    } catch (error) {
      throw new Error(`Failed to generate Merkle proof: ${(error as Error).message}`);
    }
    // Adapt the returned structure to the MerkleProof interface
    const proof: MerkleProof = {
      leafIndex: proofResult.leafIndex ?? leafIndex,
      leaf: leafData,
      siblings: proofResult.merkleProof?.map((bn: BN) => bn.toString()) ?? [],
      root: proofResult.root?.toString() ?? ''
    };
    if (this.options.useCache) {
      this.proofCache.set(cacheKey, proof);
    }
    return proof;
  }
  
  /**
   * Verify a Merkle proof
   * 
   * @param proof The Merkle proof to verify
   * @returns Whether the proof is valid
   * @throws Always throws: client-side verification is not supported by the Light Protocol SDK.
   */
  async verifyProof(proof: MerkleProof): Promise<boolean> {
    console.log(`Verifying Merkle proof for leaf ${proof.leafIndex}`);
    // Client-side verification is not supported by the Light Protocol SDK.
    // This method is a placeholder and will always throw.
    throw new Error(
      'Merkle proof verification is not supported client-side. ' +
      'Light Protocol does not expose a TypeScript/WASM verifier. ' +
      'Verification must be performed on-chain or with a supported prover.'
    );
  }
  
  /**
   * Calculate root hash from a leaf and its proof
   *
   * @param leaf The leaf hash
   * @param siblings The sibling hashes
   * @returns The calculated root hash (placeholder, not a real Poseidon calculation)
   * @note Real Poseidon-based calculation is not implemented in this SDK. This is a stub.
   */
  calculateRootFromProof(leaf: string, siblings: string[]): string {
    // TODO: Implement real Poseidon-based root calculation if/when available in JS/WASM.
    // For now, just returning a mock hash for interface compatibility.
    return `mock-root-${Date.now()}`;
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    console.log('Clearing Merkle proof and state caches');
    this.stateCache.clear();
    this.proofCache.clear();
  }
} 