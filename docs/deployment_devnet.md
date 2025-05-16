# Heart of Blockchain – Solana Program Deployment (Devnet)

## Overview
This document describes the process for building, deploying, and verifying the Heart of Blockchain Solana program on the **Devnet** cluster. It also includes the program address and instructions for redeployment.

---

## 1. Build the Program

From the project root, build the Anchor program:

```bash
cd ZK-STACK
anchor build
```

This will generate the compiled `.so` and keypair files in `ZK-STACK/target/deploy/`.

---

## 2. Configure Solana CLI for Devnet

Set your CLI to use Devnet:

```bash
solana config set --url https://api.devnet.solana.com
```

Check your wallet balance and airdrop SOL if needed:

```bash
solana balance
solana airdrop 2
```

---

## 3. Deploy the Program

Deploy the program using the following command:

```bash
solana program deploy target/deploy/heart_of_blockchain.so --program-id target/deploy/heart_of_blockchain-keypair.json
```

- **Program ID:** `2tU5PaEAMowBcvBDFUnmiy33beCnPLw4krvVTBLY7oNq`
- **Keypair Path:** `ZK-STACK/target/deploy/heart_of_blockchain-keypair.json`
- **Binary Path:** `ZK-STACK/target/deploy/heart_of_blockchain.so`

---

## 4. Verify Deployment

- After deployment, the CLI will output the Program ID and transaction signature.
- You can verify the program on [Solana Explorer (Devnet)](https://explorer.solana.com/address/2tU5PaEAMowBcvBDFUnmiy33beCnPLw4krvVTBLY7oNq?cluster=devnet).
- Example output:

```
Program Id: 2tU5PaEAMowBcvBDFUnmiy33beCnPLw4krvVTBLY7oNq
Signature: 3Mr22rC38qVPwcUJHWtWM9dKX3yeUGqSR5UvwAPV45kTwNRMJCpfxs6E56kY1f2yL6jiGKNTsj2g993WcBNrfMqz
```

---

## 5. Redeployment Process

If you need to redeploy (e.g., after code changes):

1. Rebuild the program:
   ```bash
   anchor build
   ```
2. Redeploy using the same command:
   ```bash
   solana program deploy target/deploy/heart_of_blockchain.so --program-id target/deploy/heart_of_blockchain-keypair.json
   ```
3. If you encounter insufficient funds, use `solana airdrop 2` and retry.

---

## 6. Frontend/SDK Integration

- Use the following Program ID in your frontend or SDK configuration:

  ```env
  VITE_HEART_OF_BLOCKCHAIN_PROGRAM_ID=2tU5PaEAMowBcvBDFUnmiy33beCnPLw4krvVTBLY7oNq
  ```

---

## 7. Troubleshooting

- **Insufficient funds:** Use `solana airdrop 2` on Devnet.
- **Wrong network:** Ensure your CLI is set to Devnet (`solana config get`).
- **Build errors:** Run `anchor clean` and `anchor build` again.

---

## 8. References
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Docs: Deploying Programs](https://solana.com/docs/programs/deploying)

---

_Last updated: {{DATE}}_ 