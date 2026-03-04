import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Auvra | Enterprise Risk Firewall',
    description: 'Privacy-preserving AI risk agents safeguarding DeFi protocols via CRE, World ID, & Tenderly.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased selection:bg-cyan-500/30 overflow-x-hidden`}>
                {/* Subtle background glow effect */}
                <div className="fixed inset-0 z-[-1] bg-slate-950">
                    <div className="absolute top-0 right-0 -mr-40 w-96 h-96 bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
                </div>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
