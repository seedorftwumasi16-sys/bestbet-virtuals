'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo';
import StarRating from '@/components/ui/StarRating';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PlayerProfile {
  id: string;
  name: string;
  position: string;
  shirt_number: number;
  star_rating: number;
  goals_season: number;
  team_name: string;
  team_short: string;
  logo_url?: string;
  league?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  useEffect(() => {
    api<PlayerProfile[]>('/matches/players')
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const teams = Array.from(new Set(players.map((p) => p.team_name))).sort();
  const filtered = teamFilter ? players.filter((p) => p.team_name === teamFilter) : players;

  if (loading) return <LoadingSpinner text="Loading players..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-white mb-2">Player Profiles</h1>
      <p className="text-gray-500 text-sm mb-6">European squads across 30 clubs</p>

      <div className="flex gap-2 flex-wrap mb-6">
        <button type="button" onClick={() => setTeamFilter(null)} className={`text-xs px-3 py-1.5 rounded-lg ${!teamFilter ? 'bg-primary-500 text-dark-900 font-bold' : 'bg-dark-700 text-gray-400'}`}>
          All Teams
        </button>
        {teams.map((t) => (
          <button key={t} type="button" onClick={() => setTeamFilter(t)} className={`text-xs px-3 py-1.5 rounded-lg truncate max-w-[140px] ${teamFilter === t ? 'bg-primary-500 text-dark-900 font-bold' : 'bg-dark-700 text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="premium-match-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center font-black text-primary-500 text-sm">
              {p.shirt_number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{p.name}</p>
              <p className="text-[10px] text-gray-500">{p.position} · {p.team_name}</p>
              <StarRating rating={p.star_rating} />
            </div>
            <div className="text-right shrink-0">
              <TeamLogo short={p.team_short} logoUrl={p.logo_url} size="sm" />
              <p className="text-xs text-accent-400 font-bold mt-1">{p.goals_season} ⚽</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
