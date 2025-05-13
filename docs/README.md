# Heart of Blockchain Documentation

This directory contains technical documentation for the Heart of Blockchain project, a Solana-based donation platform using Light Protocol's zero-knowledge compression for scalable, private, and efficient on-chain donations.

## Key Documents

- [Technical Design Document](./technical-design.md) - Detailed architecture and implementation decisions
- [Testing Strategy](./testing-strategy.md) - Comprehensive approach to testing the client SDK
- [ZK Implementation Guide](./zkimplementation.md) - Details on the zero-knowledge implementation

## Project Structure

The Heart of Blockchain project consists of the following main components:

- **On-Chain Program**: Solana smart contract for campaign management and donation processing
- **Client SDK**: TypeScript library for application integration
- **Example Applications**: Demonstrations of platform usage

## Getting Started

For new developers, we recommend the following reading order:

1. Start with the main [README.md](../README.md) for a high-level overview
2. Read the [Technical Design Document](./technical-design.md) to understand architecture
3. Review the [ZK Implementation Guide](./zkimplementation.md) for cryptographic details
4. Check the [Testing Strategy](./testing-strategy.md) for quality assurance approach

## Development Workflow

Refer to the task management system for current development status and tasks:

```bash
# View current tasks and progress
task-master list

# See what to work on next
task-master next
```

## Contributing

When contributing to the documentation:

1. Maintain consistent formatting and style
2. Update diagrams when architecture changes
3. Keep code examples in sync with actual implementation
4. Add references to external documentation where appropriate
5. Include version information when discussing specific releases 