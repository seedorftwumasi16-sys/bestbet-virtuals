'use client';

import { useMemo } from 'react';

interface AnimatedPitchProps {
  minute: number;
  phase: string;
  possessionHome: number;
  attackDirection?: 'home' | 'away';
  goalFlash?: boolean;
  homeShort: string;
  awayShort: string;
}

export default function AnimatedPitch({
  minute,
  phase,
  possessionHome,
  attackDirection = 'home',
  goalFlash = false,
  homeShort,
  awayShort,
}: AnimatedPitchProps) {
  const ballX = useMemo(() => {
    const base = attackDirection === 'home' ? 25 + possessionHome * 0.45 : 75 - possessionHome * 0.45;
    const wobble = Math.sin(minute * 0.4) * 8;
    return Math.min(88, Math.max(12, base + wobble));
  }, [minute, possessionHome, attackDirection]);

  const isLive = ['live', 'kickoff', 'first_half', 'second_half'].includes(phase);

  return (
    <div className="relative w-full aspect-[2.1/1] max-h-52 rounded-2xl overflow-hidden border border-primary-500/25 shadow-neon-pitch">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818] via-[#1a4d2e] to-[#0a1f12]" />
      <div
        className="absolute inset-0 opacity-30 transition-all duration-1000 ease-out"
        style={{
          background: `linear-gradient(90deg, rgba(0,230,118,0.35) 0%, rgba(0,230,118,0.35) ${possessionHome}%, transparent ${possessionHome}%, transparent 100%)`,
        }}
      />
      {goalFlash && (
        <div className="absolute inset-0 bg-accent-500/25 animate-pulse z-20 pointer-events-none" />
      )}
      <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <rect x="2" y="2" width="96" height="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        <line x1="50" y1="2" x2="50" y2="48" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
        <circle cx="50" cy="25" r="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
        <rect x="2" y="14" width="12" height="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
        <rect x="86" y="14" width="12" height="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
        {isLive && (
          <>
            <defs>
              <radialGradient id="ballGlow">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="100%" stopColor="#00E676" />
              </radialGradient>
            </defs>
            <circle cx={ballX} cy="25" r="1.8" fill="url(#ballGlow)" className="pitch-ball">
              <animate attributeName="cy" values="25;23;25;27;25" dur="2s" repeatCount="indefinite" />
            </circle>
            {attackDirection === 'home' ? (
              <polygon points={`${ballX + 2},25 ${ballX + 6},23 ${ballX + 6},27`} fill="rgba(0,230,118,0.6)" />
            ) : (
              <polygon points={`${ballX - 2},25 ${ballX - 6},23 ${ballX - 6},27`} fill="rgba(59,130,246,0.6)" />
            )}
          </>
        )}
      </svg>
      <div className="absolute top-2 left-3 text-[9px] font-bold text-white/50 uppercase tracking-widest">{homeShort}</div>
      <div className="absolute top-2 right-3 text-[9px] font-bold text-white/50 uppercase tracking-widest">{awayShort}</div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 text-[9px] text-white/40 font-mono">
        <span>{possessionHome}%</span>
        <span>POSSESSION</span>
        <span>{100 - possessionHome}%</span>
      </div>
    </div>
  );
}
