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

    const handleSave = () => {
        updateSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const testConnection = async () => {
        setTestingConnection(true);
        setConnectionStatus("idle");
        try {
            const res = await fetch(`${form.aiWorkerUrl}/health`, { signal: AbortSignal.timeout(5000) });
            setConnectionStatus(res.ok ? "ok" : "fail");
        } catch {
            setConnectionStatus("fail");
        } finally {
            setTestingConnection(false);
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
                                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Connected successfully
                                        </p>
                                    )}
                                    {connectionStatus === "fail" && (
                                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Connection failed — is the worker running?
                                        </p>
                                    )}
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
                                        <option value="Aave V3">Aave V3</option>
                                        <option value="Compound V3">Compound V3</option>
                                        <option value="Uniswap V4">Uniswap V4</option>
                                        <option value="Morpho Blue">Morpho Blue</option>
                                        <option value="Custom">Custom Contract</option>
                                    </select>
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
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    checked ? "bg-cyan-600" : "bg-slate-700"
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
