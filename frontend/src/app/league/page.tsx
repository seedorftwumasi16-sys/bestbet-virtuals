'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import StadiumHero from '@/components/virtual-league/StadiumHero';
import PremiumLeagueTable, { LeagueEntry } from '@/components/virtual-league/PremiumLeagueTable';
import { LeagueTableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function LeaguePage() {
  const [table, setTable] = useState<LeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<LeagueEntry[]>('/matches/league-table')
      .then(setTable)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      <StadiumHero />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-4">
          <h2 className="text-2xl font-black text-white">Full League Standings</h2>
          <p className="text-gray-500 text-sm mt-1">Complete virtual league table with form indicators</p>
        </div>

        {loading ? (
          <LeagueTableSkeleton />
        ) : (
          <PremiumLeagueTable table={table} showLink={false} />
        )}
      </motion.div>
    </div>
  );
}
