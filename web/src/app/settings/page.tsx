"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Settings,
    Server,
    Clock,
    Shield,
    Coins,
    Bell,
    Save,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Globe,
    RefreshCw,
    SlidersHorizontal,
} from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import { useSession } from "../components/SessionContext";

export default function SettingsPage() {
    const { settings, updateSettings, isAuthenticated, vaultAddress, authMethod, sessionTimeRemaining } = useSession();

    // Local form state (so we can buffer edits before saving)
    const [form, setForm] = useState({ ...settings });
    const [saved, setSaved] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "ok" | "fail">("idle");
    const [workerStats, setWorkerStats] = useState<any>(null);
    const [simulatingThreat, setSimulatingThreat] = useState(false);

    const handleSave = async () => {
        updateSettings(form);

        // Map protocols to realistic Base Sepolia contract addresses
        const protocolAddresses: Record<string, string> = {
            "Chainlink CCIP": "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93", // Router
            "Aave V3": "0x4e65fE4dA7cC207ff0F39D6cFeCca699742eA87a", // Pool
            "Compound V3": "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
            "Uniswap V4": "0x0000000000000000000000000000000000000000",
            "Morpho Blue": "0xBBBBBBBBbb000000000000000000000000000000",
        };
        const resolvedTargetPool = form.targetProtocol === "Custom"
            ? form.customTargetAddress
            : protocolAddresses[form.targetProtocol] || "0x0000000000000000000000000000000000000000";

        // Push tuning params to AI worker in real-time
        try {
            await fetch(`${form.aiWorkerUrl}/api/tuning`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    demoFrequencyBlocks: form.demoFrequencyBlocks,
                    demoFlashLoanEth: form.demoFlashLoanEth,
                    threatThreshold: form.threatThreshold,
                    aiTemperature: form.aiTemperature,
                    scanIntervalMs: form.scanIntervalMs,
                    highValueThresholdEth: form.highValueThresholdEth,
                    targetPool: resolvedTargetPool,
                    targetChain: form.targetChain,
                }),
            });
        } catch {
            // Worker might be offline — settings are saved locally regardless
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const testConnection = async () => {
        setTestingConnection(true);
        setConnectionStatus("idle");
        setWorkerStats(null);
        try {
            const res = await fetch(`${form.aiWorkerUrl}/health`, { signal: AbortSignal.timeout(5000) });
            setConnectionStatus(res.ok ? "ok" : "fail");
            if (res.ok) {
                const data = await res.json();
                try {
                    const statusRes = await fetch(`${form.aiWorkerUrl}/api/status`, { signal: AbortSignal.timeout(5000) });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        setWorkerStats({ ...statusData, uptime: data.uptime });
                    } else {
                        setWorkerStats({ uptime: data.uptime });
                    }
                } catch {
                    setWorkerStats({ uptime: data.uptime });
                }
            }
        } catch {
            setConnectionStatus("fail");
        } finally {
            setTestingConnection(false);
        }
    };

    const simulateThreat = async () => {
        setSimulatingThreat(true);
        try {
            // Push event so UI shows we're manually triggering
            await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "warning",
                    message: `Diagnostic Test: Firing synthetic threat (level 0.95) on ${form.targetProtocol}…`,
                    source: "system",
                }),
            });

            await fetch("/api/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetProtocol: form.targetProtocol,
                    threatLevel: 0.95,
                    action: "pause()",
                    reasoning: "Diagnostic Web Test: Manual user trigger from Settings panel.",
                })
            });
            setTimeout(testConnection, 1000);
        } catch (err) {
            console.error(err);
        } finally {
            setSimulatingThreat(false);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex min-h-screen bg-slate-950">
            <DashboardNav />

            <main className="flex-1 min-h-screen overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-10 lg:py-16">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                <Settings className="w-7 h-7 text-cyan-400" />
                                Settings
                            </h1>
                            <p className="text-slate-400 mt-1 text-sm">
                                Configure your Auvra deployment and session preferences.
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                        >
                            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? "Saved" : "Save Changes"}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* ── Session Status ── */}
                        {isAuthenticated && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20"
                            >
                                <h2 className="text-sm font-mono uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Session
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 mb-1">Vault Address</span>
                                        <span className="font-mono text-sm text-slate-300">
                                            {vaultAddress ? `${vaultAddress.slice(0, 8)}...${vaultAddress.slice(-6)}` : "—"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 mb-1">Auth Method</span>
                                        <span className="font-mono text-sm text-slate-300 capitalize">{authMethod || "—"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 mb-1">Time Remaining</span>
                                        <span className="font-mono text-sm text-slate-300 flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-slate-500" />
                                            {formatTime(sessionTimeRemaining)}
                                        </span>
                                    </div>
                                </div>
                            </motion.section>
                        )}

                        {/* ── AI Worker Connection ── */}
                        <SettingsSection
                            icon={<Server className="w-5 h-5 text-purple-400" />}
                            title="AI Worker"
                            description="The Auvra AI Worker endpoint that monitors on-chain events and executes risk analysis."
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Worker URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={form.aiWorkerUrl}
                                            onChange={(e) => setForm({ ...form, aiWorkerUrl: e.target.value })}
                                            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all"
                                            placeholder="http://localhost:4000"
                                        />
                                        <button
                                            onClick={testConnection}
                                            disabled={testingConnection}
                                            className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${testingConnection ? "animate-spin" : ""}`} />
                                            Test
                                        </button>
                                    </div>
                                    {connectionStatus === "ok" && (
                                        <div className="mt-4 p-4 rounded-xl bg-slate-900 shadow-inner border border-emerald-500/20 text-sm">
                                            <p className="text-emerald-400 font-bold flex items-center gap-2 mb-3">
                                                <CheckCircle2 className="w-4 h-4" /> Connected to AI Worker
                                            </p>
                                            {workerStats && (
                                                <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-xs">
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-slate-500 block mb-1">State</span>
                                                        <span className={workerStats.monitoring ? "text-emerald-400" : "text-amber-400"}>
                                                            {workerStats.monitoring ? 'Monitoring Active' : 'Idle'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-slate-500 block mb-1">Blocks Scanned</span>
                                                        <span className="text-cyan-400">{workerStats.blocksScanned ?? 0}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-slate-500 block mb-1">Threats Found</span>
                                                        <span className={workerStats.threatsDetected > 0 ? "text-amber-400" : "text-slate-300"}>
                                                            {workerStats.threatsDetected ?? 0}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-slate-500 block mb-1">Uptime</span>
                                                        <span className="text-slate-300">{Math.floor(workerStats.uptime || 0)}s</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {connectionStatus === "fail" && (
                                        <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-sm">
                                            <p className="text-red-400 font-bold flex items-center gap-2 mb-1">
                                                <AlertTriangle className="w-4 h-4" /> Connection failed
                                            </p>
                                            <p className="text-rose-200/50 mt-1 text-xs ml-6">Verify the worker is running on {form.aiWorkerUrl}</p>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col gap-3 sm:flex-row justify-between sm:items-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-300 font-medium">Synthetic Threat Pipeline</span>
                                            <span className="text-xs text-slate-500">Injects a 0.95 severity anomaly to test workflow.</span>
                                        </div>
                                        <button
                                            onClick={simulateThreat}
                                            disabled={simulatingThreat || connectionStatus !== "ok"}
                                            className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-2 font-medium shrink-0"
                                        >
                                            <Zap className={`w-4 h-4 ${simulatingThreat ? "animate-pulse" : ""}`} />
                                            {simulatingThreat ? "Simulating…" : "Fire Test Vector"}
                                        </button>
                                    </div>
                                </div>

                                <ToggleField
                                    label="Auto-Trigger Detection"
                                    description="Automatically start the risk analysis pipeline when threats are detected."
                                    checked={form.autoTrigger}
                                    onChange={(v) => setForm({ ...form, autoTrigger: v })}
                                />
                            </div>
                        </SettingsSection>

                        {/* ── Target Configuration ── */}
                        <SettingsSection
                            icon={<Globe className="w-5 h-5 text-blue-400" />}
                            title="Target Protocol"
                            description="The DeFi protocol and chain the Auvra agent is monitoring for exploits."
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Protocol
                                    </label>
                                    <select
                                        value={form.targetProtocol}
                                        onChange={(e) => setForm({ ...form, targetProtocol: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-300 focus:border-cyan-500 outline-none appearance-none"
                                    >
                                        <option value="Chainlink CCIP">Chainlink CCIP</option>
                                        <option value="Aave V3">Aave V3</option>
                                        <option value="Compound V3">Compound V3</option>
                                        <option value="Uniswap V4">Uniswap V4</option>
                                        <option value="Morpho Blue">Morpho Blue</option>
                                        <option value="Custom">Custom Contract</option>
                                    </select>
                                    {form.targetProtocol === "Custom" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="mt-4"
                                        >
                                            <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                                Contract Address
                                            </label>
                                            <input
                                                type="text"
                                                value={form.customTargetAddress || ""}
                                                onChange={(e) => setForm({ ...form, customTargetAddress: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all"
                                                placeholder="0x..."
                                            />
                                        </motion.div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Chain
                                    </label>
                                    <select
                                        value={form.targetChain}
                                        onChange={(e) => setForm({ ...form, targetChain: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-300 focus:border-cyan-500 outline-none appearance-none"
                                    >
                                        <option value="Base Sepolia">Base Sepolia</option>
                                        <option value="Base Mainnet">Base Mainnet</option>
                                        <option value="Ethereum Mainnet">Ethereum Mainnet</option>
                                        <option value="Arbitrum One">Arbitrum One</option>
                                        <option value="Polygon">Polygon</option>
                                    </select>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* ── Session Security ── */}
                        <SettingsSection
                            icon={<Shield className="w-5 h-5 text-amber-400" />}
                            title="Session & Security"
                            description="Control session timeouts and authentication behavior."
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Session Timeout (minutes)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={5}
                                            max={120}
                                            step={5}
                                            value={form.sessionTimeoutMinutes}
                                            onChange={(e) =>
                                                setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-cyan-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-16 text-right">
                                            {form.sessionTimeoutMinutes} min
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Auto-disconnects after this period of inactivity.
                                    </p>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* ── Agent Wallet ── */}
                        <SettingsSection
                            icon={<Coins className="w-5 h-5 text-emerald-400" />}
                            title="Agent Wallet (x402)"
                            description="Configure the autonomous micropayment limits for the Auvra agent."
                        >
                            <div>
                                <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                    Session Spend Limit (USDC)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min={0.1}
                                        max={10}
                                        step={0.1}
                                        value={form.agentSpendLimitUsdc}
                                        onChange={(e) =>
                                            setForm({ ...form, agentSpendLimitUsdc: Number(e.target.value) })
                                        }
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <span className="text-sm font-mono text-slate-300 w-20 text-right">
                                        {form.agentSpendLimitUsdc.toFixed(1)} USDC
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                    Maximum the agent can spend per session on inference and CRE compute.
                                </p>
                            </div>
                        </SettingsSection>

                        {/* ── Demo Tuning ── */}
                        <SettingsSection
                            icon={<SlidersHorizontal className="w-5 h-5 text-rose-400" />}
                            title="Detection Tuning"
                            description="Adjust AI worker parameters in real-time. Changes are pushed to the running worker on save."
                        >
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Demo Exploit Frequency (every N blocks)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={0}
                                            max={30}
                                            step={1}
                                            value={form.demoFrequencyBlocks}
                                            onChange={(e) =>
                                                setForm({ ...form, demoFrequencyBlocks: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-rose-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-20 text-right">
                                            {form.demoFrequencyBlocks === 0 ? "OFF" : `${form.demoFrequencyBlocks} blk`}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        How often to inject a synthetic flash-loan signature. 0 = disabled.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Flash Loan Amount (ETH)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={100}
                                            max={500000}
                                            step={100}
                                            value={form.demoFlashLoanEth}
                                            onChange={(e) =>
                                                setForm({ ...form, demoFlashLoanEth: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-rose-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-24 text-right">
                                            {form.demoFlashLoanEth.toLocaleString()} ETH
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Threat Threshold (triggers CRE)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={0.1}
                                            max={1.0}
                                            step={0.05}
                                            value={form.threatThreshold}
                                            onChange={(e) =>
                                                setForm({ ...form, threatThreshold: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-amber-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-16 text-right">
                                            {form.threatThreshold.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        AI scores above this value trigger the CRE safeguard workflow.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        AI Temperature
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={form.aiTemperature}
                                            onChange={(e) =>
                                                setForm({ ...form, aiTemperature: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-purple-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-16 text-right">
                                            {form.aiTemperature.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Lower = more deterministic analysis. Higher = more varied reasoning.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        Scan Interval (ms)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={4000}
                                            max={30000}
                                            step={1000}
                                            value={form.scanIntervalMs}
                                            onChange={(e) =>
                                                setForm({ ...form, scanIntervalMs: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-cyan-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-20 text-right">
                                            {(form.scanIntervalMs / 1000).toFixed(1)}s
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        How often the worker polls for new blocks. Lower = more responsive.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">
                                        High-Value Tx Threshold (ETH)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={0.001}
                                            max={1}
                                            step={0.001}
                                            value={form.highValueThresholdEth}
                                            onChange={(e) =>
                                                setForm({ ...form, highValueThresholdEth: Number(e.target.value) })
                                            }
                                            className="flex-1 accent-amber-500"
                                        />
                                        <span className="text-sm font-mono text-slate-300 w-20 text-right">
                                            {form.highValueThresholdEth.toFixed(3)} ETH
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Transactions above this value are flagged as high-value in the analysis.
                                    </p>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* ── Notifications ── */}
                        <SettingsSection
                            icon={<Bell className="w-5 h-5 text-cyan-400" />}
                            title="Notifications"
                            description="Alert preferences for threat events and system status."
                        >
                            <ToggleField
                                label="Enable Notifications"
                                description="Receive browser notifications for critical threat events."
                                checked={form.notificationsEnabled}
                                onChange={(v) => setForm({ ...form, notificationsEnabled: v })}
                            />
                        </SettingsSection>
                    </div>

                    {/* Bottom spacer */}
                    <div className="h-16" />
                </div>
            </main>
        </div>
    );
}

// ── Reusable Components ──────────────────────────────

function SettingsSection({
    icon,
    title,
    description,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md"
        >
            <div className="flex items-center gap-3 mb-1">
                {icon}
                <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6 ml-8">{description}</p>
            <div className="ml-8">{children}</div>
        </motion.section>
    );
}

function ToggleField({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <span className="text-sm text-slate-300">{label}</span>
                <p className="text-xs text-slate-600">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-cyan-600" : "bg-slate-700"
                    }`}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                />
            </button>
        </div>
    );
}
