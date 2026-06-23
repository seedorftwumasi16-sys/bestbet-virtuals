'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import TeamLogo from '@/components/ui/TeamLogo';
import StarRating from '@/components/ui/StarRating';

interface Result {
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
  finished_at: string;
  winning_team?: string;
  top_scorer?: string;
  shots_home?: number;
  shots_away?: number;
  shots_on_target_home?: number;
  shots_on_target_away?: number;
  xg_home?: number;
  xg_away?: number;
  corners_home: number;
  corners_away: number;
  yellow_cards_home?: number;
  yellow_cards_away?: number;
  possession_home?: number;
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Result[]>('/matches/results')
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading results..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black mb-2 text-white">Match Results</h1>
      <p className="text-gray-500 text-sm mb-6">Full-time scores, statistics and top scorers</p>

      {results.length === 0 ? (
        <div className="premium-match-card text-center py-12 text-gray-500">No finished matches yet</div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.id} className="premium-match-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-gray-500 uppercase">
                  {new Date(r.finished_at).toLocaleDateString()} · FULL TIME
                </span>
                {r.winning_team && r.winning_team !== 'Draw' && (
                  <span className="text-xs text-primary-500 font-bold">Winner: {r.winning_team}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-center flex-1">
                  <TeamLogo short={r.home_short} logoUrl={r.home_logo} size="lg" />
                  <p className="text-xs text-gray-300 mt-2 font-medium truncate">{r.home_team_name}</p>
                  {r.home_star_rating && <StarRating rating={r.home_star_rating} />}
                </div>
                <p className="text-3xl font-black text-white score-glow-sm tabular-nums shrink-0">
                  {r.home_score} - {r.away_score}
                </p>
                <div className="text-center flex-1">
                  <TeamLogo short={r.away_short} logoUrl={r.away_logo} size="lg" />
                  <p className="text-xs text-gray-300 mt-2 font-medium truncate">{r.away_team_name}</p>
                  {r.away_star_rating && <StarRating rating={r.away_star_rating} />}
                </div>
              </div>

              {r.top_scorer && (
                <p className="text-sm text-accent-400 mb-3 text-center">
                  ⚽ Top Scorer: <span className="text-white font-semibold">{r.top_scorer}</span>
                </p>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                <Stat label="Shots" v={`${r.shots_home ?? 0}-${r.shots_away ?? 0}`} />
                <Stat label="On Target" v={`${r.shots_on_target_home ?? 0}-${r.shots_on_target_away ?? 0}`} />
                <Stat label="xG" v={`${Number(r.xg_home ?? 0).toFixed(1)}-${Number(r.xg_away ?? 0).toFixed(1)}`} />
                <Stat label="Corners" v={`${r.corners_home}-${r.corners_away}`} />
                <Stat label="Yellow" v={`${r.yellow_cards_home ?? 0}-${r.yellow_cards_away ?? 0}`} />
                <Stat label="Poss %" v={`${r.possession_home ?? 50}-${100 - (r.possession_home ?? 50)}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="stat-card-premium">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="text-white font-bold">{v}</p>
    </div>
  );
}
