'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { SkyBetWordmark } from '@/components/branding/SkyBetLogo';
import { formatCurrency } from '@/lib/api';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function Header() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user) {
      api<{ unread: number }>('/notifications')
        .then((d) => setUnread(d.unread))
        .catch(() => {});
    }
  }, [user]);

  return (
    <header className="bg-dark-900/90 backdrop-blur-xl border-b border-dark-600/40 sticky top-0 z-40">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <SkyBetWordmark compact />
          </Link>

          <div className="hidden lg:block text-sm">
            <span className="text-gray-500 font-medium">Instant Virtuals</span>
            <span className="text-accent-500 text-xs ml-2 font-bold">Bet Smart, Win More</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <>
                <Link href="/wallet/deposit" className="btn-accent text-xs py-1.5 px-3 hidden sm:flex">
                  + Deposit
                </Link>
                <Link
                  href="/wallet"
                  className="bg-dark-800/80 border border-dark-600/60 px-3 py-1.5 rounded-xl text-sm hover:border-primary-500/30 transition-colors"
                >
                  <span className="text-gray-400 text-xs">Balance </span>
                  <span className="text-primary-500 font-bold">{formatCurrency(user.balance)}</span>
                </Link>
                <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-white transition-colors">
                  🔔
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold text-primary-500 border border-dark-600 hover:border-primary-500/40 transition-colors"
                >
                  {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </Link>
                {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager') && (
                  <Link href="/admin/dashboard" className="text-primary-500 text-xs font-bold hidden md:block">Control Center</Link>
                )}
                <button onClick={logout} className="btn-secondary text-xs py-1.5 hidden md:block">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-1.5">Login</Link>
                <Link href="/register" className="btn-primary text-sm py-1.5">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
