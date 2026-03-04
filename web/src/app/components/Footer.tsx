import { ShieldAlert, Github, Twitter, Layers } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full border-t border-slate-800 bg-[#0A0A0A] py-16 px-6 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-96 h-24 bg-cyan-900/10 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-24 bg-blue-900/10 blur-[100px] pointer-events-none" />
            </div>

            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between relative z-10 gap-12">
                <div className="flex flex-col max-w-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldAlert className="w-6 h-6 text-cyan-500" />
                        <span className="font-bold text-lg tracking-tight text-white">Auvra<span className="text-cyan-500">.xyz</span></span>
                    </div>
                    <p className="text-sm font-light text-slate-400 mb-8 leading-relaxed">
                        The fully autonomous Enterprise Risk Firewall designed specifically for decentralized finance protocols.
                        Safeguarded by Chainlink Confidential Compute and biometrics.
                    </p>
                    <div className="flex items-center gap-4 text-slate-500">
                        <a href="https://github.com/AuvraXYZ" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
                            <Github className="w-5 h-5" />
                        </a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">
                            <Layers className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 text-sm">
                    <div className="flex flex-col gap-4">
                        <h4 className="font-mono text-xs text-white uppercase tracking-widest font-bold">Protocol</h4>
                        <Link href="/architecture" className="text-slate-400 hover:text-white transition-colors">Architecture</Link>
                        <Link href="/security" className="text-slate-400 hover:text-white transition-colors">Audit Trail</Link>
                        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">Live Terminal</Link>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Whitepaper</a>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-mono text-xs text-white uppercase tracking-widest font-bold">Developers</h4>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Documentation</a>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">SDK</a>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Bug Bounty</a>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Status</a>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-mono text-xs text-white uppercase tracking-widest font-bold">Enterprise</h4>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Contact</a>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Partners</a>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto border-t border-slate-900 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-slate-600">
                <p>&copy; 2026 Auvra. All rights reserved.</p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> All Systems Operational
                </div>
            </div>
        </footer>
    );
}
