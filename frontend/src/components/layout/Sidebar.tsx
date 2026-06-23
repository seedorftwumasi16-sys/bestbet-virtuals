'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SkyBetWordmark } from '@/components/branding/SkyBetLogo';
import {
  IconHome,
  IconFootball,
  IconTrophy,
  IconChart,
  IconWallet,
  IconCard,
  IconUsers,
} from '@/components/icons/FootballIcons';

const items = [
  { href: '/', label: 'Home', icon: IconHome },
  { href: '/', label: 'Virtual Football', icon: IconFootball, match: '/' },
  { href: '/#upcoming', label: 'Upcoming Matches', icon: IconFootball },
  { href: '/results', label: 'Results', icon: IconChart },
  { href: '/players', label: 'Players', icon: IconChart },
  { href: '/league', label: 'League Table', icon: IconTrophy },
  { href: '/booking', label: 'Booking Code', icon: IconCard },
  { href: '/tickets', label: 'My Bets', icon: IconChart },
  { href: '/wallet', label: 'Wallet', icon: IconWallet },
  { href: '/wallet/deposit', label: 'Deposit', icon: IconWallet },
  { href: '/wallet/withdraw', label: 'Withdrawal', icon: IconWallet },
  { href: '/notifications', label: 'Promotions', icon: IconTrophy },
  { href: '/profile', label: 'VIP Club', icon: IconUsers },
  { href: '/profile', label: 'Settings', icon: IconUsers, match: '/profile' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, match?: string) => {
    const path = match || href.replace('#upcoming', '');
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-dark-600/30 bg-dark-900/95 backdrop-blur-xl h-screen sticky top-0">
      <div className="p-5 border-b border-dark-600/30">
        <Link href="/">
          <SkyBetWordmark subtitle="Instant Virtuals" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item, i) => {
          const active = isActive(item.href, item.match);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${i}`}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary-500/10 text-primary-500 border border-primary-500/25 shadow-neon'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700/40'
              )}
            >
              <Icon size={18} className={active ? 'text-primary-500' : 'text-gray-500'} />
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-live" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-600/30">
        <div className="glass-panel p-3 border border-primary-500/15">
          <p className="text-primary-500 text-[10px] font-bold uppercase tracking-[0.15em]">Live Now</p>
          <p className="text-white text-sm font-bold mt-1">SkyBet Virtual League</p>
          <p className="text-gray-500 text-xs mt-0.5">Premium instant football</p>
        </div>
      </div>
    </aside>
  );
}
