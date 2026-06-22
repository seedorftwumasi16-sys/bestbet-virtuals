'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface LeagueEntry {
  position: number;
  name: string;
  short_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

export default function LeaguePage() {
  const [table, setTable] = useState<LeagueEntry[]>([]);

  useEffect(() => {
    api<LeagueEntry[]>('/matches/league-table').then(setTable).catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Virtual League Table</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-dark-600">
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Team</th>
              <th className="py-2 text-center">P</th>
              <th className="py-2 text-center">W</th>
              <th className="py-2 text-center">D</th>
              <th className="py-2 text-center">L</th>
              <th className="py-2 text-center">GF</th>
              <th className="py-2 text-center">GA</th>
              <th className="py-2 text-center">GD</th>
              <th className="py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((t) => (
              <tr key={t.position} className="border-b border-dark-700 hover:bg-dark-700/50">
                <td className="py-3 text-gray-400">{t.position}</td>
                <td className="py-3 font-medium">
                  <span className="text-xs text-gray-500 mr-2">{t.short_name}</span>
                  {t.name}
                </td>
                <td className="py-3 text-center">{t.played}</td>
                <td className="py-3 text-center">{t.won}</td>
                <td className="py-3 text-center">{t.drawn}</td>
                <td className="py-3 text-center">{t.lost}</td>
                <td className="py-3 text-center">{t.goals_for}</td>
                <td className="py-3 text-center">{t.goals_against}</td>
                <td className="py-3 text-center">{t.goals_for - t.goals_against}</td>
                <td className="py-3 text-center font-bold text-primary-500">{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
