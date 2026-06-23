'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo';
import {
  SkyBetWordmark,
  HeroPlayerArt,
  StadiumLights,
  FloatingFootball,
} from '@/components/branding/SkyBetLogo';
import { IconTimer, IconLive } from '@/components/icons/FootballIcons';
import { HeroSkeleton } from '@/components/ui/LoadingSkeleton';
import { LEAGUE_META } from '@/lib/teamColors';
import { useMatchesData } from '@/context/MatchesDataContext';

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) return 'LIVE';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function StadiumHero() {
  const { leagueStats: stats, loading } = useMatchesData();
  const [kickoff, setKickoff] = useState('--:--');
  const [bettingClose, setBettingClose] = useState('--:--');

  const nextMatchId = stats?.next_match?.id;
  const nextScheduledAt = stats?.next_match?.scheduled_at;
  const bettingCloseSec = stats?.betting_close_seconds ?? 10;

  useEffect(() => {
    if (!nextScheduledAt) {
      setKickoff('Starting...');
      setBettingClose('--:--');
      return;
    }
    const tick = () => {
      const diffMs = new Date(nextScheduledAt).getTime() - Date.now();
      const diffSec = Math.floor(diffMs / 1000);
      setKickoff(formatCountdown(diffSec));
      const betSec = diffSec - bettingCloseSec;
      setBettingClose(betSec > 0 ? formatCountdown(betSec) : 'CLOSED');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextScheduledAt, bettingCloseSec]);

  if (loading && !stats) return <HeroSkeleton className="min-h-[420px] rounded-none" />;

  const intervalSec = stats?.match_interval_seconds ?? 60;
  const intervalLabel = intervalSec < 60 ? `${intervalSec}s` : `${Math.round(intervalSec / 60)} min`;
  const leagueName = stats?.next_match?.league_name || stats?.active_league || 'Premier League';
  const leagueMeta = LEAGUE_META[leagueName];
  const matchNumber = (stats?.total_played || 0) + 1;
  const matchId = nextMatchId?.slice(0, 8).toUpperCase() ?? '—';
  const jackpot = stats?.prize_pool ?? 25000;

  return (
    <section className="relative w-full min-h-[460px] sm:min-h-[520px] overflow-hidden bg-[#0A0F14]">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #121A22 0%, #0A0F14 45%, #060a0e 100%)' }} />
      <div className="absolute inset-0 opacity-80 pointer-events-none">
        <StadiumLights className="w-full h-full object-cover" />
      </div>

      <motion.div
        className="absolute -top-32 left-[5%] w-48 sm:w-72 h-[150%] origin-top pointer-events-none"
        animate={{ rotate: [-14, 12, -14], opacity: [0.15, 0.45, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(180deg, rgba(0,230,118,0.6) 0%, transparent 65%)', filter: 'blur(50px)' }}
      />
      <motion.div
        className="absolute -top-32 right-[5%] w-48 sm:w-72 h-[150%] origin-top pointer-events-none"
        animate={{ rotate: [14, -12, 14], opacity: [0.12, 0.4, 0.12] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        style={{ background: 'linear-gradient(180deg, rgba(255,215,0,0.45) 0%, transparent 65%)', filter: 'blur(50px)' }}
      />

      <motion.div
        className="absolute right-0 bottom-0 w-[55%] sm:w-[45%] max-w-md pointer-events-none opacity-90"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <HeroPlayerArt className="w-full h-auto" />
      </motion.div>

      <div className="absolute top-[20%] right-[18%] sm:right-[22%] z-20 pointer-events-none">
        <FloatingFootball />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-6 max-w-xl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <SkyBetWordmark subtitle="Instant Virtuals" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
                EUROPEAN
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E676] via-[#33eb91] to-[#FFD700]">
                  VIRTUALS
                </span>
              </h1>
              <p className="text-gray-400 mt-4 text-sm sm:text-base max-w-md">
                Live matches every {intervalLabel}. Premier League, La Liga, Bundesliga, Serie A & Ligue 1 — instant results, premium odds.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-500 text-xs font-bold">LIVE 24/7</span>
                <span className="px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/30 text-accent-500 text-xs font-bold">43 CLUBS</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold">5 LEAGUES</span>
              </div>
            </motion.div>

            {stats && stats.live_count > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/10 border border-red-500/40"
              >
                <IconLive size={18} />
                <span className="text-red-400 font-bold text-sm">
                  {stats.live_count} live match{stats.live_count > 1 ? 'es' : ''} in progress
                </span>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
            className="w-full lg:w-[420px] shrink-0"
          >
            <div className="relative rounded-2xl p-5 sm:p-6 bg-[#0A0F14]/90 backdrop-blur-2xl border border-primary-500/25 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-primary-500">
                  <IconTimer size={18} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Next Match</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500">#{matchNumber} · {matchId}</span>
              </div>

              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-dark-800/80 border border-dark-600">
                <span className="text-lg">{leagueMeta?.flag || '⚽'}</span>
                <span className="text-xs font-bold text-white uppercase tracking-wide">{leagueName}</span>
              </div>

              {stats?.next_match && (
                <div className="flex items-center justify-between gap-3 mb-5 py-2">
                  <div className="text-center flex-1 min-w-0">
                    <TeamLogo short={stats.next_match.home_short} logoUrl={stats.next_match.home_logo} size="xl" />
                    <p className="text-xs text-white font-bold mt-2 truncate">{stats.next_match.home_name}</p>
                  </div>
                  <div className="text-center px-2 space-y-3 shrink-0">
                    <div>
                      <p
                        className={`text-4xl sm:text-5xl font-black tabular-nums ${kickoff === 'LIVE' ? 'text-red-400' : 'text-white'}`}
                        style={{ textShadow: kickoff === 'LIVE' ? '0 0 30px rgba(239,68,68,0.5)' : '0 0 30px rgba(0,230,118,0.35)' }}
                      >
                        {kickoff}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Kickoff</p>
                    </div>
                    <div className="pt-2 border-t border-dark-600">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Betting closes in</p>
                      <p className={`text-xl font-black tabular-nums ${bettingClose === 'CLOSED' ? 'text-red-400' : 'text-accent-500'}`}>
                        {bettingClose}
                      </p>
                    </div>
                  </div>
                  <div className="text-center flex-1 min-w-0">
                    <TeamLogo short={stats.next_match.away_short} logoUrl={stats.next_match.away_logo} size="xl" />
                    <p className="text-xs text-white font-bold mt-2 truncate">{stats.next_match.away_name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 bg-gradient-to-br from-accent-500/20 to-transparent border border-accent-500/30">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Jackpot Pool</p>
                  <p className="text-accent-500 font-black text-xl sm:text-2xl mt-1 tabular-nums">{formatCurrency(jackpot)}</p>
                </div>
                <div className="rounded-xl p-4 bg-gradient-to-br from-primary-500/20 to-transparent border border-primary-500/30">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Season</p>
                  <p className="text-primary-500 font-black text-xl sm:text-2xl mt-1">S{stats?.season ?? '1'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E676]/60 to-transparent" />
    </section>
  );
}
