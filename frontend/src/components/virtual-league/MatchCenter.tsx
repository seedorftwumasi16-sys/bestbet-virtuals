'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';
import TeamLogo from '@/components/ui/TeamLogo';
import StarRating from '@/components/ui/StarRating';
import AnimatedPitch from './AnimatedPitch';

interface MatchEvent {
  event_type: string;
  minute: number;
  team_name?: string;
  player_name?: string;
  description?: string;
}

interface LiveStats {
  shotsHome?: number;
  shotsAway?: number;
  shotsOnTargetHome?: number;
  shotsOnTargetAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  yellowHome?: number;
  yellowAway?: number;
  redHome?: number;
  redAway?: number;
  foulsHome?: number;
  foulsAway?: number;
  xgHome?: number;
  xgAway?: number;
}

interface MatchData {
  match: {
    id: string;
    home_team_name: string;
    away_team_name: string;
    home_short: string;
    away_short: string;
    home_logo?: string;
    away_logo?: string;
    home_star_rating?: number;
    away_star_rating?: number;
    home_score: number;
    away_score: number;
    possession_home: number;
    possession_away: number;
    shots_home: number;
    shots_away: number;
    shots_on_target_home?: number;
    shots_on_target_away?: number;
    xg_home?: number;
    xg_away?: number;
    corners_home: number;
    corners_away: number;
    yellow_cards_home: number;
    yellow_cards_away: number;
    red_cards_home?: number;
    red_cards_away?: number;
    fouls_home?: number;
    fouls_away?: number;
    status: string;
  };
  events: MatchEvent[];
}

function formatTimer(minute: number, phase: string): string {
  if (phase === 'halftime') return '45:00';
  const m = Math.min(90, Math.max(0, minute));
  return `${String(m).padStart(2, '0')}:00`;
}

function phaseBadge(phase: string): { label: string; className: string } {
  if (phase === 'halftime') return { label: 'HALF TIME', className: 'badge-halftime' };
  if (phase === 'fulltime' || phase === 'finished') return { label: 'FULL TIME', className: 'badge-ft' };
  if (['live', 'kickoff', 'first_half', 'second_half', 'walkout'].includes(phase)) {
    return { label: 'LIVE', className: 'badge-live-neon' };
  }
  return { label: phase.toUpperCase(), className: 'text-gray-400 text-xs font-bold' };
}

export default function MatchCenter({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchData | null>(null);
  const [minute, setMinute] = useState(0);
  const [phase, setPhase] = useState('walkout');
  const [commentary, setCommentary] = useState('');
  const [highlights, setHighlights] = useState<MatchEvent[]>([]);
  const [goalFlash, setGoalFlash] = useState(false);
  const [attackDirection, setAttackDirection] = useState<'home' | 'away'>('home');
  const [liveStats, setLiveStats] = useState<LiveStats>({});

  const loadMatch = useCallback(async () => {
    try {
      const res = await api<MatchData>(`/matches/${matchId}`);
      setData(res);
      setHighlights(res.events || []);
    } catch (err) {
      console.error(err);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
    const socket = getSharedSocket();

    const onUpdate = (update: {
      matchId: string; minute: number; phase?: string;
      homeScore?: number; awayScore?: number;
      events?: MatchEvent[]; commentary?: string;
      attackDirection?: 'home' | 'away';
      possessionHome?: number;
      stats?: LiveStats;
    }) => {
      if (update.matchId !== matchId) return;
      if (update.phase) setPhase(update.phase);
      if (update.minute !== undefined) setMinute(update.minute);
      if (update.commentary) setCommentary(update.commentary);
      if (update.attackDirection) setAttackDirection(update.attackDirection);
      if (update.stats) setLiveStats(update.stats);
      if (update.homeScore !== undefined) {
        setData((prev) => prev ? {
          ...prev,
          match: {
            ...prev.match,
            home_score: update.homeScore!,
            away_score: update.awayScore!,
            possession_home: update.possessionHome ?? prev.match.possession_home,
            possession_away: update.possessionHome !== undefined ? 100 - update.possessionHome : prev.match.possession_away,
            shots_home: update.stats?.shotsHome ?? prev.match.shots_home,
            shots_away: update.stats?.shotsAway ?? prev.match.shots_away,
            shots_on_target_home: update.stats?.shotsOnTargetHome ?? prev.match.shots_on_target_home,
            shots_on_target_away: update.stats?.shotsOnTargetAway ?? prev.match.shots_on_target_away,
            xg_home: update.stats?.xgHome ?? prev.match.xg_home,
            xg_away: update.stats?.xgAway ?? prev.match.xg_away,
            corners_home: update.stats?.cornersHome ?? prev.match.corners_home,
            corners_away: update.stats?.cornersAway ?? prev.match.corners_away,
            yellow_cards_home: update.stats?.yellowHome ?? prev.match.yellow_cards_home,
            yellow_cards_away: update.stats?.yellowAway ?? prev.match.yellow_cards_away,
            red_cards_home: update.stats?.redHome ?? prev.match.red_cards_home,
            red_cards_away: update.stats?.redAway ?? prev.match.red_cards_away,
            fouls_home: update.stats?.foulsHome ?? prev.match.fouls_home,
            fouls_away: update.stats?.foulsAway ?? prev.match.fouls_away,
          },
        } : prev);
      }
      if (update.events?.length) {
        setHighlights((prev) => [...prev, ...update.events!]);
      }
    };

    socket.on('match:update', onUpdate);
    socket.on('match:goal', ({ matchId: id }: { matchId: string }) => {
      if (id === matchId) {
        setGoalFlash(true);
        setTimeout(() => setGoalFlash(false), 2500);
      }
    });
    socket.on('match:finished', ({ matchId: id }: { matchId: string }) => {
      if (id === matchId) loadMatch();
    });

    return () => {
      socket.off('match:update', onUpdate);
      socket.off('match:goal');
      socket.off('match:finished');
    };
  }, [matchId, loadMatch]);

  if (!data) {
    return (
      <div className="premium-match-shell p-12 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const m = data.match;
  const badge = phaseBadge(phase);
  const possession = m.possession_home || 50;

  const stats = [
    { label: 'Shots', h: liveStats.shotsHome ?? m.shots_home, a: liveStats.shotsAway ?? m.shots_away },
    { label: 'On Target', h: liveStats.shotsOnTargetHome ?? m.shots_on_target_home ?? 0, a: liveStats.shotsOnTargetAway ?? m.shots_on_target_away ?? 0 },
    { label: 'Corners', h: liveStats.cornersHome ?? m.corners_home, a: liveStats.cornersAway ?? m.corners_away },
    { label: 'Yellow', h: liveStats.yellowHome ?? m.yellow_cards_home, a: liveStats.yellowAway ?? m.yellow_cards_away, emoji: '🟨' },
    { label: 'Red', h: liveStats.redHome ?? m.red_cards_home ?? 0, a: liveStats.redAway ?? m.red_cards_away ?? 0, emoji: '🟥' },
    { label: 'Fouls', h: liveStats.foulsHome ?? m.fouls_home ?? 0, a: liveStats.foulsAway ?? m.fouls_away ?? 0 },
    { label: 'xG', h: Number(liveStats.xgHome ?? m.xg_home ?? 0).toFixed(1), a: Number(liveStats.xgAway ?? m.xg_away ?? 0).toFixed(1) },
  ];

  return (
    <div className="premium-match-shell overflow-hidden">
      <div className="relative px-4 sm:px-6 py-4 border-b border-primary-500/15 bg-gradient-to-r from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={badge.className}>{badge.label}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">SkyBet Virtuals</span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-black text-primary-500 tabular-nums glow-text-green">
            {formatTimer(minute, phase)}
          </div>
        </div>
      </div>

      <div className={`px-4 sm:px-8 py-8 sm:py-10 transition-colors duration-700 ${goalFlash ? 'bg-primary-500/10' : ''}`}>
        <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
          <TeamBlock
            name={m.home_team_name}
            short={m.home_short}
            logoUrl={m.home_logo}
            stars={m.home_star_rating}
            align="left"
          />
          <div className="text-center shrink-0">
            <p
              className={`score-glow text-5xl sm:text-7xl font-black tabular-nums tracking-wider transition-colors duration-500 ${
                goalFlash ? 'text-accent-400 scale-105' : 'text-white'
              }`}
            >
              {m.home_score}
              <span className="text-primary-500/60 mx-2 sm:mx-4">-</span>
              {m.away_score}
            </p>
            {goalFlash && (
              <p className="text-accent-400 font-black text-sm mt-2 tracking-[0.3em] animate-pulse">GOOOAL!</p>
            )}
          </div>
          <TeamBlock
            name={m.away_team_name}
            short={m.away_short}
            logoUrl={m.away_logo}
            stars={m.away_star_rating}
            align="right"
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <AnimatedPitch
          minute={minute}
          phase={phase}
          possessionHome={possession}
          attackDirection={attackDirection}
          goalFlash={goalFlash}
          homeShort={m.home_short}
          awayShort={m.away_short}
        />
      </div>

      {commentary && (
        <div className="mx-4 mb-4">
          <div className="glass-commentary px-4 py-3 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-primary-500 text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5">📢 Live</span>
              <p className="text-gray-100 text-sm leading-relaxed">{commentary}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <StatBar label="Possession" home={possession} away={100 - possession} suffix="%" />
      </div>

      <div className="px-4 pb-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {highlights.length > 0 && (
        <div className="border-t border-white/5 px-4 py-4 bg-black/20 max-h-44 overflow-y-auto">
          <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Match Commentary</h4>
          <div className="space-y-1.5">
            {highlights.slice(-12).reverse().map((e, i) => (
              <div key={`${e.minute}-${i}`} className="text-xs flex gap-2 py-1 border-b border-white/5 last:border-0">
                <span className="text-primary-500 font-mono font-bold w-8 shrink-0">{e.minute}&apos;</span>
                <span className="text-gray-300 leading-relaxed">{e.description || e.event_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamBlock({
  name, short, logoUrl, stars, align,
}: {
  name: string; short: string; logoUrl?: string; stars?: number; align: 'left' | 'right';
}) {
  return (
    <div className={`flex flex-col items-center gap-2 flex-1 min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <TeamLogo short={short} logoUrl={logoUrl} size="xl" />
      <p className="font-bold text-white text-sm sm:text-base truncate max-w-[120px]">{name}</p>
      {stars && <StarRating rating={stars} size="md" />}
    </div>
  );
}

function StatBar({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-semibold">
        <span className="text-primary-500">{home}{suffix}</span>
        <span className="text-gray-500">{label}</span>
        <span className="text-blue-400">{away}{suffix}</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-dark-800 gap-px">
        <div className="bg-gradient-to-r from-primary-600 to-primary-400 rounded-l-full transition-[width] duration-700 ease-out" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-r-full transition-[width] duration-700 ease-out" style={{ width: `${(away / total) * 100}%` }} />
      </div>
    </div>
  );
}

function StatCard({ label, h, a, emoji }: { label: string; h: number | string; a: number | string; emoji?: string }) {
  return (
    <div className="stat-card-premium text-center">
      <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">{emoji ? `${emoji} ` : ''}{label}</p>
      <div className="flex justify-between font-bold text-sm tabular-nums">
        <span className="text-primary-500">{h}</span>
        <span className="text-gray-600">-</span>
        <span className="text-blue-400">{a}</span>
      </div>
    </div>
  );
}
