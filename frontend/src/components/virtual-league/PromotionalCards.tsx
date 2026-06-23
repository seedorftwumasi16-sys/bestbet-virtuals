'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconTrophy, IconWallet } from '@/components/icons/FootballIcons';

const promos = [
  {
    title: 'Welcome Bonus',
    subtitle: '100% first deposit',
    desc: 'Up to GHS 500 bonus credits',
    icon: IconTrophy,
    gradient: 'from-primary-500/15 to-primary-600/5',
    border: 'border-primary-500/25',
    href: '/wallet/deposit',
  },
  {
    title: 'Refer & Earn',
    subtitle: 'Share SkyBet',
    desc: 'GHS 20 per friend who bets',
    icon: IconUsers,
    gradient: 'from-accent-500/12 to-accent-600/5',
    border: 'border-accent-500/25',
    href: '/profile',
  },
  {
    title: 'VIP Rewards',
    subtitle: 'Elite tier benefits',
    desc: 'Higher limits & exclusive odds',
    icon: IconTrophy,
    gradient: 'from-purple-500/12 to-purple-600/5',
    border: 'border-purple-500/25',
    href: '/profile',
  },
  {
    title: 'Daily Jackpot',
    subtitle: 'Spin to win big',
    desc: 'GHS 10,000 prize pool daily',
    icon: IconWallet,
    gradient: 'from-cyan-500/12 to-cyan-600/5',
    border: 'border-cyan-500/25',
    href: '/notifications',
  },
];

function IconUsers({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 8a3 3 0 1 0 0-6" />
    </svg>
  );
}

export default function PromotionalCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {promos.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="group"
          >
            <Link
              href={p.href}
              className={`block relative overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-br ${p.gradient} p-4 h-full transition-all hover:shadow-neon backdrop-blur-sm`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <Icon size={24} className="text-primary-500 mb-2" />
              <h4 className="font-black text-white text-sm">{p.title}</h4>
              <p className="text-primary-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">{p.subtitle}</p>
              <p className="text-gray-400 text-xs mt-1">{p.desc}</p>
              <span className="text-primary-500 text-[10px] font-bold mt-2 inline-block group-hover:translate-x-1 transition-transform">
                Claim →
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
