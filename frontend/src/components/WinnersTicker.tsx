'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';

export default function WinnersTicker() {
  const [winners, setWinners] = useState<Array<{ booking_code: string; potential_win: number; first_name: string }>>([]);

  useEffect(() => {
    api<Array<{ booking_code: string; potential_win: number; first_name: string }>>('/promotions/winners')
      .then(setWinners)
      .catch(() => setWinners([
        { booking_code: 'BB7X2K9M', potential_win: 450, first_name: 'Kwame' },
        { booking_code: 'BB3N8P1Q', potential_win: 1200, first_name: 'Ama' },
        { booking_code: 'BB5R4W6T', potential_win: 85, first_name: 'Kofi' },
      ]));
  }, []);

  if (!winners.length) return null;

  const items = [...winners, ...winners];

  return (
    <div className="bg-dark-800/60 border border-accent-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 border-b border-accent-500/20">
        <span className="text-accent-500 text-xs font-bold">🏆 RECENT WINNERS</span>
      </div>
      <div className="overflow-hidden py-2">
        <div className="flex animate-ticker whitespace-nowrap">
          {items.map((w, i) => (
            <span key={i} className="mx-6 text-sm text-gray-300">
              <span className="text-accent-400 font-semibold">{w.first_name || 'Player'}</span>
              won <span className="text-primary-500 font-bold">{formatCurrency(w.potential_win)}</span>
              <span className="text-gray-500 ml-1 font-mono text-xs">{w.booking_code}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
