import { useId } from 'react';
import { getTeamColors } from '@/lib/teamColors';

export default function TeamLogo({
  short,
  logoUrl,
  size = 'md',
  highlight,
}: {
  short: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlight?: 'gold' | 'silver' | 'bronze';
}) {
  const uid = useId();
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-[8px]', rx: 8 },
    md: { box: 'w-11 h-11', text: 'text-[9px]', rx: 10 },
    lg: { box: 'w-16 h-16', text: 'text-[11px]', rx: 12 },
    xl: { box: 'w-20 h-20', text: 'text-sm', rx: 14 },
  };

  const dim = sizes[size];

  const ring =
    highlight === 'gold'
      ? 'ring-2 ring-accent-500 shadow-gold'
      : highlight === 'silver'
        ? 'ring-2 ring-silver-400 shadow-[0_0_12px_rgba(192,192,192,0.3)]'
        : highlight === 'bronze'
          ? 'ring-2 ring-bronze-400 shadow-[0_0_12px_rgba(205,127,50,0.3)]'
          : 'ring-1 ring-white/15';

  if (logoUrl) {
    return (
      <div className={`${dim.box} ${ring} rounded-xl overflow-hidden shrink-0 bg-dark-800`}>
        <img
          src={logoUrl}
          alt={short}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  const colors = getTeamColors(short);
  const initials = short.slice(0, 3).toUpperCase();
  const stripe = colors.stripe || colors.accent;
  const gradId = `bg-${uid}`;

  return (
    <div
      className={`${dim.box} ${ring} shrink-0 relative overflow-hidden shadow-lg`}
      style={{ borderRadius: dim.rx }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor={colors.bg} />
            <stop offset="100%" stopColor={stripe} />
          </linearGradient>
        </defs>
        <path
          d="M24 3 L42 10 L42 24 Q42 38 24 44 Q6 38 6 24 L6 10 Z"
          fill={`url(#${gradId})`}
        />
        <path d="M6 10 L24 3 L42 10 L24 18 Z" fill={stripe} opacity="0.35" />
        <path d="M6 24 L6 10 L24 18 L24 44 Z" fill="#000" opacity="0.12" />
        <path
          d="M24 8 L38 13 L38 24 Q38 34 24 38 Q10 34 10 24 L10 13 Z"
          fill="none"
          stroke={colors.accent}
          strokeWidth="1.2"
          opacity="0.45"
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-black tracking-tighter ${dim.text}`}
        style={{ color: colors.accent, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {initials}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[30%]"
        style={{ background: `linear-gradient(transparent, ${colors.accent}33)` }}
      />
    </div>
  );
}
