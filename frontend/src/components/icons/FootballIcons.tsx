import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = { size: 20, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' };

export function IconTrophy({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 5h12v6a6 6 0 0 1-12 0V5z" />
      <path d="M12 15v3M8 21h8M12 15a6 6 0 0 0 6-6" />
    </svg>
  );
}

export function IconFootball({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M17.4 17.4l-2.8-2.8M5.6 18.4l2.8-2.8M17.4 6.6l-2.8 2.8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" opacity="0.3" />
    </svg>
  );
}

export function IconTimer({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v5l3 2M9 3h6" />
    </svg>
  );
}

export function IconChart({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

export function IconTarget({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCard({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function IconUsers({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 8a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export function IconHome({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H8v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function IconWallet({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </svg>
  );
}

export function IconMedalGold({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="14" r="6" fill="#FFD700" stroke="#e6c200" strokeWidth="1.5" />
      <path d="M9 3l3 5 3-5M7 3h10" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <text x="12" y="16" textAnchor="middle" fill="#0A0F14" fontSize="7" fontWeight="900">1</text>
    </svg>
  );
}

export function IconMedalSilver({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="14" r="6" fill="#c0c0c0" stroke="#a8a8a8" strokeWidth="1.5" />
      <path d="M9 3l3 5 3-5M7 3h10" stroke="#c0c0c0" strokeWidth="1.5" fill="none" />
      <text x="12" y="16" textAnchor="middle" fill="#0A0F14" fontSize="7" fontWeight="900">2</text>
    </svg>
  );
}

export function IconMedalBronze({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="14" r="6" fill="#cd7f32" stroke="#b87333" strokeWidth="1.5" />
      <path d="M9 3l3 5 3-5M7 3h10" stroke="#cd7f32" strokeWidth="1.5" fill="none" />
      <text x="12" y="16" textAnchor="middle" fill="#0A0F14" fontSize="7" fontWeight="900">3</text>
    </svg>
  );
}

export function IconStadium({ size = 20, className, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults} {...p}>
      <path d="M4 18c0-4 3.5-8 8-8s8 4 8 8M6 18h12" />
      <path d="M8 10V6M12 8V4M16 10V6" />
    </svg>
  );
}

export function IconLive({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="4" fill="#ef4444" />
      <circle cx="12" cy="12" r="8" stroke="#ef4444" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="11" stroke="#ef4444" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}
