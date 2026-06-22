'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/api';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user) {
      api<{ unread: number }>('/notifications')
        .then((d) => setUnread(d.unread))
        .catch(() => {});
    }
  }, [user]);

  const nav = [
    { href: '/', label: 'Virtuals' },
    { href: '/results', label: 'Results' },
    { href: '/league', label: 'League' },
    { href: '/tickets', label: 'Tickets' },
    { href: '/booking', label: 'Booking' },
  ];

  return (
    <header className="bg-dark-900/95 backdrop-blur-md border-b border-dark-600/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-primary-500/30">
              BB
            </div>
            <div>
              <span className="text-base font-black text-white leading-none">BestBet</span>
              <span className="text-accent-500 text-xs font-bold block leading-none">VIRTUALS</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-gray-400 hover:text-white hover:bg-dark-700 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/wallet/deposit" className="btn-accent text-xs py-1.5 px-3 hidden sm:flex">
                  + Deposit
                </Link>
                <Link href="/wallet" className="bg-dark-700/80 border border-dark-600 px-3 py-1.5 rounded-xl text-sm">
                  <span className="text-gray-400 text-xs">Balance </span>
                  <span className="text-primary-500 font-bold">{formatCurrency(user.balance)}</span>
                </Link>
                <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-white">
                  🔔
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link href="/profile" className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold text-primary-500 border border-dark-600">
                  {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" className="text-accent-500 text-xs font-bold hidden md:block">Admin</Link>
                )}
                <button onClick={logout} className="btn-secondary text-xs py-1.5 hidden md:block">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-1.5">Login</Link>
                <Link href="/register" className="btn-primary text-sm py-1.5">Register</Link>
              </>
            )}
            <button className="md:hidden text-gray-300 p-1" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 pb-2 space-y-1 border-t border-dark-600 pt-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block text-gray-300 py-2 px-2 rounded-lg hover:bg-dark-700" onClick={() => setMenuOpen(false)}>
                {n.label}
              </Link>
            ))}
            <Link href="/wallet" className="block text-gray-300 py-2 px-2" onClick={() => setMenuOpen(false)}>Wallet</Link>
            <Link href="/profile" className="block text-gray-300 py-2 px-2" onClick={() => setMenuOpen(false)}>Profile</Link>
            {user && <button onClick={logout} className="block text-gray-300 py-2 px-2 w-full text-left">Logout</button>}
          </div>
        )}
      </div>
    </header>
  );
}
