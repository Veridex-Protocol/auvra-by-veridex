"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Settings,
    LayoutDashboard,
    LogOut,
    Clock,
    ChevronLeft,
    ChevronRight,
    Lock,
    Cpu,
    ShieldAlert,
    Home,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "./SessionContext";

// ── Nav Items ────────────────────────────────────────

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" /> },
];

const INFO_ITEMS: NavItem[] = [
    { label: "Home", href: "/", icon: <Home className="w-4 h-4" /> },
    { label: "Architecture", href: "/architecture", icon: <Cpu className="w-4 h-4" /> },
    { label: "Audit Trail", href: "/security", icon: <ShieldAlert className="w-4 h-4" /> },
];

// ── Sidebar Component ────────────────────────────────

export default function DashboardNav() {
    const pathname = usePathname();
    const { isAuthenticated, vaultAddress, authMethod, logout, sessionTimeRemaining } =
        useSession();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const isActive = (href: string) => pathname === href;

    const navContent = (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
                <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-cyan-400" />
                </div>
                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-bold text-sm tracking-widest uppercase text-white whitespace-nowrap overflow-hidden"
                    >
                        Auvra<span className="text-cyan-500">.xyz</span>
                    </motion.span>
                )}
            </div>

            {/* Main Nav */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                <span className={`text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 block ${collapsed ? "text-center" : ""}`}>
                    {collapsed ? "---" : "Operations"}
                </span>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                            isActive(item.href)
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
                        }`}
                    >
                        {isActive(item.href) && (
                            <motion.div
                                layoutId="nav-active"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r"
                            />
                        )}
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                        {item.badge && !collapsed && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                                {item.badge}
                            </span>
                        )}
                    </Link>
                ))}

                <div className="my-4 border-t border-slate-800" />

                <span className={`text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 block ${collapsed ? "text-center" : ""}`}>
                    {collapsed ? "---" : "Info"}
                </span>
                {INFO_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive(item.href)
                                ? "bg-slate-800/50 text-white border border-slate-700"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
                        }`}
                    >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Session Info */}
            {isAuthenticated && (
                <div className="px-3 py-4 border-t border-slate-800 space-y-3">
                    {!collapsed && (
                        <>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-mono truncate">
                                    {vaultAddress
                                        ? `${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)}`
                                        : "Connected"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span className="font-mono">
                                    Session: {formatTime(sessionTimeRemaining)}
                                </span>
                            </div>
                            {authMethod && (
                                <div className="text-[10px] font-mono text-slate-600 px-1">
                                    via {authMethod}
                                </div>
                            )}
                        </>
                    )}
                    <button
                        onClick={logout}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? "justify-center" : ""}`}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>Disconnect</span>}
                    </button>
                </div>
            )}

            {/* Collapse Toggle (desktop only) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex items-center justify-center py-3 border-t border-slate-800 text-slate-500 hover:text-white transition-colors"
            >
                {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <ChevronLeft className="w-4 h-4" />
                )}
            </button>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:sticky top-0 left-0 z-[56] h-screen
                    bg-slate-950/95 backdrop-blur-xl border-r border-slate-800
                    transition-all duration-300 ease-in-out
                    ${collapsed ? "lg:w-16" : "lg:w-56"}
                    ${mobileOpen ? "w-56 translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                {navContent}
            </aside>
        </>
    );
}
