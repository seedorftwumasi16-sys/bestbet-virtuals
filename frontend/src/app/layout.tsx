import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { BetSlipProvider } from '@/context/BetSlipContext';
import Header from '@/components/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import BackendHealthBanner from '@/components/BackendHealthBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyBet — Bet Smart, Win More',
  description: 'SkyBet Instant Virtuals. Premium live virtual football, fast matches, Ghana MoMo payments, 12+ betting markets.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0A0F14] text-gray-100 antialiased">
        <AuthProvider>
          <BetSlipProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <BackendHealthBanner />
                <Header />
                <main className="flex-1 pb-28 lg:pb-6">{children}</main>
                <BottomNav />
              </div>
            </div>
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
