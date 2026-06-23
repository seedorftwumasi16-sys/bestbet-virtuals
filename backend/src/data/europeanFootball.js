/** European virtual football — exactly 30 clubs across 5 leagues (6 per league) */

export const EUROPEAN_LEAGUES = [
  { code: 'EPL', name: 'Premier League', country: 'England', logo: '🇬🇧' },
  { code: 'LAL', name: 'La Liga', country: 'Spain', logo: '🇪🇸' },
  { code: 'BUN', name: 'Bundesliga', country: 'Germany', logo: '🇩🇪' },
  { code: 'SER', name: 'Serie A', country: 'Italy', logo: '🇮🇹' },
  { code: 'L1', name: 'Ligue 1', country: 'France', logo: '🇫🇷' },
];

export const EXPECTED_TEAM_COUNT = 30;
export const MIN_SQUAD_SIZE = 18;

/** Map overall strength (70–93) to 1–5 star display */
export function strengthToStars(strength) {
  if (strength >= 90) return 5;
  if (strength >= 85) return 4;
  if (strength >= 80) return 3;
  if (strength >= 75) return 2;
  return 1;
}

function team(entry) {
  const strength = entry.strength;
  const starRating = entry.starRating ?? strengthToStars(strength);
  const attack = entry.attack ?? Math.min(99, strength + (entry.attackBias || 0));
  const midfield = entry.midfield ?? Math.min(99, strength + (entry.midBias || 0));
  const defense = entry.defense ?? Math.min(99, strength + (entry.defBias || 0));
  return {
    name: entry.name,
    short: entry.short,
    league: entry.league,
    strength,
    starRating,
    attack,
    midfield,
    defense,
    colorPrimary: entry.colorPrimary,
    colorSecondary: entry.colorSecondary,
    logoUrl: entry.logoUrl || null,
  };
}

export const EUROPEAN_TEAMS = [
  // Premier League (6)
  team({ name: 'Arsenal', short: 'ARS', league: 'Premier League', strength: 88, attackBias: 4, defBias: 2, colorPrimary: '#EF0107', colorSecondary: '#FFFFFF' }),
  team({ name: 'Manchester City', short: 'MCI', league: 'Premier League', strength: 92, attackBias: 5, midBias: 3, colorPrimary: '#6CABDD', colorSecondary: '#FFFFFF' }),
  team({ name: 'Liverpool', short: 'LIV', league: 'Premier League', strength: 90, attackBias: 4, midBias: 2, colorPrimary: '#C8102E', colorSecondary: '#FFFFFF' }),
  team({ name: 'Chelsea', short: 'CHE', league: 'Premier League', strength: 86, midBias: 2, defBias: 1, colorPrimary: '#034694', colorSecondary: '#FFFFFF' }),
  team({ name: 'Tottenham', short: 'TOT', league: 'Premier League', strength: 84, attackBias: 3, colorPrimary: '#132257', colorSecondary: '#FFFFFF' }),
  team({ name: 'Newcastle United', short: 'NEW', league: 'Premier League', strength: 82, defBias: 2, colorPrimary: '#241F20', colorSecondary: '#FFFFFF' }),
  // La Liga (6)
  team({ name: 'Real Madrid', short: 'RMA', league: 'La Liga', strength: 93, attackBias: 5, colorPrimary: '#FFFFFF', colorSecondary: '#FEBE10' }),
  team({ name: 'Barcelona', short: 'BAR', league: 'La Liga', strength: 91, attackBias: 4, midBias: 3, colorPrimary: '#A50044', colorSecondary: '#004D98' }),
  team({ name: 'Atletico Madrid', short: 'ATM', league: 'La Liga', strength: 87, defBias: 5, colorPrimary: '#CB3524', colorSecondary: '#FFFFFF' }),
  team({ name: 'Sevilla', short: 'SEV', league: 'La Liga', strength: 80, midBias: 1, colorPrimary: '#FFFFFF', colorSecondary: '#D6001C' }),
  team({ name: 'Villarreal', short: 'VIL', league: 'La Liga', strength: 78, attackBias: 2, colorPrimary: '#FFE114', colorSecondary: '#005187' }),
  team({ name: 'Real Betis', short: 'BET', league: 'La Liga', strength: 77, midBias: 2, colorPrimary: '#00954C', colorSecondary: '#FFFFFF' }),
  // Bundesliga (6)
  team({ name: 'Bayern Munich', short: 'BAY', league: 'Bundesliga', strength: 92, attackBias: 5, colorPrimary: '#DC052D', colorSecondary: '#0066B2' }),
  team({ name: 'Borussia Dortmund', short: 'BVB', league: 'Bundesliga', strength: 86, attackBias: 4, colorPrimary: '#FDE100', colorSecondary: '#000000' }),
  team({ name: 'Bayer Leverkusen', short: 'LEV', league: 'Bundesliga', strength: 84, attackBias: 3, midBias: 2, colorPrimary: '#E32221', colorSecondary: '#000000' }),
  team({ name: 'RB Leipzig', short: 'RBL', league: 'Bundesliga', strength: 83, midBias: 3, colorPrimary: '#DD0741', colorSecondary: '#FFFFFF' }),
  team({ name: 'Eintracht Frankfurt', short: 'SGE', league: 'Bundesliga', strength: 79, attackBias: 2, colorPrimary: '#E1000F', colorSecondary: '#000000' }),
  team({ name: 'SC Freiburg', short: 'SCF', league: 'Bundesliga', strength: 76, defBias: 3, colorPrimary: '#E4002B', colorSecondary: '#000000' }),
  // Serie A (6)
  team({ name: 'Inter Milan', short: 'INT', league: 'Serie A', strength: 90, midBias: 4, defBias: 2, colorPrimary: '#010E80', colorSecondary: '#000000' }),
  team({ name: 'AC Milan', short: 'MIL', league: 'Serie A', strength: 87, attackBias: 3, colorPrimary: '#FB090B', colorSecondary: '#000000' }),
  team({ name: 'Juventus', short: 'JUV', league: 'Serie A', strength: 86, defBias: 4, colorPrimary: '#000000', colorSecondary: '#FFFFFF' }),
  team({ name: 'Napoli', short: 'NAP', league: 'Serie A', strength: 85, attackBias: 3, colorPrimary: '#12A0D7', colorSecondary: '#FFFFFF' }),
  team({ name: 'AS Roma', short: 'ROM', league: 'Serie A', strength: 82, midBias: 2, colorPrimary: '#8E1F2F', colorSecondary: '#F0BC42' }),
  team({ name: 'Lazio', short: 'LAZ', league: 'Serie A', strength: 80, attackBias: 2, colorPrimary: '#87D8F7', colorSecondary: '#FFFFFF' }),
  // Ligue 1 (6)
  team({ name: 'Paris Saint-Germain', short: 'PSG', league: 'Ligue 1', strength: 91, attackBias: 5, colorPrimary: '#004170', colorSecondary: '#DA291C' }),
  team({ name: 'Olympique Marseille', short: 'OM', league: 'Ligue 1', strength: 82, attackBias: 2, colorPrimary: '#2FAEE0', colorSecondary: '#FFFFFF' }),
  team({ name: 'AS Monaco', short: 'MON', league: 'Ligue 1', strength: 81, attackBias: 3, colorPrimary: '#E30613', colorSecondary: '#FFFFFF' }),
  team({ name: 'Olympique Lyon', short: 'OL', league: 'Ligue 1', strength: 80, midBias: 3, colorPrimary: '#FFFFFF', colorSecondary: '#0F2D6B' }),
  team({ name: 'Lille OSC', short: 'LIL', league: 'Ligue 1', strength: 78, defBias: 2, colorPrimary: '#E30613', colorSecondary: '#FFFFFF' }),
  team({ name: 'RC Lens', short: 'RCL', league: 'Ligue 1', strength: 76, midBias: 1, colorPrimary: '#D2122E', colorSecondary: '#FCD116' }),
];

export const MATCH_INTERVAL_PRESETS = [
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
  { label: '3 minutes', seconds: 180 },
  { label: '5 minutes', seconds: 300 },
];

export const DEFAULT_MATCH_INTERVAL_SECONDS = 120;
export const DEFAULT_BETTING_CLOSE_SECONDS = 10;
