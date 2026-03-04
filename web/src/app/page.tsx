"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link2, ShieldCheck, Activity, Brain, Server, ShieldAlert, Cpu, Lock, Fingerprint, Coins } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import Footer from "./components/Footer";
import { Canvas } from "@react-three/fiber";
import { ParticleSystem, InteractiveAuvraCoin } from "./components/ThreeCanvas";

export default function Home() {
    const { scrollYProgress } = useScroll();
    const heroRef = useRef<HTMLDivElement>(null);
    const yOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -100]);

    // Grid animation
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [easterEggActive, setEasterEggActive] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        let keys = '';
        const target = 'awwwards';
        const handleKeyDown = (e: KeyboardEvent) => {
            keys += e.key.toLowerCase();
            if (keys.length > target.length) {
                keys = keys.slice(keys.length - target.length);
            }
            if (keys === target) {
                setEasterEggActive(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="bg-[#0A0A0A] text-slate-300 min-h-screen font-sans selection:bg-cyan-500/30 overflow-hidden relative">

            {/* Interactive Grid Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(6,182,212,0.15) 0%, transparent 400px)`
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className={`fixed inset-0 z-0 ${easterEggActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <Canvas camera={{ position: [0, 0, 15] }}>
                    {easterEggActive ? <InteractiveAuvraCoin /> : <ParticleSystem count={1500} />}
                </Canvas>
            </div>

            {/* Navbar area */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="font-bold text-sm tracking-widest uppercase text-white">Auvra<span className="text-cyan-500">.xyz</span></span>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono uppercase text-slate-500">
                    <Link href="#architecture" className="hover:text-cyan-400 transition-colors hidden md:block">Architecture</Link>
                    <Link href="#security" className="hover:text-cyan-400 transition-colors hidden md:block">Audit Trail</Link>
                    <Link
                        href="/dashboard"
                        className="px-5 py-2.5 bg-white text-black font-semibold rounded hover:bg-slate-200 transition-all flex items-center gap-2 relative group overflow-hidden"
                    >
                        <span className="relative z-10">Initialize Terminal</span>
                        <div className="absolute inset-0 bg-transparent opacity-0 z-0 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent)" }}></div>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.main
                ref={heroRef}
                style={{ opacity: yOpacity, y: yHero }}
                className="relative z-10 w-full min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-32"
            >
                <div className="max-w-4xl mx-auto flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 mb-8 shadow-2xl"
                    >
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                        SYSTEM OPERATIONAL // VERIDEX ENTERPRISE FIREWALL
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-none"
                    >
                        HALT DEFI <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">EXPLOITS.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl font-light leading-relaxed"
                    >
                        A continuous threat detection layer backed by deterministic heuristics, executed through Chainlink Confidential Compute, and gated by Zero-Knowledge Biometrics.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 items-center w-full justify-center"
                    >
                        <Link
                            href="/dashboard"
                            className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wide rounded-sm transition-all shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-cyan-500/30 font-mono text-sm"
                        >
                            &gt;_ Launch Observer
                        </Link>
                        <a
                            href="https://github.com/AuvraXYZ"
                            target="_blank" rel="noreferrer"
                            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 font-bold tracking-wide rounded-sm transition-all font-mono text-sm"
                        >
                            Read Specs
                        </a>
                    </motion.div>
                </div>
            </motion.main>

            {/* Architecture Grid */}
            <section id="architecture" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Enterprise Safeguards.</h2>
                    <p className="text-slate-400 max-w-xl text-lg font-light">
                        We don't trust the AI directly. We establish deterministic verification barriers to prevent false positives and malicious overrides.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <BentoCard
                        icon={<Cpu className="w-5 h-5 text-cyan-400" />}
                        title="1. Agentic Detection"
                        desc="On-chain events stream directly into Auvra Heuristic models to identify advanced Flash Loan structures."
                        className="lg:col-span-2"
                        frontVisual={<DetectionVisual />}
                    />
                    <BentoCard
                        icon={<Lock className="w-5 h-5 text-indigo-400" />}
                        title="2. CRE Compute"
                        desc="Chainlink verifies AI heuristic scoring within a Confidential Compute (TEE) enclave ensuring parameters aren't manipulated."
                        frontVisual={<ComputeVisual />}
                    />
                    <BentoCard
                        icon={<Server className="w-5 h-5 text-blue-400" />}
                        title="3. Sandbox Simulation"
                        desc="Tenderly vNets simulate the emergency `pause()` preventing collateral damage before execution."
                        frontVisual={<SimulationVisual />}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <BentoCard
                        icon={<Fingerprint className="w-5 h-5 text-amber-400" />}
                        title="4. Human-In-Loop"
                        desc="Critical pausing requires a World ID Zero-Knowledge biometric proof signed by the protocol admin. Bypassing AI hallucination risk completely."
                        className="md:col-span-2"
                        type="dark"
                        frontVisual={<HumanLoopVisual />}
                    />
                    <BentoCard
                        icon={<Coins className="w-5 h-5 text-emerald-400" />}
                        title="5. x402 Payments"
                        desc="Auvra Agent Wallet handles streaming protocol micropayments for inference and compute autonomously."
                        frontVisual={<PaymentsVisual />}
                    />
                </div>
            </section>

            {/* Code Demo Section */}
            <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 mb-12">
                <div className="relative group perspective-[1000px] hover:z-50 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-emerald-500/20 rounded-3xl blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                    <div className="relative rounded-2xl border border-white/10 bg-slate-900/40 p-1 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-[16px] transition-transform duration-700 hover:rotate-x-[2deg] hover:rotate-y-[-2deg]">
                        {/* Liquid gradients */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-[60px] pointer-events-none transition-transform duration-700 group-hover:scale-150" />
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none transition-transform duration-700 group-hover:scale-150" />

                        {/* Glass shine */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />

                        <div className="relative z-10 bg-slate-950/80 rounded-xl border border-slate-800 backdrop-blur-md overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-black/40">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                                </div>
                                <div className="ml-4 text-xs font-mono text-slate-400">Auvra.Core.ts</div>
                            </div>
                            <div className="p-8 overflow-x-auto text-sm font-mono leading-[1.8] pointer-events-none">
                                <span className="text-slate-500">// Simulating Live Data Feed</span><br />
                                <span className="text-pink-400">const</span> <span className="text-blue-300">threatOutcome</span> = <span className="text-pink-400">await</span> <span className="text-cyan-200">ai.models.generateContent</span>({"{"}<br />
                                &nbsp;&nbsp;model: <span className="text-amber-300">"gemini-2.5-flash"</span>,<br />
                                &nbsp;&nbsp;contents: <span className="text-amber-300">{"`Analyze on-chain timeslice: ${aiContext}`"}</span><br />
                                {"}"});<br /><br />

                                <span className="text-pink-400">if</span> (threatOutcome.threatLevel {">="} <span className="text-purple-300">0.8</span> && threatOutcome.action === <span className="text-amber-300">'pause()'</span>) {"{"}<br />
                                &nbsp;&nbsp;<span className="text-slate-500">// Emits event to Chainlink CRE</span><br />
                                &nbsp;&nbsp;<span className="text-pink-400">await</span> <span className="text-cyan-200">agentWallet.fetch</span>(<span className="text-white">CRE_WORKFLOW_URL</span>, {"{"}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;method: <span className="text-amber-300">'POST'</span>,<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;body: JSON.<span className="text-cyan-200">stringify</span>(payload)<br />
                                &nbsp;&nbsp;{"}"});<br />
                                {"}"}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}

function BentoCard({ icon, title, desc, className = "", type = "light", imgSrc, frontVisual }: {
    icon: React.ReactNode,
    title: string,
    desc: string,
    className?: string,
    type?: "light" | "dark",
    imgSrc?: string,
    frontVisual?: React.ReactNode
}) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className={`group [perspective:1000px] h-[340px] ${className}`}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 20 }}
                className="w-full h-full relative [transform-style:preserve-3d] cursor-pointer"
            >
                {/* Front Face: Liquid Glass */}
                <div
                    className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl p-8 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-[12px] border border-white/10 ${type === "light" ? "bg-slate-900/60" : "bg-black/60"} overflow-hidden`}
                >
                    {/* Liquid gradients */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-150" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-150" />

                    {/* Glass shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />

                    {frontVisual}

                    <div className="mb-6 p-4 rounded-2xl bg-white/[0.05] border border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.1)] inline-flex self-start backdrop-blur-md relative z-10 transition-transform duration-500 group-hover:-translate-y-2 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30">
                        {icon}
                    </div>
                    <div className="mt-auto relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">{title}</h3>
                        <p className="text-cyan-400 text-xs uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">Hover to expand</p>
                    </div>
                </div>

                {/* Back Face */}
                <div
                    className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_0_rgba(6,182,212,0.2)] backdrop-blur-[16px] border border-cyan-500/30 bg-cyan-950/80 overflow-hidden`}
                    style={{ transform: "rotateY(180deg)" }}
                >
                    {/* Inner glowing core */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-100 pointer-events-none" />

                    <div className="mb-4 p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 relative z-10 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-cyan-100 mb-4 font-mono tracking-tight relative z-10">{title}</h3>
                    <p className="text-cyan-100/70 text-sm leading-relaxed max-w-xs mx-auto relative z-10">
                        {desc}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

function DetectionVisual() {
    return (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <div className="grid grid-cols-4 gap-2 w-full max-w-[200px] mt-12">
                {[...Array(16)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: (Math.random() * 2) }}
                        className="h-2 bg-cyan-500 rounded-full"
                    />
                ))}
            </div>
        </div>
    )
}

function ComputeVisual() {
    return (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                className="w-32 h-32 mt-12 rounded-full border-t-2 border-r-2 border-indigo-500 border-dashed absolute"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, ease: "linear", repeat: Infinity }}
                className="w-24 h-24 mt-12 rounded-full border-b-2 border-l-2 border-cyan-500 border-dotted absolute"
            />
        </div>
    )
}

function SimulationVisual() {
    return (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
            <div className="flex flex-col gap-3 w-full max-w-[150px] mt-12">
                <div className="h-1.5 w-full bg-blue-500/20 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-blue-500 w-12" animate={{ x: [-50, 200] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                </div>
                <div className="h-1.5 w-3/4 bg-cyan-500/20 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-cyan-500 w-8" animate={{ x: [-50, 150] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }} />
                </div>
                <div className="h-1.5 w-1/2 bg-indigo-500/20 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-indigo-500 w-4" animate={{ x: [-50, 100] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1 }} />
                </div>
            </div>
        </div>
    )
}

function HumanLoopVisual() {
    return (
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none z-0">
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
                    className="absolute w-24 h-24 mt-12 rounded-full border border-amber-500"
                />
            ))}
        </div>
    )
}

function PaymentsVisual() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none gap-4 z-0">
            <div className="flex gap-2 w-full max-w-[150px] justify-between mt-12">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 rounded-full bg-emerald-500"
                    />
                ))}
            </div>
            <div className="w-full max-w-[150px] h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
        </div>
    )
}
