/** European club badge palettes */
export interface TeamPalette {
  bg: string;
  accent: string;
  text: string;
  stripe?: string;
}

const TEAM_PALETTE: Record<string, TeamPalette> = {
  ARS: { bg: '#EF0107', accent: '#FFFFFF', text: '#fff' },
  MCI: { bg: '#6CABDD', accent: '#FFFFFF', text: '#fff' },
  LIV: { bg: '#C8102E', accent: '#FFFFFF', text: '#fff' },
  CHE: { bg: '#034694', accent: '#FFFFFF', text: '#fff' },
  MUN: { bg: '#DA291C', accent: '#FBE122', text: '#fff' },
  TOT: { bg: '#132257', accent: '#FFFFFF', text: '#fff' },
  NEW: { bg: '#241F20', accent: '#FFFFFF', text: '#fff' },
  AVL: { bg: '#670E36', accent: '#95BFE5', text: '#fff' },
  BHA: { bg: '#0057B8', accent: '#FFFFFF', text: '#fff' },
  WHU: { bg: '#7A263A', accent: '#1BB1E7', text: '#fff' },
  RMA: { bg: '#FFFFFF', accent: '#FEBE10', text: '#1a1a1a' },
  BAR: { bg: '#A50044', accent: '#004D98', text: '#fff' },
  ATM: { bg: '#CB3524', accent: '#FFFFFF', text: '#fff' },
  SEV: { bg: '#D6001C', accent: '#FFFFFF', text: '#fff' },
  RSO: { bg: '#0067B1', accent: '#FFFFFF', text: '#fff' },
  VIL: { bg: '#005187', accent: '#FFE114', text: '#fff' },
  ATH: { bg: '#EE2523', accent: '#FFFFFF', text: '#fff' },
  VAL: { bg: '#FF6600', accent: '#FFFFFF', text: '#fff' },
  BET: { bg: '#00954C', accent: '#FFFFFF', text: '#fff' },
  BAY: { bg: '#DC052D', accent: '#0066B2', text: '#fff' },
  BVB: { bg: '#FDE100', accent: '#000000', text: '#000' },
  LEV: { bg: '#E32221', accent: '#000000', text: '#fff' },
  RBL: { bg: '#DD0741', accent: '#FFFFFF', text: '#fff' },
  SGE: { bg: '#E1000F', accent: '#000000', text: '#fff' },
  STU: { bg: '#E32219', accent: '#FFFFFF', text: '#fff' },
  WOB: { bg: '#65B32E', accent: '#FFFFFF', text: '#fff' },
  SCF: { bg: '#E4002B', accent: '#000000', text: '#fff' },
  INT: { bg: '#010E80', accent: '#000000', text: '#fff' },
  MIL: { bg: '#FB090B', accent: '#000000', text: '#fff' },
  JUV: { bg: '#000000', accent: '#FFFFFF', text: '#fff' },
  NAP: { bg: '#12A0D7', accent: '#FFFFFF', text: '#fff' },
  ROM: { bg: '#8E1F2F', accent: '#F0BC42', text: '#fff' },
  LAZ: { bg: '#87D8F7', accent: '#FFFFFF', text: '#1a1a1a' },
  ATA: { bg: '#1E71B8', accent: '#000000', text: '#fff' },
  FIO: { bg: '#482E92', accent: '#FFFFFF', text: '#fff' },
  PSG: { bg: '#004170', accent: '#DA291C', text: '#fff' },
  OM: { bg: '#2FAEE0', accent: '#FFFFFF', text: '#fff' },
  MON: { bg: '#E30613', accent: '#FFFFFF', text: '#fff' },
  OL: { bg: '#0F2D6B', accent: '#FFFFFF', text: '#fff' },
  LIL: { bg: '#E30613', accent: '#FFFFFF', text: '#fff' },
  NIC: { bg: '#E30613', accent: '#000000', text: '#fff' },
  RCL: { bg: '#D2122E', accent: '#FCD116', text: '#fff' },
  REN: { bg: '#E30613', accent: '#000000', text: '#fff' },
};

export const LEAGUE_META: Record<string, { flag: string; color: string }> = {
  'Premier League': { flag: '🇬🇧', color: '#3D195B' },
  'La Liga': { flag: '🇪🇸', color: '#EE324E' },
  Bundesliga: { flag: '🇩🇪', color: '#D20515' },
  'Serie A': { flag: '🇮🇹', color: '#008FD7' },
  'Ligue 1': { flag: '🇫🇷', color: '#091C3E' },
};

const FALLBACK_PALETTE: TeamPalette[] = [
  { bg: '#0d4f3c', accent: '#00E676', text: '#fff' },
  { bg: '#1a3a5c', accent: '#4fc3f7', text: '#fff' },
  { bg: '#4a1942', accent: '#e040fb', text: '#fff' },
  { bg: '#5c3d1a', accent: '#FFD700', text: '#fff' },
];

export function getTeamColors(short: string): TeamPalette {
  const key = short?.toUpperCase().slice(0, 3);
  if (key && TEAM_PALETTE[key]) return TEAM_PALETTE[key];

  let hash = 0;
  for (let i = 0; i < (short || '').length; i++) hash = short.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

export const VIRTUAL_TEAMS = Object.keys(TEAM_PALETTE);
