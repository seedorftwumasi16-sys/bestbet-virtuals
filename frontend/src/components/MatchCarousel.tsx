'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, formatOdds } from '@/lib/api';
import MatchCard from './MatchCard';

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  scheduled_at: string;
  status: string;
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export default function MatchCarousel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api<Match[]>('/matches/upcoming').then((m) => setMatches(m.slice(0, 6))).catch(console.error);
  }, []);

  if (!matches.length) return null;

  const prev = () => setIndex((i) => (i - 1 + matches.length) % matches.length);
  const next = () => setIndex((i) => (i + 1) % matches.length);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Upcoming Matches</h2>
        <div className="flex gap-2">
          <button onClick={prev} className="btn-secondary text-xs py-1 px-3">←</button>
          <button onClick={next} className="btn-secondary text-xs py-1 px-3">→</button>
        </div>
      </div>
      <motion.div key={matches[index].id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <MatchCard match={matches[index]} featured />
      </motion.div>
      <div className="flex justify-center gap-1.5 mt-3">
        {matches.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-primary-500' : 'w-1.5 bg-dark-600'}`}
          />
        ))}
      </div>
    </div>
  );
}
