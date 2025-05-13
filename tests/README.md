# Integration & End-to-End Tests

This directory contains integration and end-to-end tests for the Heart of Blockchain project. These tests verify the correct interaction between client SDK services, the Solana program, and the overall user flow.

## Context

For the full testing philosophy and structure, see [../docs/testing-strategy.md](../docs/testing-strategy.md).

## Tests Covered

- **transaction_service_integration.js**: Checks the integration and correct wiring of the TransactionService, including required methods and exports.
- **merkle_proof_integration.js**: Verifies MerkleProofService integration, method presence, and caching/retry logic.
- **client_sdk_integration.js**: Ensures the LightProtocolService and client SDK are correctly implemented and dependencies are present.
- **heart_of_blockchain.ts**: Provides an end-to-end test of the Solana Anchor program, including campaign and donation flows.

## Purpose

- Validate that all client services work together as expected
- Ensure the Solana program logic is correctly integrated with the client
- Provide confidence in the complete user flow from SDK to blockchain 