# Heart of Blockchain - Technical Design Document

## Introduction

This document outlines the technical design and architecture of the Heart of Blockchain project, a Solana-based donation platform using Light Protocol's zero-knowledge compression. It explains the key design decisions, architecture, and implementation details.

## System Overview

Heart of Blockchain is designed as a multi-layered application with the following components:

1. **On-Chain Program Layer**: Solana smart contract written in Rust
2. **Compression Layer**: Light Protocol integration for ZK compression
3. **Client SDK Layer**: TypeScript/JavaScript SDK for application integration
4. **Frontend Layer**: User interface components for interaction

The system follows a modular architecture with clear separation of concerns between layers.

## Architecture Diagram

```
┌─────────────────────────────────┐
│         Frontend Layer          │
│  (React, Vue, or other client)  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│        Client SDK Layer         │
│  LightProtocolService           │
│  MerkleProofService             │
│  TransactionService             │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│       Compression Layer         │
│  Light Protocol ZK Compression  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│      On-Chain Program Layer     │
│  Solana Program (Rust)          │
└─────────────────────────────────┘
```

## Design Decisions and Rationale

### 1. Account Compression via Merkle Trees

**Decision**: Use Merkle trees for donation data compression

**Rationale**:
- Storing every donation as a separate account would be prohibitively expensive
- Merkle trees allow for efficient verification of inclusion
- Light Protocol's account compression provides a standardized implementation
- Only the Merkle root needs to be stored on-chain, reducing storage costs

**Implementation**:
- Campaign accounts store only the Merkle root (32 bytes) instead of all donation data
- Full donation data is compressed off-chain with verifiable integrity
- ZK proofs enable privacy while maintaining verifiability

### 2. Cross-Program Invocation (CPI) to Light Protocol

**Decision**: Use CPI calls to Light Protocol's program instead of direct state management

**Rationale**:
- Leverages battle-tested and audited code from Light Protocol
- Reduces development effort and potential for security vulnerabilities
- Enables standardized compression and proof verification
- Allows future upgrades of Light Protocol without changing our code

**Implementation**:
- Campaign creation initializes a Merkle tree via CPI
- Donations update the Merkle tree via CPI
- Merkle root is stored in the campaign account for verification

### 3. Service-Oriented Client SDK

**Decision**: Implement a service-oriented architecture for the client SDK

**Rationale**:
- Clear separation of concerns between services
- Easier to test individual components in isolation
- Flexible initialization and configuration
- Better error handling and retry logic
- More maintainable codebase through focused responsibilities

**Implementation**:
- `LightProtocolService`: Handles connection and basic operations
- `MerkleProofService`: Manages Merkle state and proof operations
- `TransactionService`: Builds and sends transactions with proofs

### 4. Comprehensive Caching Strategy

**Decision**: Implement multi-level caching in the client SDK

**Rationale**:
- Reduces network calls to RPC endpoints
- Improves user experience with faster response times
- Reduces load on blockchain infrastructure
- Minimizes transaction fees by avoiding redundant operations

**Implementation**:
- Merkle state caching to avoid repeated fetches
- Proof caching to reuse previously generated proofs
- Transaction result caching to avoid redundant status checks

### 5. Robust Error Handling and Retry Logic

**Decision**: Implement comprehensive error handling and retry mechanisms

**Rationale**:
- Blockchain operations can fail for various reasons (congestion, timeouts)
- Users expect resilient applications that handle errors gracefully
- Retrying with appropriate backoff improves success rates
- Clear error messages improve developer experience

**Implementation**:
- Categorized error types with specific handling strategies
- Configurable retry policies with exponential backoff
- Detailed error information for debugging
- Graceful fallbacks when operations fail

### 6. Isolated Testability

**Decision**: Design components for thorough testability

**Rationale**:
- Ensures robust, reliable code
- Enables comprehensive test coverage
- Simplifies maintenance and refactoring
- Improves developer confidence in changes

**Implementation**:
- Dependency injection for easy mocking
- Clear interfaces between components
- Explicit state management for predictable testing
- Sinon-based mocking for external dependencies

## Component Details

### On-Chain Program (Solana Smart Contract)

The Solana program is responsible for:

1. **Campaign Management**:
   - Creating campaigns with initial state
   - Storing campaign metadata
   - Maintaining Merkle roots for donation data

2. **Donation Processing**:
   - Verifying donation ZK proofs
   - Updating campaign state with new Merkle roots
   - Tracking donation statistics

3. **Cross-Program Invocation**:
   - Initializing Merkle trees via Light Protocol
   - Updating trees with new donation data
   - Verifying proofs for donation validity

### Client SDK Services

#### 1. LightProtocolService

Responsible for basic interaction with Light Protocol:

- Initializing connection to Solana and Light Protocol
- Managing program interaction
- Providing base utility functions

```typescript
export class LightProtocolService {
  constructor(config: LightProtocolConfig = {});
  
  // Connection management
  async testConnection(): Promise<boolean>;
  
  // Program interaction
  async initializeProgram(wallet: Wallet): Promise<Program>;
  
  // Utility methods
  getConnection(): Connection;
  getRpc(): RpcConnection;
  getProgram(): Program;
}
```

#### 2. MerkleProofService

Handles Merkle state and proof operations:

- Fetching Merkle state from Light Protocol
- Generating proofs for donations
- Verifying proofs for validity
- Managing state and proof caching

```typescript
export class MerkleProofService {
  constructor(
    lightService: LightProtocolService,
    options: MerkleProofOptions = {}
  );
  
  // State operations
  async fetchMerkleState(treeId: string, forceRefresh?: boolean): Promise<any>;
  
  // Proof operations
  async generateProof(
    treeId: string,
    leafIndex: number,
    leafData: string,
    options?: { forceRefresh?: boolean }
  ): Promise<MerkleProof>;
  
  async verifyProof(proof: MerkleProof): Promise<boolean>;
  
  // Cache management
  clearCache(): void;
}
```

#### 3. TransactionService

Manages transaction building and sending:

- Constructing transactions with proofs
- Sending transactions to the blockchain
- Tracking transaction status
- Handling retries and failures

```typescript
export class TransactionService {
  constructor(
    lightService: LightProtocolService,
    merkleService?: MerkleProofService
  );
  
  // Transaction building
  async buildTransactionWithProof(
    proof: MerkleProof,
    recipient: PublicKey,
    amount: number
  ): Promise<Transaction>;
  
  // Transaction sending
  async sendTransaction(
    transaction: Transaction,
    signers: Signer[],
    options?: TransactionOptions
  ): Promise<TransactionResult>;
  
  // Status tracking
  async waitForConfirmation(
    signature: string,
    timeout?: number
  ): Promise<TransactionResult>;
  
  getPendingTransactionStatus(signature: string): TransactionStatus | null;
  async isTransactionConfirmed(signature: string): Promise<boolean>;
}
```

## Data Flow

### Donation Flow

1. **Client Application**:
   - User initiates donation with amount and campaign ID
   - Client SDK prepares donation data

2. **MerkleProofService**:
   - Fetches current Merkle state for the campaign
   - Generates a ZK proof for the donation

3. **TransactionService**:
   - Builds a transaction with the proof
   - Gets signature from user wallet
   - Sends transaction to the blockchain

4. **On-Chain Program**:
   - Verifies the ZK proof
   - Updates campaign state with new Merkle root
   - Updates donation statistics

5. **Client Application**:
   - Receives confirmation of successful donation
   - Updates UI with new donation information

### Data Retrieval Flow

1. **Client Application**:
   - User requests donation history for a campaign
   - Client SDK prepares data request

2. **MerkleProofService**:
   - Fetches compressed state from Light Protocol
   - Decompresses donation data

3. **Client Application**:
   - Receives donation history data
   - Renders donation history UI

## Technical Debt and Future Improvements

### Current Technical Debt

1. **Limited Platform Support**:
   - Currently focused on Solana and Light Protocol
   - Could expand to other blockchains in the future

2. **Mocked Components**:
   - Some components use mocks pending full Light Protocol integration
   - Will need to replace with actual implementations

3. **Testing Gaps**:
   - Integration tests between services needed
   - End-to-end tests required for full workflows

### Planned Improvements

1. **Multi-chain Support**:
   - Extend architecture to support multiple blockchains
   - Abstract blockchain-specific code behind interfaces

2. **Enhanced Caching**:
   - Implement persistent caching for offline support
   - Add cache invalidation strategies

3. **Error Recovery**:
   - Improve transaction recovery mechanisms
   - Add conflict resolution for concurrent operations

4. **Performance Optimization**:
   - Batch processing for multiple donations
   - Parallel proof generation for high volumes

## Conclusion

The Heart of Blockchain technical design leverages modern blockchain architecture patterns and zero-knowledge technology to create a scalable, efficient donation platform. The modular architecture, robust error handling, and comprehensive testing approach ensure a reliable and maintainable system.

The design choices made prioritize:
- Scalability through compression
- User privacy through zero-knowledge proofs
- Developer experience through clear APIs
- System reliability through error handling and testing

This foundation provides a solid basis for future enhancements and extensions to support additional features and platforms. 