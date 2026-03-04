import { ShieldAlert, Fingerprint, Server, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Footer from "../components/Footer";

export default function SecurityLayout() {
    return (
        <div className="bg-[#0A0A0A] text-slate-300 min-h-screen font-sans selection:bg-cyan-500/30 overflow-hidden relative flex flex-col pt-24">
            {/* Navbar area */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-cyan-400" />
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
                        <ShieldAlert className="w-4 h-4" />
                        Live Security & Audit Trail
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">
                        Deterministic Enforcement.
                    </h1>
                    <p className="max-w-3xl text-lg text-slate-400 font-light leading-relaxed">
                        Auvra implements zero-trust boundaries around AI execution flows. LLM hallucination risk is mapped and isolated at the execution layer. Any automated operation modifying protocol state requires an immutable zero-knowledge biometric signature matching a verified on-chain governance key hash.
                    </p>
                </div>

                <div className="space-y-12">
                    <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Fingerprint className="text-amber-500" /> World ID Human Proofs
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed max-w-3xl">
                            The highest standard of identity isolation. The Auvra Agent issues its payload, but the EVM halts the transaction at the `onlyAuvra` modifier logic until a cryptographic biometric payload is supplied via the World App interface, confirming biological presence mapped to administrative rights.
                        </p>
                        <div className="p-4 bg-slate-950 rounded border border-white/5 font-mono text-sm inline-flex">
                            <span className="text-pink-400 mr-2">Status:</span>
                            <span className="text-emerald-400">Integrated & Live on Base Sepolia</span>
                        </div>
                    </section>

                    <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Server className="text-blue-500" /> Sandbox Simulation Enclave
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed max-w-3xl">
                            AI-constructed transaction blobs are routed via our internal RPC simulation node prior to mempool submission. The payload is executed against a forked instance of the protocol's live state leveraging <strong className="text-white">Tenderly Virtual Testnets</strong>. If the simulation reverts or identifies collateral damage, execution is permanently suspended.
                        </p>
                        <div className="w-full h-8 bg-slate-950 rounded flex overflow-hidden border border-white/5 text-xs font-mono">
                            <div className="w-[15%] flex items-center justify-center bg-slate-900 border-r border-slate-800">TX Hash</div>
                            <div className="w-[60%] flex items-center px-4 text-slate-500 truncate">0x9f5a72db6e0c03ba8feab96f8c7d...</div>
                            <div className="flex-1 flex items-center justify-center bg-emerald-950 text-emerald-500">Simulation Passes</div>
                        </div>
                    </section>
                </div>

                <div className="mt-20 text-center mb-12">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 group text-white hover:text-cyan-400 transition-colors font-bold tracking-tight">
                        Launch Live Sandbox <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
