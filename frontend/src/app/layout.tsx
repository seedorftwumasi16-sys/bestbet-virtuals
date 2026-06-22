import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { BetSlipProvider } from '@/context/BetSlipContext';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'BestBet Virtuals — Instant Virtual Football Betting',
  description: 'Premium instant virtual football betting. Live matches every 3 minutes, Ghana MoMo payments, 12+ betting markets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BetSlipProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
