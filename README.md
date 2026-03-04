# Auvra — Enterprise Risk Firewall for DeFi

**Privacy-preserving AI risk agents that safeguard DeFi protocols via Chainlink CRE, World ID, Tenderly, and thirdweb.**

> Built for the [Chainlink Convergence Hackathon](https://chain.link/hackathon) (Feb 6 – Mar 8, 2026)

---

## Table of Contents

- [Problem](#problem)
- [Solution](#solution)
- [Architecture](#architecture)
- [User Flow](#user-flow)
- [Chainlink Usage](#chainlink-usage)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [CRE Workflow Simulation](#cre-workflow-simulation)
- [Hackathon Tracks](#hackathon-tracks)
- [Links](#links)

---

## Problem

DeFi protocols face a trilemma during live exploits:

1. **Manual intervention is too slow** — by the time a multi-sig approves an emergency pause, funds are already drained.
2. **Autonomous AI intervention is dangerous** — giving an AI unrestricted signing rights exposes the protocol to hallucination risk.
3. **On-chain parameters are MEV-exploitable** — putting risk-detection thresholds on-chain lets searchers front-run or game the safeguards.

## Solution

Auvra AI is an **Enterprise Risk Firewall** that combines the speed of autonomous AI agents with human-in-the-loop biometric compliance.

When the AI Risk Agent detects an exploit (e.g., flash loan attack, oracle manipulation), it does **not** write directly to the blockchain. Instead it uses its Auvra-delegated session key to autonomously pay for and trigger a **Chainlink CRE Workflow** which:

1. **Keeps heuristics private** — CRE Confidential HTTP ensures risk parameters stay off-chain and hidden from MEV bots.
2. **Simulates before executing** — Tenderly Virtual TestNets fork the live state and simulate the emergency `pause()` to ensure it won't brick the protocol.
3. **Demands human compliance** — The workflow suspends and requires a **World ID** biometric Proof of Humanness from the protocol admin before finalising.
4. **Executes the safeguard** — Once verified, the CRE EVMClient commits the `pause()` transaction on-chain.

---

## Architecture

```
┌──────────────────────┐    x402 payment     ┌───────────────────────────────┐
│  Auvra    Sentinel   │ ──────────────────▶ │  Chainlink CRE Workflow       │
│  (ai-worker/)        │                     │  (cre-workflow/src/handler.ts)│
│  • Gemini heuristics │                     │  • Confidential Compute       │
│  • On-chain monitor  │                     │  • HTTPClient → Tenderly sim  │
│  • @veridex/agent-sdk│                     │  • EVMClient → pause()        │
└──────────────────────┘                     └─────────┬─────────────────────┘
                                                       │
                                                       ▼
                              ┌───────────────────────────────────────┐
                              │  Tenderly Virtual TestNet             │
                              │  • Simulates pause() on Base Sepolia  │
                              │  • Verifies no state corruption       │
                              └───────────────────────────────────────┘
                                                       │
                                                       ▼
                              ┌───────────────────────────────────────┐
                              │  thirdweb Admin Frontend (web/)       │
                              │  • Passkey auth (inAppWallet)         │
                              │  • World ID biometric verification    │
                              │  • Real-time threat dashboard         │
                              └───────────────────────────────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full Mermaid sequence diagram.

---

## User Flow

### 1. Autonomous Agent Phase

1. The **AI Risk Agent** (`ai-worker/`) monitors Base Sepolia for anomalous token flows.
2. On-chain transfer events are aggregated into timeslices and fed to the **Gemini 2.5 Flash** heuristic model.
3. When a critical threat is identified (≥ 0.8), the agent uses its **Auvra `@veridex/agentic-payments` SDK** session key to sign an x402 micropayment and triggers the CRE workflow.

### 2. CRE Orchestration Phase

1. The CRE Workflow receives the threat payload via `http.Trigger`.
2. It runs the AI's risk assessment through **Confidential Compute** to prevent MEV front-running.
3. It calls the **Tenderly Simulation API** via `HTTPClient` to simulate `pause()` on a Virtual TestNet fork.
4. If the simulation succeeds, the workflow suspends and alerts the protocol admin.

### 3. Human-in-the-Loop Phase

1. The admin authenticates with a **thirdweb Passkey** on the dashboard.
2. To approve the emergency pause, the admin verifies identity with **World ID** (biometric ZKP).
3. The proof is validated off-chain within the CRE workflow.

### 4. Execution Phase

1. The CRE `EVMClient` executes `pause()` on the target DeFi contract.
2. The protocol is secured. Transaction finalized on-chain.

---

## Chainlink Usage

> **All files that use Chainlink CRE:**

| File | Chainlink Feature | Description |
|---|---|---|
| [`cre-workflow/src/handler.ts`](cre-workflow/src/handler.ts) | `cre.handler`, `HTTPCapability`, `HTTPClient`, `Runner`, `consensusIdenticalAggregation` | Core CRE Workflow — HTTP trigger, Tenderly simulation via `HTTPClient`, workflow runner |
| [`ai-worker/index.ts`](ai-worker/index.ts) | CRE Workflow trigger via x402 | AI agent triggers the CRE workflow endpoint with x402-authenticated requests |
| [`web/src/app/api/trigger/route.ts`](web/src/app/api/trigger/route.ts) | CRE Workflow proxy | Processes threat payloads, runs Tenderly simulation (mirrors CRE handler logic for local dev) |

### CRE SDK Usage in `handler.ts`

```typescript
import { cre, EVMClient, HTTPClient, HTTPCapability, Runner, consensusIdenticalAggregation } from '@chainlink/cre-sdk';

const httpTrigger = new HTTPCapability().trigger({});

const evaluateThreat = cre.handler(httpTrigger, async (runtime, triggerOutput) => {
  // 1. Parse AI threat payload
  // 2. Simulate pause() via Tenderly HTTPClient
  // 3. Return pending_human_approval ticket
});

export async function main() {
  const runner = await Runner.newRunner();
  await runner.run(async () => [evaluateThreat]);
}
```

---

## Tech Stack

| Component      | Technology                          | Purpose                              |
| -------------- | ----------------------------------- | ------------------------------------ |
| CRE Workflow   | `@chainlink/cre-sdk` (TypeScript) | Decentralised orchestration layer    |
| AI Heuristics  | Google Gemini 2.5 Flash             | Real-time risk analysis              |
| Simulation     | Tenderly Virtual TestNets API       | Fork simulation of emergency actions |
| Identity       | World ID (IDKit v4)                 | Biometric Proof of Humanness         |
| Agent Payments | `@veridex/agentic-payments`       | x402 payment protocol + session keys |
| Dashboard      | Next.js 16 + thirdweb SDK           | Passkey auth + admin approval UI     |
| Blockchain     | Base Sepolia (viem)                 | Target DeFi protocol monitoring      |

---

## Project Structure

```
chainlink-convergence/
├── ai-worker/                    # Autonomous AI Risk Agent
│   ├── index.ts                  # Main worker: monitoring, Gemini AI, CRE trigger
│   ├── package.json
│   └── .env
├── cre-workflow/                 # Chainlink CRE Workflow (compiles to WASM)
│   ├── src/
│   │   ├── handler.ts            # ★ CRE Workflow: HTTPCapability, HTTPClient, Runner
│   │   └── handler.js            # Compiled WASM bundle
│   ├── package.json
│   └── .env
├── web/                          # Next.js Admin Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # ★ Live threat dashboard + World ID + thirdweb
│   │   │   └── api/
│   │   │       ├── trigger/route.ts   # ★ CRE Workflow proxy + Tenderly simulation
│   │   │       ├── approve/route.ts   # World ID verification + execution
│   │   │       ├── status/route.ts    # Dashboard polling endpoint
│   │   │       └── events/route.ts    # Event ingestion from ai-worker
│   │   └── lib/
│   │       ├── store.ts          # In-memory workflow state store
│   │       └── utils.ts
│   ├── package.json
│   └── .env.local
├── ARCHITECTURE.md               # Mermaid sequence diagram
├── PRD.md                        # Product Requirements Document
├── SUBMISSION.md                 # Hackathon submission details
├── docker-compose.yml            # One-command local setup
└── README.md                     # ← You are here
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- [Docker](https://docs.docker.com/get-docker/) (optional, for one-command setup)

### Option 1: Docker Compose (recommended)

```bash
cd hackathon/chainlink-convergence
docker compose up --build
```

This starts:

- **web** on `http://localhost:3000` (Next.js dashboard)
- **ai-worker** on `http://localhost:4000` (AI monitoring agent)
- **cre-workflow** (compiles the CRE WASM bundle)

### Option 2: Manual

```bash
# Terminal 1 — Web Dashboard
cd web && bun install && bun run dev

# Terminal 2 — AI Worker
cd ai-worker && bun install && bun run start

# Terminal 3 — CRE Workflow (compile)
cd cre-workflow && bun install && bun run build
```

### Environment Variables

| Service      | File                  | Key Variables                                                                                 |
| ------------ | --------------------- | --------------------------------------------------------------------------------------------- |
| ai-worker    | `ai-worker/.env`    | `GEMINI_API_KEY`, `RPC_URL`, `TARGET_POOL`, `CRE_WORKFLOW_URL`                        |
| web          | `web/.env.local`    | `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `TENDERLY_ACCESS_KEY`, `NEXT_PUBLIC_WORLDCOIN_APP_ID` |
| cre-workflow | `cre-workflow/.env` | `TENDERLY_ACCESS_KEY`, `TENDERLY_ACCOUNT_SLUG`                                            |

---

## CRE Workflow Simulation

The CRE workflow can be simulated via the Chainlink CRE CLI:

```bash
cd cre-workflow

# Compile the workflow to WASM
bun run build
# → bunx cre-compile src/handler.ts

# Simulate the workflow
cre simulate src/handler.wasm \
  --trigger http \
  --input '{"targetContract":"0x0000000000000000000000000000000000000000","action":"pause()","threatLevel":0.95,"reasoning":"Flash loan volume spike detected"}'
```

The simulation demonstrates:

1. HTTP trigger accepting the AI threat payload
2. Tenderly Virtual TestNet simulation of `pause()`
3. Consensus aggregation across DON nodes
4. Return of a `pending_human_approval` ticket

---

## Hackathon Tracks

### 1. CRE & AI ($17K / $10.5K / $6.5K)

- AI agent (Gemini 2.5 Flash) consumes CRE workflows via x402 payments
- Full CRE Workflow in [`cre-workflow/src/handler.ts`](cre-workflow/src/handler.ts)
- Agent triggers CRE via [`ai-worker/index.ts`](ai-worker/index.ts)

### 2. Risk & Compliance ($16K / $10K / $6K)

- Real-time DeFi pool monitoring with automated emergency pause triggers
- Risk heuristics evaluate flash loans, oracle manipulation, reentrancy patterns
- Tenderly simulation prevents false-positive damage

### 3. Privacy ($16K / $10K / $6K)

- CRE Confidential HTTP keeps AI risk parameters off-chain
- MEV bots cannot reverse-engineer detection thresholds
- Sensitive heuristic data never touches the mempool

### 4. World ID — Best Use with CRE ($5K)

- World ID biometric verification gates emergency `pause()` execution
- Prevents AI hallucination risk by requiring human compliance
- Integrated via IDKit in [`web/src/app/dashboard/page.tsx`](web/src/app/dashboard/page.tsx)

### 5. Tenderly — Virtual TestNets ($5K / $2.5K / $1.75K / $750)

- Real Tenderly Simulation API integration in [`web/src/app/api/trigger/route.ts`](web/src/app/api/trigger/route.ts)
- CRE Workflow simulates `pause()` on Base Sepolia fork before execution
- Tenderly config in [`cre-workflow/src/handler.ts`](cre-workflow/src/handler.ts)

### 6. thirdweb x CRE

- thirdweb `inAppWallet` with Passkey authentication
- `ConnectButton` + `useActiveAccount` in [`web/src/app/dashboard/page.tsx`](web/src/app/dashboard/page.tsx)
- thirdweb Provider in [`web/src/app/components/Providers.tsx`](web/src/app/components/Providers.tsx)

---

## Links

| Resource          | URL                                                               |
| ----------------- | ----------------------------------------------------------------- |
| Source Code       | [GitHub Repository](https://github.com/Veridex-Protocol/veridex)     |
| Demo Video        | *[YouTube — 3-5 min demo]*                                     |
| Tenderly Explorer | *[Tenderly Virtual TestNet Explorer Link]*                      |
| CRE Workflow      | [`cre-workflow/src/handler.ts`](cre-workflow/src/handler.ts)       |
| AI Worker         | [`ai-worker/index.ts`](ai-worker/index.ts)                         |
| Admin Dashboard   | [`web/src/app/dashboard/page.tsx`](web/src/app/dashboard/page.tsx) |

---

## License

MIT — see [LICENSE](LICENSE)
