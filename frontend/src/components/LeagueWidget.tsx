'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Entry {
  position: number;
  name: string;
  short_name: string;
  played: number;
  points: number;
}

export default function LeagueWidget() {
  const [table, setTable] = useState<Entry[]>([]);

  useEffect(() => {
    api<Entry[]>('/matches/league-table').then((t) => setTable(t.slice(0, 5))).catch(console.error);
  }, []);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h3 className="section-title text-sm">League Standings</h3>
        <Link href="/league" className="text-primary-500 text-xs hover:underline">Full table</Link>
      </div>
      <div className="space-y-1">
        {table.map((t) => (
          <div key={t.position} className="flex items-center gap-3 py-1.5 text-sm">
            <span className={`w-5 text-center font-bold ${t.position <= 3 ? 'text-accent-500' : 'text-gray-500'}`}>
              {t.position}
            </span>
            <span className="text-xs text-gray-500 w-8">{t.short_name}</span>
            <span className="flex-1 truncate">{t.name}</span>
            <span className="text-gray-400 text-xs">{t.played}P</span>
            <span className="text-primary-500 font-bold">{t.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
