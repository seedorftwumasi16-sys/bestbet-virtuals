'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { SkyBetWordmark } from '@/components/branding/SkyBetLogo';
import AnalyticsSection from './sections/AnalyticsSection';
import MatchesSection from './sections/MatchesSection';
import TeamsSection from './sections/TeamsSection';
import LeagueSection from './sections/LeagueSection';
import OddsSection from './sections/OddsSection';
import UsersSection from './sections/UsersSection';
import PaymentsSection from './sections/PaymentsSection';
import DepositsSection from './sections/DepositsSection';
import WithdrawalsSection from './sections/WithdrawalsSection';
import TransactionsSection from './sections/TransactionsSection';
import BetsSection from './sections/BetsSection';
import BookingSection from './sections/BookingSection';
import ContentSection from './sections/ContentSection';
import WinnersSection from './sections/WinnersSection';
import SecuritySection from './sections/SecuritySection';
import LiveMatchEditorSection from './sections/LiveMatchEditorSection';
import SettingsSection from './sections/SettingsSection';

const STAFF_ROLES = ['admin', 'super_admin', 'manager'];

export type AdminSection =
  | 'analytics'
  | 'live-editor'
  | 'matches'
  | 'teams'
  | 'leagues'
  | 'odds'
  | 'users'
  | 'deposits'
  | 'withdrawals'
  | 'transactions'
  | 'bets'
  | 'payments'
  | 'booking'
  | 'content'
  | 'winners'
  | 'security'
  | 'settings';

const NAV: { id: AdminSection; label: string; icon: string; roles?: string[] }[] = [
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'live-editor', label: 'Live Match Editor', icon: '🎮' },
  { id: 'matches', label: 'Matches', icon: '⚽' },
  { id: 'teams', label: 'Teams', icon: '🏟️' },
  { id: 'leagues', label: 'Leagues', icon: '🏆' },
  { id: 'odds', label: 'Odds', icon: '🎯' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'deposits', label: 'Deposits', icon: '💰' },
  { id: 'withdrawals', label: 'Withdrawals', icon: '💸' },
  { id: 'transactions', label: 'Transactions', icon: '📋' },
  { id: 'bets', label: 'Bet Slips', icon: '🎫' },
  { id: 'payments', label: 'Payment Config', icon: '💳' },
  { id: 'booking', label: 'Booking Codes', icon: '🎫' },
  { id: 'content', label: 'Content', icon: '📢' },
  { id: 'winners', label: 'Recent Winners', icon: '🏅' },
  { id: 'security', label: 'Security', icon: '🔒', roles: ['admin', 'super_admin'] },
  { id: 'settings', label: 'Settings', icon: '⚙️', roles: ['admin', 'super_admin'] },
];

export default function AdminShell() {
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    if (loading) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !user && !authPending) {
      setAuthPending(true);
      refreshUser()
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAuthPending(false));
      return;
    }

    if (!authPending && (!user || !STAFF_ROLES.includes(user.role))) {
      router.push('/login');
    }
  }, [user, loading, router, refreshUser, authPending]);

  if (loading || authPending || !user || !STAFF_ROLES.includes(user.role)) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel = user.role === 'super_admin' ? 'Super Admin' : user.role === 'manager' ? 'Manager' : 'Admin';
  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="fixed inset-0 z-50 flex bg-[#060a0e] text-gray-100">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-dark-600/40 bg-dark-900/95 backdrop-blur-xl transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-0'
        )}
      >
        <div className="p-5 border-b border-dark-600/40">
          <SkyBetWordmark compact />
          <p className="text-[10px] text-accent-500 font-bold mt-2 uppercase tracking-widest">Control Center</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                section === item.id
                  ? 'bg-primary-500/15 text-primary-500 border border-primary-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700/40'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-600/40 space-y-2">
          <div className="text-xs text-gray-500">
            <span className="text-white font-semibold">{user.email}</span>
            <span className="block text-primary-500 font-bold mt-0.5">{roleLabel}</span>
          </div>
          <Link href="/" className="block text-center text-xs text-gray-400 hover:text-white py-2">← Back to Site</Link>
          <button onClick={logout} className="btn-secondary w-full text-xs py-2">Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-dark-600/40 bg-dark-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-dark-700/60 text-gray-400 hover:text-white"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-black text-white">SkyBet Super Admin</h1>
              <p className="text-[10px] text-gray-500">Bet Smart, Win More · Virtuals Control Center</p>
            </div>
          </div>
          <span className="badge-live text-[10px] hidden sm:flex">LIVE OPS</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {section === 'analytics' && <AnalyticsSection />}
          {section === 'live-editor' && <LiveMatchEditorSection />}
          {section === 'matches' && <MatchesSection />}
          {section === 'teams' && <TeamsSection />}
          {section === 'leagues' && <LeagueSection />}
          {section === 'odds' && <OddsSection />}
          {section === 'users' && <UsersSection userRole={user.role} />}
          {section === 'deposits' && <DepositsSection />}
          {section === 'withdrawals' && <WithdrawalsSection />}
          {section === 'transactions' && <TransactionsSection />}
          {section === 'bets' && <BetsSection />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'booking' && <BookingSection />}
          {section === 'content' && <ContentSection />}
          {section === 'winners' && <WinnersSection />}
          {section === 'security' && <SecuritySection userRole={user.role} />}
          {section === 'settings' && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}
