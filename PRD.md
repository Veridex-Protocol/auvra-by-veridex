# Auvra AI: Product Requirements Document (PRD)

## 1. Executive Summary
**Product Name:** Auvra AI (Powered by Auvra)
**Goal:** Build a production-ready Enterprise Risk Firewall in 3 days for the Chainlink Convergence Hackathon.
**Core Value Proposition:** Combine the speed of autonomous AI risk detection with the safety of human-in-the-loop biometric compliance (World ID) and the security of decentralized orchestration (Chainlink CRE) and risk-free simulation (Tenderly).

## 2. Problem Statement
DeFi protocols currently face a critical security trilemma during live exploits (e.g., flash loan attacks, oracle manipulation):
1. **Manual intervention** (multi-sig signers waking up and coordinating) is too slow, allowing attackers to drain millions before a pause is executed.
2. **Autonomous AI intervention** is too risky. Handing an AI agent an unrestricted private key risks catastrophic hallucinations or protocol bricking.
3. **On-chain automated safeguards** are transparent. MEV bots can see the risk parameters, front-run the safeguards, or game the system.

## 3. The Solution
Auvra AI operates as a **compliance execution middleware**.
When a Auvra-powered AI agent detects an anomaly, it doesn't execute an on-chain action. Instead, it uses its delegated session key to pay (via x402) and trigger a Chainlink CRE Workflow. 
This workflow uses Chainlink Confidential Compute to evaluate the risk off-chain, simulates the protocol pause using Tenderly Virtual TestNets, and halts execution until a human admin authenticates biometrically via World ID on a thirdweb frontend. Only then does the CRE `EVMClient` execute the transaction.

## 4. Target Audience
- **DeFi Protocol Teams:** Seeking automated, un-gameable safeguards against exploits.
- **Institutional Risk Managers:** Requiring strict human-in-the-loop compliance before major contract state changes.

## 5. Requirements Scope (3-Day Build)

### Phase 1: The AI Risk Sentinel (Auvra Integration)
- **Goal:** A Node.js background process that detects "exploits" and triggers the CRE Workflow.
- **Requirements:**
  - Mock an on-chain event stream (e.g., a massive sudden transfer).
  - Use `@veridex/agentic-payments` SDK.
  - The AI agent must authenticate a session using a Passkey (P-256) and sign an x402 micropayment to authorize the CRE HTTP trigger.

### Phase 2: Decentralized Orchestration (Chainlink CRE)
- **Goal:** An orchestrator built in TypeScript using the `@chainlink/cre-sdk`.
- **Requirements:**
  - Define an `http.Trigger` that the AI agent calls.
  - Implement a `handler()` callback.
  - Utilize `HTTPClient` to make external API calls (to Tenderly).
  - Suspend execution (or implement a two-step trigger callback architecture) while waiting for Human Approval.
  - Utilize `EVMClient` to dispatch the final `pause()` transaction to a target smart contract on a public testnet.

### Phase 3: The Simulation Layer (Tenderly Integration)
- **Goal:** Ensure the proposed safeguard action is safe.
- **Requirements:**
  - Inside the CRE Workflow, formulate a POST request to Tenderly's Virtual TestNet Simulation API.
  - Simulate the execution of the `pause()` function on the Target Contract.
  - Parse the simulation result context. If the transaction "reverts", abort the rest of the workflow. If successful, proceed.

### Phase 4: Human-in-the-Loop Compliance (World ID + thirdweb)
- **Goal:** Biometric final approval by the Protocol Admin.
- **Requirements:**
  - A simple React frontend (Next.js or Vite).
  - Incorporate `thirdweb` for wallet connection.
  - Incorporate World ID `IDKit` v4 for Proof of Humanness.
  - An Admin receives an alert (webhook to discord/telegram or simply polling the UI), reviews the Tenderly simulation link, and clicks "Approve". 
  - Submitting the World ID ZK proof triggers the final step of the CRE Workflow.

## 6. Out of Scope (For Hackathon)
- Deploying the Auvra Hub/Spoke smart contracts (we will use existing Auvra testnet deployments).
- Training a complex ML model for risk detection (we will use a static heuristic or mocked threshold for the demo).
- Chainlink Confidential Compute deployment (we will mock the confidential retrieval if Early Access hardware is unavailable over the weekend).

## 7. Success Metrics
1. **Fully executing E2E flow:** AI Trigger -> CRE Workflow -> Tenderly Simulation -> World ID Approval -> On-chain execution.
2. **Recorded Demo:** A polished 3-5 minute video demonstrating this flow clearly.
3. **Public Repo:** Well-documented TypeScript code relying heavily on Chainlink CRE primitives.
