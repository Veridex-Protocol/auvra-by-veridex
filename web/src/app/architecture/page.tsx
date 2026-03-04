import { ShieldAlert, Activity, ArrowRight, BrainCircuit, Cpu, Zap, ActivitySquare, Code2, Lock } from "lucide-react";
import Link from "next/link";
import Footer from "../components/Footer";

export default function ArchitectureLayout() {
    return (
        <div className="bg-[#0A0A0A] text-slate-300 min-h-screen font-sans selection:bg-cyan-500/30 overflow-hidden relative flex flex-col pt-24">
            {/* Navbar area */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="font-bold text-sm tracking-widest uppercase text-white">Auvra<span className="text-cyan-500">.xyz</span></span>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono uppercase text-slate-500">
                    <Link href="/" className="hover:text-cyan-400 transition-colors hidden md:block">&larr; Return Home</Link>
                    <Link
                        href="/dashboard"
                        className="px-5 py-2.5 bg-white text-black font-semibold rounded hover:bg-slate-200 transition-all flex items-center gap-2 relative group overflow-hidden"
                    >
                        <span className="relative z-10">Initialize Terminal</span>
                    </Link>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 z-10">
                <div className="mb-12 border-b border-slate-800 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-6 shadow-2xl">
                        <ZoomInIcon className="w-4 h-4" />
                        Protocol Infrastructure Reference
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">
                        System Architecture.
                    </h1>
                    <p className="max-w-3xl text-lg text-slate-400 font-light leading-relaxed">
                        The Auvra Enterprise Risk Firewall operates natively across the EVM. Data streams into a confidential compute sandbox, where LLMs analyze complex transaction sequences. If a critical heuristic threshold is breached, execution enters the decentralized pipeline managed by the <span className="text-cyan-400">Chainlink Platform</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 mb-20 lg:items-center">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-sm shadow-2xl">
                        <div className="absolute inset-0 bg-blue-500/5 blur-[80px]" />
                        <div className="relative z-10 flex flex-col pt-4">
                            <div className="w-full flex justify-between items-center bg-slate-950 p-4 border border-slate-800 rounded-lg mb-4">
                                <span className="text-xs font-mono text-slate-500">Source: Chainlink Functions</span>
                                <ActivitySquare className="text-cyan-400 w-5 h-5" />
                            </div>

                            <div className="w-full relative h-[4px] bg-slate-800 my-2 group">
                                <div className="absolute left-0 top-0 h-full bg-cyan-500 w-[50%] animate-pulse" />
                            </div>

                            <div className="w-full flex justify-between gap-4 my-4">
                                <div className="flex-1 bg-slate-950 p-6 border border-slate-800 rounded-lg text-center shadow-inner group transition-all hover:bg-blue-950/20">
                                    <BrainCircuit className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                                    <span className="text-xs font-bold text-slate-300">Gemini LLM Enclave</span>
                                </div>
                                <div className="flex-1 bg-slate-950 p-6 border border-slate-800 rounded-lg text-center shadow-inner group transition-all hover:bg-emerald-950/20">
                                    <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
                                    <span className="text-xs font-bold text-slate-300">World ID Zero-Knowledge</span>
                                </div>
                            </div>

                            <div className="w-full relative h-[4px] bg-slate-800 my-2 group">
                                <div className="absolute left-0 top-0 h-full bg-cyan-500 w-[80%] animate-pulse delay-150" />
                            </div>

                            <div className="w-full bg-slate-950 p-4 border border-emerald-500/50 rounded-lg mt-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono text-emerald-400">Target Protocol</span>
                                    <span className="font-bold">Base Sepolia Execution Layer</span>
                                </div>
                                <Code2 className="text-emerald-500 opacity-50 w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <FeatureRow
                            icon={<Zap className="w-6 h-6 text-amber-400" />}
                            title="Flashbots RPC Ingestion (Pending)"
                            desc="Real-time transaction sequencing via private mempools limits MEV re-entrancy vulnerability analysis."
                        />
                        <FeatureRow
                            icon={<BrainCircuit className="w-6 h-6 text-purple-400" />}
                            title="LLM Context Synthesizer"
                            desc="Transforms raw hexadecimal opcodes and state balances into readable financial workflows for the Gemini heuristic models."
                        />
                        <FeatureRow
                            icon={<Lock className="w-6 h-6 text-slate-300" />}
                            title="Chainlink CRE (Custom Routing Engine)"
                            desc="An off-chain verifiable workflow orchestrating API limits, x402 payment requirements from the agent wallet, and Tenderly fork simulation tasks natively."
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ZoomInIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
            <line x1="11" x2="11" y1="8" y2="14" />
            <line x1="8" x2="14" y1="11" y2="11" />
        </svg>
    )
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-cyan-500/50 transition-colors shadow-inner">
                {icon}
            </div>
            <div className="flex flex-col">
                <h4 className="font-bold text-white mb-1.5">{title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-light">{desc}</p>
            </div>
        </div>
    )
}
