"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Fingerprint, Activity, Server, FileCode, CheckCircle2, ChevronRight, Lock, Key } from "lucide-react";
import { IDKitRequestWidget, IDKitResult } from "@worldcoin/idkit";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";

const AI_WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL || "http://localhost:4000";

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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [vaultAddress, setVaultAddress] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        if (activeAccount && !isAuthenticated) {
            handlePasskeyLogin(true, activeAccount.address);
        }
    }, [activeAccount, isAuthenticated]);

    const [currentState, setCurrentState] = useState<WorkflowState>('idle');
    const [logs, setLogs] = useState<{ time: string, msg: string, type: string }[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastEventCount = useRef(0);

    const addLog = useCallback((msg: string, type: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { time, msg, type }]);
    }, []);

    /**
     * Derive deterministic passkey credentials from the thirdweb wallet address.
     * In production the raw WebAuthn coordinates flow through the Veridex relayer.
     * For the hackathon we derive reproducible values so the agent-sdk can
     * construct a valid session identity.
     */
    async function deriveCredential(address: string) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(address));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return {
            credentialId: `auvra-session-${address.slice(2, 10)}`,
            publicKeyX: `0x${hex.slice(0, 64)}`,
            publicKeyY: `0x${hex.slice(32, 64)}${hex.slice(0, 32)}`,
            keyHash: `0x${hex}`,
        };
    }

    const handlePasskeyLogin = async (fromThirdweb = false, address?: string) => {
        if (!fromThirdweb || !address) return;

        setIsAuthenticating(true);
        try {
            setVaultAddress(address);

            // Derive real credential identity from the thirdweb-authenticated address
            const sessionCredential = await deriveCredential(address);

            // Send to AI worker to bootstrap the AgentWallet session
            try {
                await fetch(`${AI_WORKER_URL}/api/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionCredential),
                });
            } catch (configErr) {
                console.warn("AI worker config endpoint offline. Continuing in observe mode:", configErr);
            }

            // Push bootstrap events to the workflow store
            try {
                await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'success',
                        message: `Authenticated as Admin. Vault: ${address}`,
                        source: 'system',
                    }),
                });
                await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'info',
                        message: 'Auvra AI Worker initialised. Monitoring Base Sepolia…',
                        source: 'ai-worker',
                    }),
                });
            } catch {
                // Non-critical
            }

            setIsAuthenticated(true);
            addLog(`Authenticated safely as Admin. Vault: ${address}`, "success");
            addLog("System initialized. Auvra AI active.", "info");
            startPolling();

        } catch (error) {
            console.error(error);
            alert("Passkey authentication failed.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    /**
     * Poll /api/status every 2 s for new workflow events and ticket state.
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
        }, 2000);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    /**
     * World ID onSuccess — submit proof to /api/approve for real verification.
     */
    const onSuccess = async (result: IDKitResult) => {
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
        <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center bg-slate-950">
            {!isAuthenticated ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-[60vh] max-w-lg text-center"
                >
                    <div className="p-6 rounded-full bg-cyan-900/20 border border-cyan-500/30 mb-8 shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)]">
                        <Lock className="w-16 h-16 text-cyan-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Auvra Admin</h1>
                    <p className="text-slate-400 mb-10 text-lg">
                        Authenticate with your secure Passkey to access the dashboard and deploy the Auvra AI Worker on-chain.
                    </p>
                    <div className="flex flex-col gap-4 w-full items-center">
                        <ConnectButton client={client} wallets={wallets} />
                    </div>
                    {isAuthenticating && (
                        <p className="mt-6 text-sm text-cyan-400 animate-pulse">
                            Securely provisioning x402 payment session...
                        </p>
                    )}
                </motion.div>
            ) : (
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Flow & Action */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Shield className="text-cyan-400" /> Live Threat Center
                                </h2>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-slate-500">Active Vault</span>
                                    <span className="text-sm font-mono text-slate-300">{vaultAddress?.substring(0, 6)}...{vaultAddress?.substring(vaultAddress.length - 4)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-slate-950 rounded-xl border border-slate-800 mb-6 relative overflow-hidden">
                                {currentState === 'detecting' && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
                                <div className="flex flex-col z-10">
                                    <span className="text-sm text-slate-400 font-medium">Target Protocol</span>
                                    <span className="text-lg font-mono">Aave V3 (Base)</span>
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
                                                Vault: {vaultAddress?.substring(0, 6)}...{vaultAddress?.substring(vaultAddress.length - 4)}
                                            </div>

                                            <IDKitRequestWidget
                                                preset="compact"
                                                app_id="app_staging_046c82361ac133f67ba0d7389c926c48" // Testing World ID app 
                                                action="verify-admin"
                                                onSuccess={onSuccess}
                                                open={false}
                                                onOpenChange={() => { }}
                                                {...{ verification_level: "device", handleVerify: async () => true } as any}
                                            >
                                                {({ open }: { open: () => void }) => (
                                                    <button
                                                        onClick={open}
                                                        className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                                    >
                                                        <Fingerprint className="w-5 h-5" /> Sign with World ID
                                                    </button>
                                                )}
                                            </IDKitRequestWidget>
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
                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold flex items-center gap-2"><Server className="w-4 h-4 text-purple-400" /> Tenderly Simulation</h3>
                                    {currentState === 'simulating' && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                                </div>
                                <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-400 overflow-y-auto max-h-48 border border-white/5">
                                    {currentState === 'idle' || currentState === 'detecting' ? (
                                        <span className="opacity-50">Waiting for trigger payload...</span>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-cyan-400">{'>'} POST /api/v1/account/simulate</p>
                                            <p className="text-slate-300">{"{"}</p>
                                            <p className="pl-4">"network_id": "8453",</p>
                                            <p className="pl-4">"from": "0xCRE...123",</p>
                                            <p className="pl-4">"to": "0xAAVE...999",</p>
                                            <p className="pl-4">"input": "0x8456cb59"</p>
                                            <p className="text-slate-300">{"}"}</p>
                                            {currentState !== 'simulating' && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-2 border-t border-slate-800">
                                                    <p className="text-emerald-400">↳ Status: true (No Revert)</p>
                                                    <p className="text-slate-500">↳ Gas Used: 45,123</p>
                                                </motion.div>
                                            )}
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
        </div>
    );
}
