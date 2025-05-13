# ZK-STACK Merkle & ZK Logic Tests

This directory contains Rust-based unit and integration tests for the ZK-STACK and Merkle tree logic in the Heart of Blockchain project. These tests focus on the correctness of Merkle root updates, leaf formatting, and zero-knowledge proof verification.

## Context

For the overall testing philosophy and structure, see [../../docs/testing-strategy.md](../../docs/testing-strategy.md).

## Tests Covered

- **test_merkle_root_update.rs**: Tests campaign state updates with new Merkle roots and donation statistics.
- **test_leaf_formatting.rs**: Verifies correct formatting of donation data as Merkle tree leaves and simulates batch append operations.
- **test_zk_verification.rs**: Tests ZK proof verification logic, including proof format validation and donation data extraction.

## Purpose

- Ensure Merkle tree and ZK proof logic are robust and correct
- Provide confidence in the cryptographic and state transition components
- Support the integration of Light Protocol and privacy-preserving features 