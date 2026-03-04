"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Fingerprint, Activity, Server, FileCode, CheckCircle2, ChevronRight, Lock, Key, BarChart3 } from "lucide-react";
import { IDKitRequestWidget, type IDKitResult, orbLegacy } from "@worldcoin/idkit";
import type { RpContext } from "@worldcoin/idkit-core";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import { useVeridexPasskey } from "../lib/useVeridexPasskey";
import type { PasskeyCredential } from "../lib/useVeridexPasskey";
import DashboardNav from "../components/DashboardNav";
import { useSession } from "../components/SessionContext";

const client = createThirdwebClient({
    clientId: "b80fbbad9e9de04bc04c4af4eebdc0cb",
});

const wallets = [
    inAppWallet({
        auth: {
            options: ["passkey"],
        },
    }),
];

type WorkflowState = 'idle' | 'detecting' | 'simulating' | 'awaiting-approval' | 'verifying' | 'secured';

export default function Dashboard() {
    const activeAccount = useActiveAccount();
    const veridex = useVeridexPasskey();
    const session = useSession();

    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [thirdwebFailed, setThirdwebFailed] = useState(false);
    const [currentState, setCurrentState] = useState<WorkflowState>('idle');
    const [worldIdOpen, setWorldIdOpen] = useState(false);
    const [rpContext, setRpContext] = useState<RpContext | null>(null);
    const [worldIdLoading, setWorldIdLoading] = useState(false);
    const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastEventCount = useRef(0);

    // Live block stats from the AI worker
    const [workerStats, setWorkerStats] = useState<{
        monitoring: boolean;
        blocksScanned: number;
        threatsDetected: number;
        latestBlockStats: {
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
            spikePercent: number;
            threatLevel: number;
            aiReasoning: string;
            timestamp: number;
        } | null;
    } | null>(null);

    const addLog = useCallback((msg: string, type: string = "info") => {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { msg, type, time }]);
    }, []);

    const AI_WORKER_URL = session.settings.aiWorkerUrl;

    // ── Thirdweb passkey path (primary) ─────────────────
    useEffect(() => {
        if (activeAccount && !session.isAuthenticated) {
            handleThirdwebLogin(activeAccount.address);
        }
    }, [activeAccount, session.isAuthenticated]);

    /**
     * Send real or derived credential to the AI worker + push bootstrap events.
     */
    async function bootstrapSession(
        cred: { credentialId: string; publicKeyX: string; publicKeyY: string; keyHash: string },
        address: string,
        method: 'thirdweb' | 'veridex',
    ) {
        // Send credential to AI worker
        try {
            await fetch(`${AI_WORKER_URL}/api/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cred),
            });
        } catch {
            console.warn("AI worker config endpoint offline. Continuing in observe mode.");
        }

        // Push bootstrap events to the workflow store
        try {
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'success', message: `Authenticated as Admin. Vault: ${address}`, source: 'system' }),
            });
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'info', message: 'Auvra AI Worker initialised. Monitoring Base Sepolia…', source: 'ai-worker' }),
            });
        } catch {
            // Non-critical
        }

        session.login(cred, address, method);
        addLog(`Authenticated as Admin. Vault: ${address}`, "success");
        addLog("System initialized. Auvra AI active.", "info");
        startPolling();
    }

    /**
     * Thirdweb passkey → derive synthetic credential from wallet address.
     */
    async function handleThirdwebLogin(address: string) {
        setIsAuthenticating(true);
        try {
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(address));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const sessionCredential = {
                credentialId: `auvra-session-${address.slice(2, 10)}`,
                publicKeyX: `0x${hex.slice(0, 64)}`,
                publicKeyY: `0x${hex.slice(32, 64)}${hex.slice(0, 32)}`,
                keyHash: `0x${hex}`,
            };
            await bootstrapSession(sessionCredential, address, 'thirdweb');
        } catch (err) {
            console.error("Thirdweb passkey login failed:", err);
            setThirdwebFailed(true);
        } finally {
            setIsAuthenticating(false);
        }
    }

    /**
     * Veridex SDK passkey → real WebAuthn credential via PasskeyManager.
     */
    async function handleVeridexRegister() {
        setIsAuthenticating(true);
        try {
            const cred = await veridex.register("auvra-admin");
            const agentCred = veridex.toAgentConfig(cred);
            // Use the keyHash as a deterministic vault address stand-in
            const address = `0x${cred.keyHash.slice(2, 42)}`;
            await bootstrapSession(agentCred, address, 'veridex');
        } catch (err) {
            console.error("Veridex register failed:", err);
        } finally {
            setIsAuthenticating(false);
        }
    }

    async function handleVeridexAuthenticate() {
        setIsAuthenticating(true);
        try {
            const cred = await veridex.authenticate();
            const agentCred = veridex.toAgentConfig(cred);
            const address = `0x${cred.keyHash.slice(2, 42)}`;
            await bootstrapSession(agentCred, address, 'veridex');
        } catch (err) {
            console.error("Veridex authenticate failed:", err);
        } finally {
            setIsAuthenticating(false);
        }
    }

    /**
     * Poll /api/status every 2 s for new workflow events and ticket state.
     * Also poll the AI worker /api/status for live block stats.
     */
    const startPolling = () => {
        if (pollRef.current) return;
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();

                // Append any new events
                if (data.events && data.events.length > lastEventCount.current) {
                    const newEvents = data.events.slice(lastEventCount.current);
                    for (const ev of newEvents) {
                        addLog(ev.message, ev.type);
                    }
                    lastEventCount.current = data.events.length;
                }

                // Drive UI state from ticket
                if (data.latestTicket) {
                    const t = data.latestTicket;
                    switch (t.status) {
                        case 'pending_simulation':
                            setCurrentState('simulating');
                            break;
                        case 'pending_human_approval':
                            setCurrentState('awaiting-approval');
                            break;
                        case 'approved':
                            setCurrentState('verifying');
                            break;
                        case 'executed':
                            setCurrentState('secured');
                            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                            break;
                        case 'rejected':
                            setCurrentState('idle');
                            break;
                    }
                }
            } catch {
                // Silently retry
            }

            // Poll AI worker for live block stats
            try {
                const workerRes = await fetch(`${AI_WORKER_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
                if (workerRes.ok) {
                    const ws = await workerRes.json();
                    setWorkerStats(ws);
                }
            } catch {
                // Worker offline — no-op
            }
        }, 2000);
    };

    // Start polling whenever session becomes authenticated (covers both fresh
    // login AND page-reload with a persisted session from localStorage).
    useEffect(() => {
        if (session.isAuthenticated) {
            // Seed bootstrap logs if this is a restored session (logs are empty)
            if (logs.length === 0 && session.vaultAddress) {
                addLog(`Session restored. Vault: ${session.vaultAddress}`, "success");
                addLog("Auvra AI Worker active. Polling for events…", "info");
            }
            startPolling();
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [session.isAuthenticated]);

    /**
     * World ID onSuccess — submit proof to /api/approve for real verification.
     */
    const onSuccess = async (result: IDKitResult) => {
        setWorldIdOpen(false);
        setCurrentState('verifying');
        addLog(
            `World ID Proof generated for ${(result as any)?.nullifier_hash?.substring(0, 8) || 'xxxx'}… verifying off-chain…`,
            "info",
        );

        try {
            const res = await fetch('/api/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ worldIdProof: result }),
            });
            const data = await res.json();

            if (data.status === 'approved') {
                addLog("Biometric Proof Validated across DON.", "success");
                addLog("CRE EVMClient executing pause() on Base Sepolia…", "info");
                // Polling will pick up 'executed' state
            } else {
                addLog(`Verification failed: ${data.error || 'Unknown error'}`, "error");
            }
        } catch {
            addLog("Failed to submit World ID proof.", "error");
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950">
            <DashboardNav />

            <main className="flex-1 min-h-screen overflow-y-auto">
                {!session.isAuthenticated ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-[80vh] max-w-lg mx-auto text-center px-6"
                >
                    <div className="p-6 rounded-full bg-cyan-900/20 border border-cyan-500/30 mb-8 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
                        <Lock className="w-16 h-16 text-cyan-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Auvra Admin</h1>
                    <p className="text-slate-400 mb-10 text-lg">
                        Authenticate with your secure Passkey to access the dashboard and deploy the Auvra AI Worker on-chain.
                    </p>

                    {/* Primary: thirdweb passkey */}
                    {!thirdwebFailed && (
                        <div className="flex flex-col gap-4 w-full items-center">
                            <ConnectButton client={client} wallets={wallets} />
                        </div>
                    )}

                    {/* Fallback / alternative: Veridex SDK native passkey */}
                    {(thirdwebFailed || true) && (
                        <div className={`flex flex-col gap-3 w-full items-center ${!thirdwebFailed ? 'mt-6 pt-6 border-t border-slate-800' : ''}`}>
                            {!thirdwebFailed && (
                                <span className="text-xs text-slate-500 mb-1">or use Veridex native passkey</span>
                            )}
                            {thirdwebFailed && (
                                <p className="text-sm text-amber-400 mb-2">thirdweb passkey unavailable — use Veridex native auth</p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleVeridexRegister}
                                    disabled={veridex.loading || isAuthenticating}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    <Key className="w-4 h-4" /> Register Passkey
                                </button>
                                <button
                                    onClick={handleVeridexAuthenticate}
                                    disabled={veridex.loading || isAuthenticating}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-cyan-600 text-cyan-400 hover:bg-cyan-900/30 font-medium transition-colors disabled:opacity-50"
                                >
                                    <Fingerprint className="w-4 h-4" /> Sign In
                                </button>
                            </div>
                            {veridex.error && (
                                <p className="text-xs text-red-400 mt-1">{veridex.error}</p>
                            )}
                        </div>
                    )}

                    {isAuthenticating && (
                        <p className="mt-6 text-sm text-cyan-400 animate-pulse">
                            Securely provisioning x402 payment session...
                        </p>
                    )}
                </motion.div>
            ) : (
                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 lg:py-10">

                    {/* Left Column: Flow & Action */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Shield className="text-cyan-400" /> Live Threat Center
                                </h2>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-slate-500">Active Vault</span>
                                    <span className="text-sm font-mono text-slate-300">{session.vaultAddress?.substring(0, 6)}...{session.vaultAddress?.substring(session.vaultAddress.length - 4)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-slate-950 rounded-xl border border-slate-800 mb-6 relative overflow-hidden">
                                {currentState === 'detecting' && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
                                <div className="flex flex-col z-10">
                                    <span className="text-sm text-slate-400 font-medium">Target Protocol</span>
                                    <span className="text-lg font-mono">{session.settings.targetProtocol} (Base)</span>
                                </div>
                                <Activity className={`w-8 h-8 z-10 ${currentState === 'secured' ? 'text-emerald-500' : 'text-cyan-500 animate-pulse'}`} />
                                <div className="flex flex-col text-right z-10">
                                    <span className="text-sm text-slate-400 font-medium">Status</span>
                                    <span className="text-lg font-bold text-amber-400">
                                        {currentState === 'idle' && "Monitoring"}
                                        {currentState === 'detecting' && "Threat Evaluating"}
                                        {currentState === 'simulating' && "Simulating Sandbox"}
                                        {currentState === 'awaiting-approval' && "Pending Human Intel"}
                                        {currentState === 'verifying' && "Executing Payload"}
                                        {currentState === 'secured' && <span className="text-emerald-400">Secured</span>}
                                    </span>
                                </div>
                            </div>

                            {/* Approval Modal Area */}
                            <AnimatePresence mode="popLayout">
                                {currentState === 'awaiting-approval' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-8 border border-amber-500/30 bg-amber-950/20 rounded-xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                                        <h3 className="text-xl font-bold mb-2">High Severity Execution Paused</h3>
                                        <p className="text-slate-300 mb-6">
                                            Autonomous execution halted. A protocol-level `pause()` modifies critical state. Verify identity with World ID to execute.
                                        </p>

                                        <div className="flex items-center gap-4">
                                            <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-400">
                                                Vault: {session.vaultAddress?.substring(0, 6)}...{session.vaultAddress?.substring(session.vaultAddress.length - 4)}
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    setWorldIdLoading(true);
                                                    try {
                                                        const res = await fetch('/api/world-id-context');
                                                        const data = await res.json();
                                                        if (data.rp_context) {
                                                            setRpContext(data.rp_context);
                                                            setWorldIdOpen(true);
                                                            addLog('World ID verification widget opened. Scan QR with World App.', 'info');
                                                        } else {
                                                            addLog(`World ID context error: ${data.error || 'Unknown'}`, 'error');
                                                        }
                                                    } catch {
                                                        addLog('Failed to fetch World ID context from server.', 'error');
                                                    } finally {
                                                        setWorldIdLoading(false);
                                                    }
                                                }}
                                                disabled={worldIdLoading}
                                                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                                            >
                                                <Fingerprint className={`w-5 h-5 ${worldIdLoading ? 'animate-spin' : ''}`} />
                                                {worldIdLoading ? 'Connecting…' : 'Sign with World ID'}
                                            </button>

                                            {rpContext && (
                                                <IDKitRequestWidget
                                                    preset={orbLegacy()}
                                                    app_id={(process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID || 'app_staging_046c82361ac133f67ba0d7389c926c48') as `app_${string}`}
                                                    action={process.env.NEXT_PUBLIC_WORLDCOIN_ACTION || 'verify-admin'}
                                                    rp_context={rpContext}
                                                    allow_legacy_proofs={true}
                                                    onSuccess={onSuccess}
                                                    open={worldIdOpen}
                                                    onOpenChange={setWorldIdOpen}
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {currentState === 'secured' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-8 border border-emerald-500/30 bg-emerald-950/20 rounded-xl flex flex-col items-center justify-center text-center"
                                    >
                                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                                        <h3 className="text-2xl font-bold text-emerald-400 mb-2">Protocol Secured</h3>
                                        <p className="text-slate-300">
                                            The exploit vectors were closed safely without downtime to normal users.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Live Block Analysis Panel */}
                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-400" /> Block Analysis</h3>
                                    {workerStats?.monitoring && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                </div>
                                <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-400 overflow-y-auto max-h-72 border border-white/5">
                                    {!workerStats?.latestBlockStats ? (
                                        <div className="space-y-2">
                                            <span className="opacity-50">{workerStats?.monitoring ? 'Scanning blocks…' : 'Worker offline — start AI Worker to begin analysis'}</span>
                                            {workerStats && (
                                                <div className="pt-2 border-t border-slate-800">
                                                    <p>Blocks scanned: <span className="text-slate-300">{workerStats.blocksScanned}</span></p>
                                                    <p>Threats detected: <span className="text-amber-400">{workerStats.threatsDetected}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-cyan-400">{'>'} Block {workerStats.latestBlockStats.blockRange}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                                                <p>Transactions:</p>
                                                <p className="text-slate-300 text-right">{workerStats.latestBlockStats.totalTxCount}</p>
                                                <p>Actors:</p>
                                                <p className="text-slate-300 text-right">{workerStats.latestBlockStats.uniqueActors}</p>
                                                <p>Value:</p>
                                                <p className="text-slate-300 text-right truncate" title={workerStats.latestBlockStats.totalValueEth}>{Number(workerStats.latestBlockStats.totalValueEth).toFixed(4)} ETH</p>
                                                <p>Gas Used:</p>
                                                <p className="text-slate-300 text-right">{Number(workerStats.latestBlockStats.totalGasUsed).toLocaleString()}</p>
                                                <p>Avg Gas Price:</p>
                                                <p className="text-slate-300 text-right">{Number(workerStats.latestBlockStats.avgGasPrice).toFixed(2)} Gwei</p>
                                                <p>Contract Calls:</p>
                                                <p className="text-slate-300 text-right">{workerStats.latestBlockStats.contractCalls}</p>
                                                <p>Spike:</p>
                                                <p className={`text-right ${workerStats.latestBlockStats.spikePercent > 500 ? 'text-red-400' : workerStats.latestBlockStats.spikePercent > 100 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                    {workerStats.latestBlockStats.spikePercent.toFixed(0)}%
                                                </p>
                                            </div>
                                            {workerStats.latestBlockStats.suspiciousTxs.length > 0 && (
                                                <div className="pt-2 border-t border-slate-800">
                                                    <p className="text-red-400 mb-1">Suspicious Txs:</p>
                                                    {workerStats.latestBlockStats.suspiciousTxs.slice(0, 3).map((tx, i) => (
                                                        <div key={i} className="mb-1">
                                                            <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                                                                {tx.hash.slice(0, 18)}…
                                                            </a>
                                                            <span className="text-slate-500 ml-1 text-[10px]">{tx.reason.slice(0, 50)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {workerStats.latestBlockStats.highValueTxs.length > 0 && (
                                                <div className="pt-2 border-t border-slate-800">
                                                    <p className="text-amber-400 mb-1">High-Value Txs:</p>
                                                    {workerStats.latestBlockStats.highValueTxs.slice(0, 3).map((tx, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                                                {tx.hash.slice(0, 14)}…
                                                            </a>
                                                            <span className="text-slate-300">{Number(tx.valueEth).toFixed(4)} ETH</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="pt-2 border-t border-slate-800">
                                                <p className={`${workerStats.latestBlockStats.threatLevel >= 0.8 ? 'text-red-400' : workerStats.latestBlockStats.threatLevel >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    ↳ Threat: {workerStats.latestBlockStats.threatLevel.toFixed(2)}
                                                </p>
                                                <p className="text-slate-500 mt-1 leading-snug">
                                                    ↳ {workerStats.latestBlockStats.aiReasoning.slice(0, 120)}{workerStats.latestBlockStats.aiReasoning.length > 120 ? '…' : ''}
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-slate-800 flex justify-between">
                                                <span>Total scanned:</span>
                                                <span className="text-slate-300">{workerStats.blocksScanned}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-400" /> Auvra Agent</h3>
                                </div>
                                <div className="flex-1 bg-slate-950 rounded-lg p-4 flex flex-col justify-center border border-white/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-slate-400">Total Spent</span>
                                        <span className="font-mono text-cyan-400">0.05 USDC</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-slate-400">Session Limit</span>
                                        <span className="font-mono text-slate-300">1.00 USDC</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: currentState !== 'idle' ? "5%" : "0%" }}
                                            className="bg-cyan-500 h-2 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 text-center uppercase tracking-wider">x402 Authed via Passkey</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: execution logs */}
                    <div className="flex flex-col h-[800px] p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <FileCode className="text-cyan-400" /> System Logs
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {logs.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`p-3 rounded-lg border text-sm font-mono ${log.type === 'error' ? 'bg-red-950/30 border-red-500/20 text-red-400' :
                                            log.type === 'warning' ? 'bg-amber-950/30 border-amber-500/20 text-amber-400' :
                                                log.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' :
                                                    'bg-slate-950/50 border-white/5 text-slate-300'
                                            }`}
                                    >
                                        <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                            <ChevronRight className="w-3 h-3" /> {log.time}
                                        </div>
                                        {log.msg}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {currentState !== 'secured' && (
                                <div className="flex gap-1 items-center text-slate-500 text-xs py-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}
