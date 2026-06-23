'use client';

import { useEffect, useState } from 'react';
import MatchCenter from '@/components/virtual-league/MatchCenter';
import { IconLive } from '@/components/icons/FootballIcons';
import { useMatchesData } from '@/context/MatchesDataContext';

export default function LiveMatchCenterSection() {
  const { live, upcoming, loading } = useMatchesData();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (live.length > 0) {
      setMatchId((prev) => (live.some((m) => m.id === prev) ? prev : live[0].id));
      setIsLive(true);
      return;
    }
    if (upcoming.length > 0) {
      setMatchId((prev) => (upcoming.some((m) => m.id === prev) ? prev : upcoming[0].id));
      setIsLive(false);
      return;
    }
    setMatchId(null);
    setIsLive(false);
  }, [live, upcoming]);

  if (loading && !matchId) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <div className="glass-panel h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!matchId) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            {isLive && <IconLive size={18} />}
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {isLive ? 'Live Match Center' : 'Match Center'}
            </h2>
          </div>
          {isLive && (
            <span className="badge-live flex items-center gap-1.5 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              LIVE
            </span>
          )}
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-auto">
            SkyBet Virtual Stadium
          </span>
        </div>
        <MatchCenter matchId={matchId} />
      </div>
    </section>
  );
}
