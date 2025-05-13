// Export services
export * from './services/LightProtocolService';
export * from './services/MerkleProofService';
export * from './services/TransactionService';

// Main entry point
import { LightProtocolService } from './services/LightProtocolService';
import { MerkleProofService, MerkleProofOptions } from './services/MerkleProofService';
import { TransactionService, TransactionOptions } from './services/TransactionService';

/**
 * Initialize the Light Protocol SDK and return a service instance
 * @param config Optional configuration
 * @returns An initialized LightProtocolService
 */
export function initLightProtocol(config = {}) {
  return new LightProtocolService(config);
}

/**
 * Initialize the Merkle proof service with a Light Protocol service
 * @param lightService LightProtocolService instance
 * @param options Optional MerkleProofOptions
 * @returns An initialized MerkleProofService
 */
export function initMerkleProofService(lightService: LightProtocolService, options: MerkleProofOptions = {}) {
  return new MerkleProofService(lightService, options);
}

/**
 * Initialize the Transaction service with required services
 * @param lightService LightProtocolService instance
 * @param merkleService Optional MerkleProofService instance (will be created if not provided)
 * @returns An initialized TransactionService
 */
export function initTransactionService(
  lightService: LightProtocolService,
  merkleService?: MerkleProofService
) {
  return new TransactionService(lightService, merkleService);
}

// Export default
export default {
  LightProtocolService,
  MerkleProofService,
  TransactionService,
  initLightProtocol,
  initMerkleProofService,
  initTransactionService
}; 