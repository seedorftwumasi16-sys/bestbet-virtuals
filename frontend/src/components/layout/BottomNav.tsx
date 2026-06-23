'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useBetSlip } from '@/context/BetSlipContext';
import { SkyBetIcon } from '@/components/branding/SkyBetLogo';
import { IconHome, IconFootball, IconTrophy, IconWallet } from '@/components/icons/FootballIcons';

const tabs = [
  { href: '/', label: 'Home', icon: IconHome },
  { href: '/#upcoming', label: 'Matches', icon: IconFootball },
  { href: '#bet-slip', label: 'Bet', icon: IconFootball, isBet: true },
  { href: '/league', label: 'League', icon: IconTrophy },
  { href: '/wallet', label: 'Wallet', icon: IconWallet },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { selections } = useBetSlip();

  const scrollToBet = () => {
    document.getElementById('bet-slip')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-dark-600/40 safe-area-pb">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
      <div className="flex items-center justify-around px-1 py-2">
        {tabs.map((tab) => {
          if (tab.isBet) {
            return (
              <button
                key={tab.label}
                onClick={scrollToBet}
                className="relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-neon">
                  <SkyBetIcon size={24} />
                </div>
                <span className="text-[10px] font-bold text-primary-500">Bet</span>
                {selections.length > 0 && (
                  <span className="absolute top-0 right-2 w-4 h-4 bg-accent-500 text-dark-900 text-[9px] font-black rounded-full flex items-center justify-center border-2 border-dark-900">
                    {selections.length}
                  </span>
                )}
              </button>
            );
          }

          const Icon = tab.icon;
          const active =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href.replace('#upcoming', '').replace('#', ''));

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors',
                active ? 'text-primary-500' : 'text-gray-500'
              )}
            >
              <Icon size={22} className={active ? 'text-primary-500' : 'text-gray-500'} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
