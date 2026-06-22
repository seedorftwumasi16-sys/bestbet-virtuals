'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Result {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  home_score: number;
  away_score: number;
  finished_at: string;
  corners_home: number;
  corners_away: number;
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
      <h1 className="text-2xl font-black mb-6">Match History</h1>

      {results.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No finished matches yet</div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-xs font-bold">{r.home_short}</div>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[70px] truncate">{r.home_team_name}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-primary-500">{r.home_score} - {r.away_score}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(r.finished_at).toLocaleDateString()} · FT
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-xs font-bold">{r.away_short}</div>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[70px] truncate">{r.away_team_name}</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 hidden sm:block">
                <p>Corners: {r.corners_home}-{r.corners_away}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
