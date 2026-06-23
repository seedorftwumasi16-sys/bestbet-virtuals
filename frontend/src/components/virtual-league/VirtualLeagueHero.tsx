'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, formatCurrency } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo';
import { SkyBetWordmark } from '@/components/branding/SkyBetLogo';
import { IconTrophy, IconTimer, IconStadium } from '@/components/icons/FootballIcons';
import { HeroSkeleton } from '@/components/ui/LoadingSkeleton';

interface LeagueStats {
  total_played: number;
  live_count: number;
  season: string;
  match_interval_minutes: number;
  prize_pool: number;
  leader: { name: string; short_name: string; logo_url?: string; points: number } | null;
  next_match: {
    id: string;
    scheduled_at: string;
    home_name: string;
    home_short: string;
    home_logo?: string;
    away_name: string;
    away_short: string;
    away_logo?: string;
  } | null;
}

export default function VirtualLeagueHero() {
  const [stats, setStats] = useState<LeagueStats | null>(null);
  const [countdown, setCountdown] = useState('--:--');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<LeagueStats>('/matches/league-stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const next = stats?.next_match;
    if (!next) {
      setCountdown('Starting...');
      return;
    }
    const tick = () => {
      const diff = new Date(next.scheduled_at).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('LIVE');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stats?.next_match]);

  if (loading) return <HeroSkeleton />;

  const interval = stats?.match_interval_minutes ?? 3;
  const matchId = stats?.next_match?.id?.slice(0, 8).toUpperCase() ?? '—';

  return (
    <section className="relative w-full overflow-hidden">
      {/* Full-width stadium atmosphere */}
      <div className="absolute inset-0 bg-[#0A0F14]" />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% 0%, rgba(0,230,118,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 0% 50%, rgba(0,230,118,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(0,230,118,0.06) 0%, transparent 50%),
            linear-gradient(180deg, #121A22 0%, #0A0F14 70%, #060a0e 100%)
          `,
        }}
      />

      {/* Animated floodlights */}
      <motion.div
        className="absolute -top-20 left-[8%] w-40 h-[120%] origin-top"
        animate={{ rotate: [-8, 8, -8], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(180deg, rgba(0,230,118,0.4) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        className="absolute -top-20 right-[8%] w-40 h-[120%] origin-top"
        animate={{ rotate: [8, -8, 8], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{
          background: 'linear-gradient(180deg, rgba(255,215,0,0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32"
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          background: 'radial-gradient(ellipse, rgba(0,230,118,0.3) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Pitch lines */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-[0.07]">
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(90%,800px)] h-20 border border-primary-500 rounded-lg" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 border border-primary-500 rounded-full" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary-500"
          style={{ left: `${5 + i * 4.5}%`, top: `${15 + (i % 5) * 12}%` }}
          animate={{ opacity: [0.1, 0.7, 0.1], y: [0, -20, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 2.5 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Left: branding + title */}
          <div className="space-y-5">
            <SkyBetWordmark />
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-accent-500"
              >
                <IconTrophy size={48} stroke="#FFD700" />
              </motion.div>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]"
                >
                  VIRTUAL
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500">
                    LEAGUE
                  </span>
                </motion.h1>
                <p className="text-gray-400 mt-3 text-sm sm:text-base font-medium flex items-center gap-2">
                  <IconStadium size={16} className="text-primary-500" />
                  New match every {interval} minutes
                </p>
                <p className="text-primary-500 text-xs sm:text-sm font-bold mt-1 tracking-[0.15em] uppercase">
                  Fast • Fair • Exciting
                </p>
              </div>
            </div>

            {stats && stats.live_count > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
                <span className="text-red-400 font-bold text-sm">
                  {stats.live_count} match{stats.live_count > 1 ? 'es' : ''} live now
                </span>
              </motion.div>
            )}
          </div>

          {/* Right: Live countdown card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full lg:w-[380px] relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/30 via-accent-500/20 to-primary-500/30 rounded-2xl blur-lg opacity-60 animate-glow-border" />
            <div className="relative glass-panel border border-primary-500/30 rounded-2xl p-5 shadow-neon-lg backdrop-blur-xl bg-dark-900/80">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-500 flex items-center gap-1.5">
                  <IconTimer size={14} className="text-primary-500" />
                  Next Match
                </span>
                <span className="text-[10px] text-gray-500 font-mono">ID: {matchId}</span>
              </div>

              {stats?.next_match && (
                <div className="flex items-center justify-center gap-4 mb-5 py-3">
                  <div className="text-center">
                    <TeamLogo short={stats.next_match.home_short} logoUrl={stats.next_match.home_logo} size="lg" />
                    <p className="text-xs text-gray-300 mt-2 font-semibold truncate max-w-[90px]">
                      {stats.next_match.home_name}
                    </p>
                  </div>
                  <div className="text-center">
                    <motion.p
                      key={countdown}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-3xl font-black tabular-nums ${
                        countdown === 'LIVE' ? 'text-red-400 animate-pulse-live' : 'text-white'
                      }`}
                    >
                      {countdown}
                    </motion.p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Kickoff</p>
                  </div>
                  <div className="text-center">
                    <TeamLogo short={stats.next_match.away_short} logoUrl={stats.next_match.away_logo} size="lg" />
                    <p className="text-xs text-gray-300 mt-2 font-semibold truncate max-w-[90px]">
                      {stats.next_match.away_name}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-800/80 rounded-xl p-3 border border-accent-500/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Prize Pool</p>
                  <motion.p
                    key={stats?.prize_pool}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-accent-500 font-black text-lg mt-0.5"
                  >
                    {formatCurrency(stats?.prize_pool ?? 10000)}
                  </motion.p>
                </div>
                <div className="bg-dark-800/80 rounded-xl p-3 border border-primary-500/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Season</p>
                  <p className="text-primary-500 font-black text-lg mt-0.5">S{stats?.season ?? '1'}</p>
                </div>
              </div>

              {stats?.leader && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-white/5">
                  <TeamLogo short={stats.leader.short_name} logoUrl={stats.leader.logo_url} size="sm" highlight="gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">League Leader</p>
                    <p className="text-white font-bold text-sm truncate">{stats.leader.name}</p>
                  </div>
                  <span className="text-accent-500 font-black">{stats.leader.points} pts</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
    </section>
  );
}
