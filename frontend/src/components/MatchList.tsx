'use client';

import { useMemo } from 'react';
import MatchCard from '@/components/MatchCard';
import { MatchCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { IconFootball } from '@/components/icons/FootballIcons';
import { useMatchesData } from '@/context/MatchesDataContext';
import { useCountdown } from '@/hooks/useCountdown';

export default function MatchList() {
  const { upcoming: matches, loading, error } = useMatchesData();

  const nextScheduled = useMemo(
    () => matches.find((m) => m.status === 'scheduled')?.scheduled_at ?? null,
    [matches]
  );
  const timeLeft = useCountdown(nextScheduled);

  if (loading && matches.length === 0) {
    return (
      <div className="space-y-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section id="upcoming">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <IconFootball size={20} className="text-primary-500" />
            Upcoming Matches
          </h2>
          {timeLeft && (
            <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl border border-primary-500/20">
              <span className="text-gray-400 text-xs font-medium">Next kickoff</span>
              <span className="text-primary-500 font-mono font-black text-sm tabular-nums">{timeLeft}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="glass-panel text-center py-8 text-red-400 border border-red-500/30 mb-4">
            <p className="font-semibold">Could not load matches</p>
            <p className="text-sm mt-1 text-gray-400">{error}</p>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="glass-panel text-center py-12 text-gray-500 border border-dark-600/40">
            <p className="text-lg font-semibold text-gray-400">No upcoming matches</p>
            <p className="text-sm mt-1">New matches generate automatically every few minutes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.id}>
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
