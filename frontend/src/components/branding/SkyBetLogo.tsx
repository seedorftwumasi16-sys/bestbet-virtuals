'use client';

import { motion } from 'framer-motion';

const GREEN = '#00E676';
const GOLD = '#FFD700';
const DARK = '#0A0F14';

/** Icon-only SkyBet badge — favicon & compact UI */
export function SkyBetIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="SkyBet"
    >
      <defs>
        <linearGradient id="sky-icon-bg" x1="4" y1="4" x2="44" y2="44">
          <stop offset="0%" stopColor={GREEN} />
          <stop offset="55%" stopColor="#33eb91" />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id="sky-icon-s" x1="12" y1="8" x2="36" y2="40">
          <stop offset="0%" stopColor={DARK} />
          <stop offset="100%" stopColor="#121A22" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#sky-icon-bg)" />
      <path
        d="M14 32c8-2 12-8 12-16 0-4-2-7-5-9 3 1 5 4 5 8 0 7-4 13-12 17z"
        fill="url(#sky-icon-s)"
        opacity="0.95"
      />
      <path
        d="M22 10c6 0 10 4 10 10 0 5-3 9-8 11 2-2 3-5 3-8 0-6-4-10-9-11 2 0 4 0 6 0z"
        fill={DARK}
        opacity="0.85"
      />
      <circle cx="34" cy="12" r="4" fill={GOLD} opacity="0.95" />
      <circle cx="34" cy="12" r="2.2" stroke={DARK} strokeWidth="0.8" fill="none" opacity="0.4" />
    </svg>
  );
}

/** Main logo mark (icon + compact text) */
export function SkyBetLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <SkyBetIcon size={size} className={className} />;
}

/** Dark-mode optimized wordmark (default on dark backgrounds) */
export function SkyBetLogoDark({
  size = 40,
  className = '',
  showTagline = true,
}: {
  size?: number;
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SkyBetIcon size={size} />
      {showTagline && (
        <div>
          <span className="text-xl font-black tracking-tight leading-none">
            <span className="text-white">Sky</span>
            <span className="text-accent-500">Bet</span>
          </span>
          <span className="text-primary-500 text-[10px] font-bold block tracking-[0.18em] uppercase leading-none mt-0.5">
            Instant Virtuals
          </span>
        </div>
      )}
    </div>
  );
}

export function SkyBetWordmark({
  className = '',
  showTagline = true,
  subtitle = 'Instant Virtuals',
  compact = false,
}: {
  className?: string;
  showTagline?: boolean;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SkyBetIcon size={compact ? 32 : 40} />
      <div>
        <span className={`font-black tracking-tight leading-none ${compact ? 'text-lg' : 'text-xl'}`}>
          <span className="text-white">Sky</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-500">Bet</span>
        </span>
        {showTagline && (
          <>
            <span className="text-primary-500 text-[10px] font-bold block tracking-[0.18em] uppercase leading-none mt-0.5">
              {subtitle}
            </span>
            <span className="text-accent-500/90 text-[9px] font-semibold block tracking-wide mt-0.5">
              Bet Smart, Win More
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Favicon-sized SVG for static export */
export function SkyBetFaviconSvg() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#fbg)" />
      <defs>
        <linearGradient id="fbg" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#00E676" />
          <stop offset="1" stopColor="#FFD700" />
        </linearGradient>
      </defs>
      <path d="M9 22c5-1 8-5 8-11 0-3-1-5-3-6 2 1 3 3 3 5 0 5-3 9-8 12z" fill="#0A0F14" />
      <circle cx="23" cy="8" r="3" fill="#FFD700" />
    </svg>
  );
}

export function HeroPlayerArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="player-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.15" />
        </linearGradient>
        <filter id="blur-glow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <ellipse cx="200" cy="280" rx="140" ry="25" fill="url(#player-glow)" filter="url(#blur-glow)" />
      <g fill={GREEN} opacity="0.85">
        <circle cx="248" cy="95" r="22" />
        <path d="M230 115 Q200 140 175 200 L155 280 L185 285 L200 210 L220 250 L260 240 L235 170 L270 120 Z" />
        <path d="M200 130 L120 100 L100 85 L115 75 L200 115 Z" opacity="0.7" />
        <path d="M255 175 L320 140 L340 155 L300 190 L255 185 Z" />
      </g>
      <path d="M320 130 Q360 110 390 90" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <circle cx="395" cy="88" r="6" fill={GOLD} opacity="0.8" />
      <circle cx="330" cy="125" r="14" fill="#fff" opacity="0.9" />
      <circle cx="330" cy="125" r="14" stroke={GREEN} strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  );
}

export function StadiumLights({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 400" className={className} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="beam-l" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.55" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="beam-r" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.4" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="80" y="60" width="12" height="200" fill="#1a2430" rx="2" />
      <polygon points="60,60 104,60 86,20 78,20" fill="#2a3544" />
      <ellipse cx="86" cy="280" rx="140" ry="200" fill="url(#beam-l)" />
      <rect x="1108" y="60" width="12" height="200" fill="#1a2430" rx="2" />
      <polygon points="1088,60 1152,60 1130,20 1122,20" fill="#2a3544" />
      <ellipse cx="1114" cy="280" rx="140" ry="200" fill="url(#beam-r)" />
      <ellipse cx="600" cy="200" rx="220" ry="140" fill={GREEN} opacity="0.07" />
      <ellipse cx="600" cy="180" rx="160" ry="90" fill={GOLD} opacity="0.04" />
    </svg>
  );
}

/** Animated floating football for hero */
export function FloatingFootball({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`pointer-events-none ${className}`}
      animate={{ y: [0, -18, 0], rotate: [0, 8, -6, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
        <circle cx="28" cy="28" r="26" fill="#f5f5f5" stroke={GREEN} strokeWidth="2" />
        <path d="M28 6 L38 18 L28 28 L18 18 Z" fill={DARK} opacity="0.15" />
        <path d="M28 28 L38 18 L46 28 L38 38 Z" fill={DARK} opacity="0.1" />
        <path d="M28 28 L18 18 L10 28 L18 38 Z" fill={DARK} opacity="0.1" />
        <path d="M28 28 L18 38 L28 50 L38 38 Z" fill={DARK} opacity="0.15" />
        <circle cx="28" cy="28" r="4" fill={GOLD} opacity="0.6" />
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ boxShadow: ['0 0 20px rgba(0,230,118,0.3)', '0 0 40px rgba(255,215,0,0.35)', '0 0 20px rgba(0,230,118,0.3)'] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </motion.div>
  );
}
