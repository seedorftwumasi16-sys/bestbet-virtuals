'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StadiumHero from '@/components/virtual-league/StadiumHero';
import PremiumLeagueTable, { LeagueEntry } from '@/components/virtual-league/PremiumLeagueTable';
import { LeagueTableSkeleton } from '@/components/ui/LoadingSkeleton';
import { MatchesDataProvider } from '@/context/MatchesDataContext';

export default function LeaguePage() {
  const [table, setTable] = useState<LeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<LeagueEntry[]>('/matches/league-table')
      .then(setTable)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load table'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MatchesDataProvider>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        <StadiumHero />

        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-black text-white">Full League Standings</h2>
            <p className="text-gray-500 text-sm mt-1">Complete virtual league table with form indicators</p>
          </div>

          {error && (
            <div className="glass-panel text-center py-8 text-red-400 border border-red-500/30 mb-4">
              <p className="font-semibold">Could not load league table</p>
              <p className="text-sm mt-1 text-gray-400">{error}</p>
            </div>
          )}

          {loading ? (
            <LeagueTableSkeleton />
          ) : (
            <PremiumLeagueTable table={table} showLink={false} />
          )}
        </div>
      </div>
    </MatchesDataProvider>
  );
}
