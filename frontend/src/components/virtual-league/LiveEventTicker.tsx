'use client';

import { useEffect, useState } from 'react';
import { getSharedSocket } from '@/lib/socket';

interface TickerEvent {
  id: string;
  type: string;
  minute: number;
  player?: string;
  team?: string;
}

const ICONS: Record<string, string> = {
  goal: '⚽ Goal',
  yellow_card: '🟨 Yellow Card',
  red_card: '🟥 Red Card',
  substitution: '🔄 Substitution',
  corner: '🚩 Corner',
  foul: '⚠️ Foul',
};

export default function LiveEventTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);

  useEffect(() => {
    const socket = getSharedSocket();
    const onTicker = (data: { matchId: string; type: string; minute: number; player?: string; team?: string }) => {
      setEvents((prev) => [
        { id: `${data.matchId}-${data.minute}-${data.type}-${Date.now()}`, ...data },
        ...prev,
      ].slice(0, 12));
    };
    socket.on('match:ticker', onTicker);
    return () => { socket.off('match:ticker', onTicker); };
  }, []);

  if (!events.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary-500/20 bg-dark-900/80 backdrop-blur-md mb-4">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Live Match Feed</span>
      </div>
      <div className="flex gap-6 px-4 py-2.5 animate-ticker whitespace-nowrap">
        {events.map((e) => (
          <span key={e.id} className="text-xs text-gray-300 shrink-0">
            <span className="text-primary-500 font-bold">{ICONS[e.type] || e.type}</span>
            {e.player && <span className="text-white ml-1">{e.player}</span>}
            <span className="text-gray-500 ml-1.5">{e.minute}&apos;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
