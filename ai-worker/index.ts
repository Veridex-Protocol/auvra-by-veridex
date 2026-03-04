import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { GoogleGenAI } from '@google/genai';
import { createAgentWallet } from '@veridex/agentic-payments';
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

// ── Configuration ────────────────────────────────────
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const TARGET_POOL = process.env.TARGET_POOL || '0x0000000000000000000000000000000000000000';
const CRE_WORKFLOW_URL = process.env.CRE_WORKFLOW_URL || 'http://localhost:3000/api/trigger';
const WEB_BASE_URL = CRE_WORKFLOW_URL.replace('/api/trigger', '');
const CHECK_INTERVAL_MS = 12_000; // ~6 Base Sepolia blocks

// ── Blockchain Client ────────────────────────────────
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ── Gemini AI ────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// ERC20 Transfer Event ABI
const transferEventAbi = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

/**
 * Enterprise Risk Heuristic – System Prompt
 */
const SYSTEM_PROMPT = `
You are Auvra AI, an elite, enterprise-grade Protocol Risk Analyst operating exclusively on-chain to safeguard DeFi liquidity pools and critical infrastructure. 
Your mandate is to critically evaluate real-time timeslices of a DeFi liquidity pool and detect sophisticated exploits such as flash loan manipulation, oracle price distortion, reentrancy footprints, and unauthorized state manipulations.

You will receive a timeslice of block data containing:
- Recent transaction volumes & spikes
- Inbound and outbound transfer disparities
- Address interaction topology
- TVL (Total Value Locked) change velocity relative to historical baseline moving averages.

You must continuously evaluate the following Risk Accounting Factors:
1. Volume Anomaly Factor: Is the block volume exceeding normal statistical deviations (>500% spike compared to the 100-block MA)?
2. Flash-Loan & Sandwich Signatures: Look for massive capital inflows (borrowing/inbound transfers) matched with complex internal state changes and immediate capital outflows (repayment/outbound transfers) within an extremely narrow block window.
3. Slippage & Oracle Distortions: Imbalanced exchange rates detected via transfer out/in ratios compared to known baseline liquidity metrics.
4. Smart Contract Actor Anomalies: Identifiable sudden interactions from newly-created or unverified smart contracts interacting with core protocol endpoints, mimicking organic user behavior to bypass shallow heuristics.

Your Output Rule:
Based on the exact parameters provided in the context, compute a deterministic THREAT_LEVEL on a scale of 0.0 to 1.0.
Output MUST be a pure JSON object, with no markdown formatting.
Format:
{
  "threatLevel": <float>,
  "confidence": <float>,
  "reasoning": "<string detailed explanation of anomalous vectors discovered>",
  "action": "<'none' | 'pause()'>"
}
`;

// ── Express App ──────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

let isMonitoring = false;
let agentWallet: any = null;

/**
 * Push a workflow event to the web store (non-blocking, fire-and-forget).
 */
async function pushEvent(type: string, message: string, source = 'ai-worker') {
  try {
    await fetch(`${WEB_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message, source }),
    });
  } catch {
    // Non-critical – web app may not be up yet
  }
}

// ── POST /api/config — Receives credential from UI ──
app.post('/api/config', async (req, res) => {
  const { credentialId, publicKeyX, publicKeyY, keyHash } = req.body;
  try {
    console.log('[Auvra Worker] Received session config. Initializing Agent Wallet…');

    agentWallet = await createAgentWallet({
      masterCredential: {
        credentialId: credentialId || process.env.AGENT_CREDENTIAL_ID || 'hackathon-demo-id',
        publicKeyX: publicKeyX || '0x01',
        publicKeyY: publicKeyY || '0x02',
        keyHash: keyHash || '0x00',
      },
      session: {
        dailyLimitUSD: 100,
        perTransactionLimitUSD: 5,
        expiryHours: 24,
        allowedChains: [30], // Base – Wormhole chain ID
      },
    });

    console.log('[Auvra Worker] Auvra x402 Payment Session Active.');
    await pushEvent('success', 'Agent Wallet initialised. x402 session active.', 'ai-worker');

    if (!isMonitoring) {
      isMonitoring = true;
      monitorProtocol();
    }

    res.json({ success: true, message: 'Agent hydrated and monitoring started' });
  } catch (e: any) {
    console.error('[Auvra Worker] Wallet init failed:', e?.message || e);
    await pushEvent('error', `Agent Wallet init failed: ${e?.message || 'Unknown error'}`, 'ai-worker');
    res.status(500).json({ error: 'Failed to init wallet', details: e?.message });
  }
});

// ── GET /api/status — Health check for the dashboard ─
app.get('/api/status', (_req, res) => {
  res.json({
    monitoring: isMonitoring,
    walletActive: !!agentWallet,
    targetPool: TARGET_POOL,
    rpc: RPC_URL,
  });
});

app.listen(4000, () => {
  console.log('[Auvra Worker] API listening on port 4000');
  console.log('[Auvra Worker] Waiting for UI to provide agent session config via PASSKEY login…');
});


/**
 * Core monitoring loop — pulls on-chain data and feeds it to the AI heuristics.
 *
 * When a threat is detected above the 0.8 threshold, the agent uses its
 * session key (via agentWallet.fetch / x402) to trigger the CRE workflow
 * running at the web app's /api/trigger endpoint.
 */
async function monitorProtocol() {
  console.log('[Auvra Worker] Initializing Protocol Stream monitoring on Base Sepolia…');
  console.log('[Auvra Worker] Target Pool:', TARGET_POOL);
  await pushEvent('info', `Monitoring started for ${TARGET_POOL} on Base Sepolia.`);

  let lastCheckedBlock = await publicClient.getBlockNumber();

  const baselineData = {
    avgVolumePerBlock: 50n * 10n ** 18n, // 50 tokens
    tvl: 1_000_000n * 10n ** 18n,        // 1 M tokens
  };

  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastCheckedBlock) return;

      console.log('[Auvra Worker] Processing blocks', lastCheckedBlock + 1n, 'to', currentBlock);

      // 1. Gather on-chain transfer events
      const logs = await publicClient.getLogs({
        address: TARGET_POOL as `0x${string}`,
        event: transferEventAbi,
        fromBlock: lastCheckedBlock + 1n,
        toBlock: currentBlock,
      });

      lastCheckedBlock = currentBlock;

      let totalVolume = 0n;
      const uniqueActors = new Set<string>();

      logs.forEach(log => {
        if (log.args.value) totalVolume += log.args.value;
        if (log.args.from) uniqueActors.add(log.args.from);
        if (log.args.to) uniqueActors.add(log.args.to);
      });

      // For live demo: inject a synthetic flash-loan signature every ~30 s
      // so the demo video shows a full detection cycle within the time limit.
      const isDemoExploit = currentBlock % 10n === 0n;
      if (isDemoExploit) {
        console.log('[Auvra Worker] Injecting demo Flash Loan signature…');
        totalVolume = baselineData.avgVolumePerBlock * 1000n; // 100 000% spike
        uniqueActors.add('0xExploiterContract1234');
        await pushEvent('warning', 'Anomaly detected in Pool: Flash Loan volume spike.');
      }

      if (totalVolume === 0n && !isDemoExploit) return; // quiet block

      // 2. Format context for the heuristic model
      const volumeStr = formatEther(totalVolume);
      const baselineVolumeStr = formatEther(baselineData.avgVolumePerBlock);
      const spikePercent = (Number(volumeStr) / Number(baselineVolumeStr)) * 100;

      const aiContext = [
        `Block Range: ${lastCheckedBlock} - ${currentBlock}`,
        `Total Transfer Volume: ${volumeStr}`,
        `Volume Spike: ${spikePercent.toFixed(2)}%`,
        `Unique Actors in Window: ${uniqueActors.size}`,
      ].join('\n');

      console.log('[Auvra Worker] Evaluated timeslice. Running AI risk heuristic…');

      // 3. Query the heuristic model
      let threatOutcome = { threatLevel: 0, reasoning: '', action: 'none' };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze this on-chain timeslice:\n${aiContext}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        const resultStr = response.text || '{}';
        threatOutcome = JSON.parse(resultStr);
      } catch (err: any) {
        const isAuthError =
          err.message?.includes('API key') ||
          err.message?.includes('400') ||
          err.status === 400 ||
          err.status === 403;

        if (isAuthError || !process.env.GEMINI_API_KEY) {
          console.warn('[Auvra Worker] Gemini unavailable — using deterministic fallback.');
          threatOutcome = isDemoExploit
            ? { threatLevel: 0.95, reasoning: 'Deterministic: massive 100 000% volume spike indicative of flash loan.', action: 'pause()' }
            : { threatLevel: 0.1, reasoning: 'Normal operations.', action: 'none' };
        } else {
          throw err;
        }
      }

      console.log('[Auvra Worker] AI Analysis > Threat Level:', threatOutcome.threatLevel);
      console.log('[Auvra Worker] AI Reasoning:', threatOutcome.reasoning);

      // 4. If critical, trigger the CRE workflow via x402
      if (threatOutcome.threatLevel >= 0.8 && threatOutcome.action === 'pause()') {
        console.log('[Auvra Worker] CRITICAL THREAT. Triggering CRE safeguard…');
        await pushEvent('warning', `CRITICAL threat (${threatOutcome.threatLevel.toFixed(2)}). Triggering CRE Workflow…`);

        const payload = {
          targetProtocol: TARGET_POOL,
          threatLevel: threatOutcome.threatLevel,
          action: threatOutcome.action,
          reasoning: threatOutcome.reasoning,
        };

        if (agentWallet) {
          console.log('[Auvra Worker] Using Auvra Agent Wallet to pay for CRE workflow (x402)…');
          try {
            const res = await agentWallet.fetch(CRE_WORKFLOW_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            console.log('[Auvra Worker] CRE workflow response:', data);
          } catch (triggerError) {
            console.error('[Auvra Worker] CRE trigger failed:', triggerError);
            await pushEvent('error', 'CRE Workflow trigger failed. Is the orchestrator online?');
          }
        } else {
          // Fallback: trigger without x402 payment wrapping
          console.log('[Auvra Worker] Agent Wallet not active — triggering CRE directly…');
          try {
            const res = await fetch(CRE_WORKFLOW_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            console.log('[Auvra Worker] CRE workflow response (direct):', data);
          } catch (triggerError) {
            console.error('[Auvra Worker] Direct CRE trigger failed:', triggerError);
          }
        }
      } else {
        console.log('[Auvra Worker] System nominal. No action required.');
      }
    } catch (error) {
      console.error('[Auvra Worker] Block processing error:', error);
    }
  }, CHECK_INTERVAL_MS);
}