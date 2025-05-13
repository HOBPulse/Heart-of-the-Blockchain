# Client Service Unit Tests

This directory contains unit tests for the main client-side services of the Heart of Blockchain project. These tests are designed to ensure the reliability, correctness, and robustness of the SDK components that interact with Light Protocol and Solana.

## Context

For a comprehensive overview of the project's testing philosophy and strategy, see [../docs/testing-strategy.md](../../../../docs/testing-strategy.md).

## Services Covered

- **LightProtocolService**: Tests initialization, connection, IDL loading, and error handling for the Light Protocol integration.
- **MerkleProofService**: Tests Merkle state fetching, proof generation, caching, and error handling.
- **TransactionService**: Tests transaction building, proof integration, sending, retry logic, and status tracking.

## Test Technologies

- Mocha (test runner)
- Chai (assertions)
- Sinon (mocking/stubbing)

## Purpose

- Ensure each service behaves correctly in isolation
- Cover edge cases, error scenarios, and performance optimizations
- Provide a foundation for integration and end-to-end tests 