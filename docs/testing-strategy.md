# Heart of Blockchain - Testing Strategy

## Test Directory Map & Documentation

All tests referenced in this strategy are implemented in the following directories. Each directory contains a README with details on the context and purpose of its tests:

- [client/test/services/](../client/test/services/) — Unit tests for client SDK services ([README](../client/test/services/README.md))
- [tests/](../tests/) — Integration and end-to-end tests ([README](../tests/README.md))
- [ZK-STACK/tests/](../ZK-STACK/tests/) — Rust-based ZK/Merkle/proof logic tests ([README](../ZK-STACK/tests/README.md))

This document outlines the comprehensive testing approach for the Heart of Blockchain project, with particular focus on the client SDK components that have been implemented. The testing strategy follows industry best practices and ensures robust, reliable code with high test coverage.

## Testing Philosophy

Our testing approach follows these key principles:

1. **Service Isolation**: Each service is tested in isolation with appropriate mocking of dependencies
2. **Edge Case Coverage**: Tests explicitly cover failure modes and edge cases
3. **Behavior-Driven**: Tests verify behavior, not implementation details
4. **Comprehensive Coverage**: Aim for >90% code coverage across critical paths
5. **Performance Verification**: Tests confirm caching and performance optimizations work as expected

## Test Structure

The test suite is structured around the three core services:

### 1. LightProtocolService Tests

Tests for the service that handles connection and basic operations with Light Protocol:

- **Location:** [client/test/services/](../client/test/services/) ([README](../client/test/services/README.md))
- **Initialization Tests**: Verify proper setup with default and custom configurations
- **Connection Tests**: Ensure proper connection to Solana RPC and Light Protocol
- **Program Initialization**: Verify IDL loading and program setup
- **Error Handling**: Test behavior on connection failures and invalid inputs
- **Utility Methods**: Verify getter methods and helper functions

### 2. MerkleProofService Tests

Tests for the service that handles Merkle state fetching and proof operations:

- **Location:** [client/test/services/](../client/test/services/) ([README](../client/test/services/README.md))
- **State Fetching**: Verify Merkle state retrieval from Light Protocol
- **Caching Tests**: Confirm cache behavior for performance optimization
- **Proof Generation**: Test generation of Merkle proofs for donation data
- **Proof Verification**: Verify validation of Merkle proofs
- **Error Handling**: Test retry logic and failure scenarios
- **Race Conditions**: Test concurrent operations and timeout scenarios

### 3. TransactionService Tests

Tests for the service that builds and sends transactions with proofs:

- **Location:** [client/test/services/](../client/test/services/) ([README](../client/test/services/README.md))
- **Transaction Building**: Verify correct transaction construction with proofs
- **Proof Integration**: Test inclusion of proof data in transactions
- **Transaction Sending**: Test transaction submission with different signers
- **Retry Logic**: Verify automatic retry on transaction failures
- **Status Tracking**: Test transaction status updates and confirmation flow
- **Error Scenarios**: Verify handling of timeouts, network errors, and validation failures

## Integration & End-to-End Tests

- **Location:** [tests/](../tests/) ([README](../tests/README.md))
- **Purpose:** Validate the correct interaction between client SDK services, the Solana program, and the overall user flow.
- **Files:**
  - `transaction_service_integration.js`
  - `merkle_proof_integration.js`
  - `client_sdk_integration.js`
  - `heart_of_blockchain.ts`

## ZK-STACK and Merkle/Proof Logic Tests

- **Location:** [ZK-STACK/tests/](../ZK-STACK/tests/) ([README](../ZK-STACK/tests/README.md))
- **Purpose:** Test Merkle root updates, leaf formatting, and ZK proof verification logic in Rust.
- **Files:**
  - `test_merkle_root_update.rs`
  - `test_leaf_formatting.rs`
  - `test_zk_verification.rs`

## Mocking Strategy

Extensive mocking is used to isolate components and simulate external dependencies:

- **Connection Mocking**: Simulate Solana RPC and Light Protocol RPC responses
- **Response Simulation**: Provide controlled test data for deterministic testing
- **Error Injection**: Simulate various error conditions to test recovery
- **Network Delays**: Test timeout handling and retry policies
- **State Transitions**: Model complex state changes for multi-step operations

## Test Technologies

The test suite leverages several technologies:

- **Mocha**: Test runner for organizing and executing tests
- **Chai**: Assertion library for expressive test conditions
- **Sinon**: Comprehensive mocking, stubbing, and spy capabilities
- **Istanbul/NYC**: Code coverage analysis

## Example Test Pattern

Example of a typical test pattern using Sinon for mocking:

```typescript
describe('MerkleProofService', () => {
  let sandbox: sinon.SinonSandbox;
  let lightService: LightProtocolService;
  let proofService: MerkleProofService;
  
  beforeEach(() => {
    // Create fresh sandbox for each test
    sandbox = sinon.createSandbox();
    
    // Create services
    lightService = new LightProtocolService();
    proofService = new MerkleProofService(lightService);
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('Proof Generation', () => {
    it('should generate a proof with valid inputs', async () => {
      // Arrange: Setup stubs for dependencies
      const fetchStateStub = sandbox.stub(proofService, 'fetchMerkleState')
        .resolves({ /* mock state */ });
      
      // Act: Call the method under test
      const result = await proofService.generateProof('tree-id', 1, 'data');
      
      // Assert: Verify the behavior
      expect(result).to.be.an('object');
      expect(result.leafIndex).to.equal(1);
      expect(fetchStateStub.calledOnce).to.be.true;
    });
    
    it('should retry on temporary failures', async () => {
      // Arrange: Setup stub to fail first time, succeed second time
      const fetchStub = sandbox.stub();
      fetchStub.onFirstCall().rejects(new Error('Network error'));
      fetchStub.onSecondCall().resolves({ /* mock state */ });
      
      sandbox.stub(proofService as any, 'mockFetchMerkleTreeState')
        .callsFake(fetchStub);
      
      // Act: Call the method under test
      await proofService.fetchMerkleState('test-id');
      
      // Assert: Verify retry behavior
      expect(fetchStub.calledTwice).to.be.true;
    });
  });
});
```

## Testing Metrics

The test suite aims to achieve:

- **Coverage**: >90% statement, branch, and function coverage
- **Performance**: Tests complete in <30 seconds for fast feedback
- **Reliability**: Zero flaky tests (tests that sometimes pass, sometimes fail)
- **Isolation**: No test dependencies (tests can run in any order)

## Continuous Integration

Tests are integrated into the CI/CD pipeline:

- **Pre-commit Hooks**: Run tests on staged files before commit
- **Pull Request Validation**: Run complete test suite on PRs
- **Nightly Builds**: Run extended tests including performance benchmarks
- **Coverage Reports**: Generate and archive coverage reports

## Test Maintenance

Guidelines for maintaining the test suite:

1. **New Features**: Always add tests for new functionality
2. **Bug Fixes**: Add regression tests for any fixed bugs
3. **Refactoring**: Ensure tests pass before and after refactoring
4. **Test Cleanup**: Regularly review and clean up test mocks and fixtures
5. **Documentation**: Keep test documentation up to date with code changes

## Future Test Expansion

Plans for expanding the test suite in Task 6:

1. **Integration Tests**: Testing the interaction between all services
2. **End-to-End Tests**: Testing complete user flows
3. **Load Tests**: Verifying performance under load
4. **Security Tests**: Adding specific security vulnerability checks
5. **Snapshot Tests**: For UI components and data structures
6. **Property-Based Tests**: For complex logic verification with randomized inputs 