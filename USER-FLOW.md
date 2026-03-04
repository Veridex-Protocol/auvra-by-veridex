# Auvra AI: Detailed User Flow

This document details the exact sequence of events from the perspective of the system actors: The AI Agent, The Chainlink CRE Orchestrator, The Tenderly Simulator, and The Human Admin.

## Flow Diagram

```text
[ AI Agent ]  -->  [ Chainlink CRE ]  -->  [ Tenderly API ]  -->  [ Alert System ]  -->  [ Admin Frontend (World ID) ]  -->  [ Chainlink CRE ]  -->  [ Mainnet ]
```

## Step-by-Step User Flow

### 1. The Anomaly Detection (AI Agent)
1. **Context:** A highly volatile liquidity pool on Base Testnet is being monitored.
2. **Action:** The AI Agent detects a flash loan that exceeds standard standard deviation parameters (a simulated hack).
3. **Trigger:** The AI formulates a payload: `{ targetContract: "0x...", action: "pause()", reason: "Flash loan anomaly" }`.
4. **Payment & Auth:** To prevent spam, the AI uses its Auvra Agent Wallet. It signs an x402 micropayment payload authorizing it to call the Chainlink CRE webhook.
5. **Execution:** The AI sends a POST request to the Chainlink CRE HTTP Trigger endpoint.

### 2. The Verification & Simulation (Chainlink CRE)
1. **Trigger:** The CRE Workflow DON receives the AI's HTTP request and initiates the workflow execution.
2. **Confidential Compute (Optional/Mocked):** The CRE workflow executes off-chain logic to verify the AI's risk heuristics against a private parameter list. 
3. **Simulation Call:** The CRE workflow uses its `HTTPClient` to format a request to Tenderly.
4. **Tenderly Execution:** 
   - Tenderly forks the chain state at the exact current block.
   - It simulates the execution of the `pause()` transaction on the Virtual TestNet.
   - It returns the simulation trace back to the CRE workflow.
5. **Validation:** The CRE Workflow parses the Tenderly response. 
   - *If simulation reverts:* The workflow aborts (the pause parameter is invalid).
   - *If simulation succeeds:* The workflow generates a unique Approval ID.

### 3. The Human Notification
1. **Alert Generation:** The CRE Workflow triggers an alert (e.g., via a Discord/Telegram webhook, or simply logging an event that the Frontend picks up) containing:
   - The detected threat.
   - The Tenderly Simulation URL (where the admin can visually verify the exact state change).
   - A link to the Admin Approval Portal.

### 4. The Human-in-the-Loop Approval (Admin Portal)
1. **Login:** The Protocol Admin clicks the alert link and opens the web application.
2. **Review:** The Admin sees the threat assessment and clicks the Tenderly link to verify the simulation guarantees the protocol's safety.
3. **Wallet Connection:** The Admin connects their wallet using **thirdweb**.
4. **Biometric Verification:** The Admin clicks exactly one button: **"Approve Execution"**.
5. **World ID Flow:** 
   - The World ID `IDKit` modal pops up. 
   - The Admin uses their World App on their mobile device to scan the QR code.
   - World ID verifies they are a unique human (Proof of Humanness) and generates a Zero-Knowledge Proof (ZKP).
6. **Submission:** The Frontend sends a POST request containing the Approval ID and the World ID ZKP back to a secondary Chainlink CRE HTTP Trigger.

### 5. Final Execution (Chainlink CRE & Mainnet)
1. **Final Validation:** The secondary CRE Workflow receives the approval payload.
2. **ZKP Verification:** The CRE workflow verifies the World ID ZKP (either using smart contract bindings or World ID's off-chain verification API).
3. **On-Chain Write:** Upon successful verification, the CRE Workflow utilizes the `EVMClient` to sign and broadcast the `pause()` transaction to the target DeFi protocol on the public testnet.
4. **Resolution:** The AI Agent receives a completion callback, and the protocol is successfully secured.
