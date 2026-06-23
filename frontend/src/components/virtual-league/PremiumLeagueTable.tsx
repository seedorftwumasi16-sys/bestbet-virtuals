'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import TeamLogo from '@/components/ui/TeamLogo';
import { IconTrophy } from '@/components/icons/FootballIcons';
import { IconMedalGold, IconMedalSilver, IconMedalBronze } from '@/components/icons/FootballIcons';

export interface LeagueEntry {
  position: number;
  team_id?: string;
  name: string;
  short_name: string;
  logo_url?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  form?: string[] | null;
}

function PositionMedal({ position }: { position: number }) {
  if (position === 1) return <IconMedalGold size={22} />;
  if (position === 2) return <IconMedalSilver size={22} />;
  if (position === 3) return <IconMedalBronze size={22} />;
  return <span className="font-bold text-gray-500 w-6 text-center">{position}</span>;
}

function FormDots({ form }: { form?: string[] | null }) {
  const items = (form || []).slice(0, 5);
  if (!items.length) return <span className="text-gray-600 text-xs">—</span>;

  return (
    <div className="flex gap-1 justify-center">
      {items.map((r, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-md text-[9px] font-black flex items-center justify-center transition-transform hover:scale-110 ${
            r === 'W'
              ? 'bg-primary-500/20 text-primary-500 border border-primary-500/40 shadow-[0_0_8px_rgba(0,230,118,0.2)]'
              : r === 'D'
                ? 'bg-gray-500/15 text-gray-300 border border-gray-500/25'
                : 'bg-red-500/12 text-red-400 border border-red-500/25'
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function positionRowClass(position: number) {
  if (position === 1) return 'bg-gradient-to-r from-accent-500/10 via-accent-500/5 to-transparent border-l-2 border-l-accent-500';
  if (position === 2) return 'bg-gradient-to-r from-silver-400/8 via-transparent to-transparent border-l-2 border-l-silver-400';
  if (position === 3) return 'bg-gradient-to-r from-bronze-400/8 via-transparent to-transparent border-l-2 border-l-bronze-400';
  return 'border-l-2 border-l-transparent';
}

export default function PremiumLeagueTable({
  table,
  compact = false,
  showLink = true,
}: {
  table: LeagueEntry[];
  compact?: boolean;
  showLink?: boolean;
}) {
  const rows = compact ? table.slice(0, 6) : table;

  return (
    <div className="glass-panel overflow-hidden border border-primary-500/10 shadow-neon">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600/40 bg-dark-800/60">
        <h3 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <IconTrophy size={18} className="text-accent-500" stroke="#FFD700" />
          League Table
        </h3>
        {showLink && (
          <Link
            href="/league"
            className="text-primary-500 text-xs font-bold hover:text-primary-400 transition-colors flex items-center gap-1"
          >
            Full table
            <span>→</span>
          </Link>
        )}
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 backdrop-blur-xl bg-[#0A0F14]/95">
            <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-dark-600/40">
              <th className="py-3 pl-4 text-left w-10">#</th>
              <th className="py-3 text-left">Team</th>
              <th className="py-3 text-center px-1">Pts</th>
              {!compact && <th className="py-3 text-center px-1">P</th>}
              {!compact && <th className="py-3 text-center px-1">W</th>}
              {!compact && <th className="py-3 text-center px-1">D</th>}
              {!compact && <th className="py-3 text-center px-1">L</th>}
              {!compact && <th className="py-3 text-center px-1">GF</th>}
              {!compact && <th className="py-3 text-center px-1">GA</th>}
              {!compact && <th className="py-3 text-center px-1">GD</th>}
              <th className="py-3 text-center px-2 pr-4">Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const highlight =
                t.position === 1 ? 'gold' : t.position === 2 ? 'silver' : t.position === 3 ? 'bronze' : undefined;
              const gd = t.goals_for - t.goals_against;

              return (
                <motion.tr
                  key={t.team_id || t.short_name || t.position}
                  initial={false}
                  className={`border-b border-dark-600/20 transition-colors cursor-default ${positionRowClass(t.position)}`}
                >
                  <td className="py-3.5 pl-4">
                    <PositionMedal position={t.position} />
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <TeamLogo short={t.short_name} logoUrl={t.logo_url} size="sm" highlight={highlight} />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{t.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{t.short_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center font-black text-primary-500 text-lg">{t.points}</td>
                  {!compact && <td className="py-3.5 text-center text-gray-400">{t.played}</td>}
                  {!compact && <td className="py-3.5 text-center font-semibold">{t.won}</td>}
                  {!compact && <td className="py-3.5 text-center text-gray-400">{t.drawn}</td>}
                  {!compact && <td className="py-3.5 text-center">{t.lost}</td>}
                  {!compact && <td className="py-3.5 text-center text-gray-200">{t.goals_for}</td>}
                  {!compact && <td className="py-3.5 text-center text-gray-400">{t.goals_against}</td>}
                  {!compact && (
                    <td
                      className={`py-3.5 text-center font-bold ${
                        gd > 0 ? 'text-primary-500' : gd < 0 ? 'text-red-400' : 'text-gray-500'
                      }`}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                  )}
                  <td className="py-3.5 pr-4">
                    <FormDots form={t.form} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
