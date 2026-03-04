import { createPublicClient, http, parseAbiItem, formatEther, formatGwei, type Block, type Transaction } from 'viem';
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

// ── Latest block analysis state (exposed via /api/status) ──
let latestBlockStats: {
  blockRange: string;
  blockNumbers: string[];
  totalTxCount: number;
  totalValueEth: string;
  totalGasUsed: string;
  avgGasPrice: string;
  uniqueActors: number;
  contractCalls: number;
  highValueTxs: { hash: string; from: string; to: string; valueEth: string; gasUsed: string }[];
  suspiciousTxs: { hash: string; reason: string; from: string; to: string; valueEth: string }[];
  erc20Transfers: number;
  erc20Volume: string;
  spikePercent: number;
  threatLevel: number;
  aiReasoning: string;
  timestamp: number;
} | null = null;
let blocksScanned = 0;
let threatsDetected = 0;

// Rolling baseline for volume spike detection (last 50 windows)
const volumeHistory: number[] = [];
const MAX_HISTORY = 50;

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

// ── GET /health — Simple liveness probe (for settings "Test" button) ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── GET /api/status — Full status for the dashboard ──
app.get('/api/status', (_req, res) => {
  res.json({
    monitoring: isMonitoring,
    walletActive: !!agentWallet,
    targetPool: TARGET_POOL,
    rpc: RPC_URL,
    blocksScanned,
    threatsDetected,
    latestBlockStats,
  });
});

app.listen(4000, () => {
  console.log('[Auvra Worker] API listening on port 4000');
  console.log('[Auvra Worker] Waiting for UI to provide agent session config via PASSKEY login…');
});


/**
 * Core monitoring loop — pulls REAL on-chain block & transaction data and
 * feeds it (incl. tx hashes) to the AI heuristics.
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

  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastCheckedBlock) return;

      const fromBlock = lastCheckedBlock + 1n;
      console.log(`[Auvra Worker] Processing blocks ${fromBlock}n to ${currentBlock}n`);

      // ── 1. Fetch real blocks with full transaction data ──────────
      const blockNumbers: string[] = [];
      let totalTxCount = 0;
      let totalValueWei = 0n;
      let totalGasUsed = 0n;
      let totalGasPrice = 0n;
      let gasPriceCount = 0;
      let contractCallCount = 0;
      const uniqueActors = new Set<string>();
      const highValueTxs: { hash: string; from: string; to: string; valueEth: string; gasUsed: string }[] = [];
      const suspiciousTxs: { hash: string; reason: string; from: string; to: string; valueEth: string }[] = [];
      const allTxSummaries: string[] = [];

      // Fetch every block in the range (typically ~6 blocks per 12 s cycle)
      const blockFetches: Promise<any>[] = [];
      for (let b = fromBlock; b <= currentBlock; b++) {
        blockFetches.push(
          publicClient.getBlock({ blockNumber: b, includeTransactions: true }).catch(() => null),
        );
      }
      const blocks = (await Promise.all(blockFetches)).filter(Boolean);

      lastCheckedBlock = currentBlock;
      blocksScanned++;

      for (const block of blocks) {
        blockNumbers.push(block.number!.toString());
        totalGasUsed += block.gasUsed ?? 0n;

        for (const tx of (block.transactions as any[])) {
          totalTxCount++;
          const value: bigint = tx.value ?? 0n;
          totalValueWei += value;
          uniqueActors.add(tx.from);
          if (tx.to) uniqueActors.add(tx.to);

          if (tx.gasPrice) {
            totalGasPrice += tx.gasPrice;
            gasPriceCount++;
          }

          // Contract call — has calldata beyond bare 0x
          const isContractCall = tx.input && tx.input.length > 2;
          if (isContractCall) contractCallCount++;

          // Contract creation (to == null)
          if (!tx.to) {
            suspiciousTxs.push({
              hash: tx.hash,
              reason: `Contract creation in block #${block.number}`,
              from: tx.from,
              to: 'CONTRACT_CREATE',
              valueEth: formatEther(value),
            });
          }

          const valueEth = Number(formatEther(value));

          // High-value tx (> 0.01 ETH — meaningful on testnet)
          if (valueEth > 0.01) {
            highValueTxs.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || 'CONTRACT_CREATE',
              valueEth: valueEth.toFixed(6),
              gasUsed: tx.gas?.toString() || '0',
            });
          }

          // Complex contract interaction — high gas limit
          if (tx.gas && tx.gas > 500_000n && !suspiciousTxs.find(s => s.hash === tx.hash)) {
            suspiciousTxs.push({
              hash: tx.hash,
              reason: `High gas limit ${tx.gas.toString()} — complex interaction in block #${block.number}`,
              from: tx.from,
              to: tx.to || 'CONTRACT_CREATE',
              valueEth: formatEther(value),
            });
          }

          // Large contract calldata (> 1 KB) – potential exploit payload
          if (isContractCall && tx.input.length > 2048 && !suspiciousTxs.find(s => s.hash === tx.hash)) {
            suspiciousTxs.push({
              hash: tx.hash,
              reason: `Large calldata (${(tx.input.length / 2).toLocaleString()} bytes) — potential exploit payload`,
              from: tx.from,
              to: tx.to || 'CONTRACT_CREATE',
              valueEth: formatEther(value),
            });
          }

          // Transaction summary for AI prompt (cap at 25)
          if (allTxSummaries.length < 25) {
            allTxSummaries.push(
              `  tx_hash=${tx.hash} block=#${block.number} from=${tx.from} to=${tx.to || 'CREATE'} value=${formatEther(value)}ETH gas=${tx.gas?.toString() || '?'} input_bytes=${tx.input ? (tx.input.length - 2) / 2 : 0}`,
            );
          }
        }
      }

      const totalValueEth = formatEther(totalValueWei);
      const avgGasPrice = gasPriceCount > 0
        ? formatGwei(totalGasPrice / BigInt(gasPriceCount))
        : '0';
      const blockRangeStr = fromBlock === currentBlock
        ? `#${currentBlock}`
        : `#${fromBlock}–#${currentBlock}`;

      // ── Push block scan summary ─────────────────────────────────
      await pushEvent(
        'info',
        `Block ${blockRangeStr} — ${totalTxCount} txs, ${uniqueActors.size} actors, ` +
        `${Number(totalValueEth).toFixed(4)} ETH, ${contractCallCount} contract calls` +
        (highValueTxs.length ? `, ${highValueTxs.length} high-value` : '') +
        (suspiciousTxs.length ? `, ${suspiciousTxs.length} suspicious` : ''),
      );

      // ── Log real tx hashes to stdout ────────────────────────────
      if (highValueTxs.length > 0) {
        console.log(`[Auvra Worker] High-value txs (${highValueTxs.length}):`);
        highValueTxs.slice(0, 5).forEach(t =>
          console.log(`  ${t.hash}  ${t.from.slice(0, 10)}…→${t.to.slice(0, 10)}…  ${t.valueEth} ETH`),
        );
      }
      if (suspiciousTxs.length > 0) {
        console.log(`[Auvra Worker] Suspicious txs (${suspiciousTxs.length}):`);
        suspiciousTxs.slice(0, 5).forEach(t =>
          console.log(`  ${t.hash}  ${t.reason}`),
        );
      }

      // ── Volume spike detection using rolling baseline ───────────
      const currentVolume = Number(totalValueEth);
      volumeHistory.push(currentVolume);
      if (volumeHistory.length > MAX_HISTORY) volumeHistory.shift();
      const baseline = volumeHistory.length > 1
        ? volumeHistory.slice(0, -1).reduce((a, b) => a + b, 0) / (volumeHistory.length - 1)
        : currentVolume || 0.0001;
      const spikePercent = baseline > 0 ? (currentVolume / baseline) * 100 : 0;

      // ── Demo injection — overlay on real data every ~30 s ───────
      const isDemoExploit = currentBlock % 10n === 0n;
      if (isDemoExploit) {
        console.log('[Auvra Worker] Injecting demo Flash Loan signature…');
        const demoHash = `0xdead${currentBlock.toString(16).padStart(56, '0').slice(0, 56)}`;
        highValueTxs.unshift({
          hash: demoHash,
          from: '0xA1B2c3D4e5F60718293a4B5c6D7e8F9012345678',
          to: TARGET_POOL,
          valueEth: '50000.000000',
          gasUsed: '3000000',
        });
        suspiciousTxs.unshift({
          hash: demoHash,
          reason: `Flash loan: 50,000 ETH single-block spike in #${currentBlock} — atomic borrow→exploit→repay pattern`,
          from: '0xA1B2c3D4e5F60718293a4B5c6D7e8F9012345678',
          to: TARGET_POOL,
          valueEth: '50000.000000',
        });
        await pushEvent('warning', `⚠ Flash Loan sig block #${currentBlock} — tx ${demoHash.slice(0, 18)}…`);
      }

      // ── Skip AI on empty blocks with no demo ────────────────────
      if (totalTxCount === 0 && !isDemoExploit) {
        latestBlockStats = {
          blockRange: blockRangeStr,
          blockNumbers,
          totalTxCount: 0,
          totalValueEth: '0',
          totalGasUsed: totalGasUsed.toString(),
          avgGasPrice,
          uniqueActors: 0,
          contractCalls: 0,
          highValueTxs: [],
          suspiciousTxs: [],
          erc20Transfers: 0,
          erc20Volume: '0',
          spikePercent: 0,
          threatLevel: 0,
          aiReasoning: 'No transactions in block range.',
          timestamp: Date.now(),
        };
        return; // quiet cycle
      }

      // ── 2. Build rich AI context with real tx hashes ────────────
      const aiContext = [
        `Block Range: ${fromBlock} – ${currentBlock}`,
        `Blocks Analyzed: [${blockNumbers.join(', ')}]`,
        `Total Transactions: ${totalTxCount}`,
        `Total Value Transferred: ${totalValueEth} ETH`,
        `Total Gas Used: ${totalGasUsed.toString()}`,
        `Average Gas Price: ${avgGasPrice} Gwei`,
        `Unique Actors: ${uniqueActors.size}`,
        `Contract Calls: ${contractCallCount}`,
        `Volume vs Baseline (${volumeHistory.length - 1}-window MA): ${spikePercent.toFixed(2)}%`,
        '',
        `── High-Value Transactions (${highValueTxs.length}) ──`,
        highValueTxs.length > 0
          ? highValueTxs.slice(0, 10).map(t =>
              `  tx_hash=${t.hash}  from=${t.from}  to=${t.to}  value=${t.valueEth}ETH  gas=${t.gasUsed}`,
            ).join('\n')
          : '  (none)',
        '',
        `── Suspicious Transactions (${suspiciousTxs.length}) ──`,
        suspiciousTxs.length > 0
          ? suspiciousTxs.slice(0, 10).map(t =>
              `  tx_hash=${t.hash}  reason="${t.reason}"  from=${t.from}  to=${t.to}  value=${t.valueEth}ETH`,
            ).join('\n')
          : '  (none)',
        '',
        `── Full Transaction Log (sample of ${allTxSummaries.length}/${totalTxCount}) ──`,
        allTxSummaries.length > 0 ? allTxSummaries.join('\n') : '  (empty blocks)',
      ].join('\n');

      console.log('[Auvra Worker] Evaluated timeslice. Running AI risk heuristic…');

      // ── 3. Query the heuristic model ────────────────────────────
      let threatOutcome = { threatLevel: 0, reasoning: '', action: 'none', confidence: 0 };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze this on-chain timeslice. ALWAYS reference specific tx_hash values from the data in your reasoning:\n${aiContext}`,
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
            ? {
                threatLevel: 0.95,
                reasoning: `Deterministic fallback: Flash loan signature detected in block #${currentBlock}. ` +
                  (suspiciousTxs[0]?.hash ? `Flagged tx: ${suspiciousTxs[0].hash}` : ''),
                action: 'pause()',
                confidence: 0.9,
              }
            : { threatLevel: 0.1, reasoning: 'Normal operations. No anomalous patterns.', action: 'none', confidence: 0.8 };
        } else {
          throw err;
        }
      }

      console.log(`[Auvra Worker] AI Analysis > Threat Level: ${threatOutcome.threatLevel}`);
      console.log(`[Auvra Worker] AI Reasoning: ${threatOutcome.reasoning}`);
      if (suspiciousTxs.length > 0) {
        console.log(`[Auvra Worker] Flagged tx_hashes:`);
        suspiciousTxs.slice(0, 5).forEach(t => console.log(`  → ${t.hash}  (${t.reason.slice(0, 60)})`));
      }

      // ── 4. Update tracked stats (matches declared type) ────────
      latestBlockStats = {
        blockRange: blockRangeStr,
        blockNumbers,
        totalTxCount,
        totalValueEth,
        totalGasUsed: totalGasUsed.toString(),
        avgGasPrice,
        uniqueActors: uniqueActors.size,
        contractCalls: contractCallCount,
        highValueTxs: highValueTxs.slice(0, 10),
        suspiciousTxs: suspiciousTxs.slice(0, 10),
        erc20Transfers: 0,
        erc20Volume: '0',
        spikePercent,
        threatLevel: threatOutcome.threatLevel,
        aiReasoning: threatOutcome.reasoning,
        timestamp: Date.now(),
      };

      // Push AI analysis to dashboard event log
      const lvl = threatOutcome.threatLevel;
      const evtType = lvl >= 0.8 ? 'warning' : 'info';
      await pushEvent(
        evtType,
        `AI Analysis (${blockRangeStr}): threat=${lvl.toFixed(2)}, txs=${totalTxCount}, actors=${uniqueActors.size}` +
        (suspiciousTxs.length ? ` — flagged: ${suspiciousTxs.map(t => t.hash.slice(0, 14) + '…').join(', ')}` : '') +
        ` — ${threatOutcome.reasoning.slice(0, 120)}`,
      );

      if (threatOutcome.threatLevel >= 0.8) threatsDetected++;

      // ── 5. If critical, trigger the CRE workflow via x402 ──────
      if (threatOutcome.threatLevel >= 0.8 && threatOutcome.action === 'pause()') {
        console.log('[Auvra Worker] CRITICAL THREAT. Triggering CRE safeguard…');
        await pushEvent('warning', `CRITICAL threat (${threatOutcome.threatLevel.toFixed(2)}). Triggering CRE Workflow…`);

        const payload = {
          targetProtocol: TARGET_POOL,
          threatLevel: threatOutcome.threatLevel,
          action: threatOutcome.action,
          reasoning: threatOutcome.reasoning,
          flaggedTxs: suspiciousTxs.slice(0, 5).map(t => ({ hash: t.hash, reason: t.reason })),
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