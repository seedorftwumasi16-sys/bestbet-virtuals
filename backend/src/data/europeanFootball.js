/** European virtual football leagues & clubs — inspired by top European competitions */

export const EUROPEAN_LEAGUES = [
  { code: 'EPL', name: 'Premier League', country: 'England', logo: '🇬🇧' },
  { code: 'LAL', name: 'La Liga', country: 'Spain', logo: '🇪🇸' },
  { code: 'BUN', name: 'Bundesliga', country: 'Germany', logo: '🇩🇪' },
  { code: 'SER', name: 'Serie A', country: 'Italy', logo: '🇮🇹' },
  { code: 'L1', name: 'Ligue 1', country: 'France', logo: '🇫🇷' },
];

export const EUROPEAN_TEAMS = [
  // Premier League
  { name: 'Arsenal', short: 'ARS', league: 'Premier League', strength: 88, colorPrimary: '#EF0107', colorSecondary: '#FFFFFF' },
  { name: 'Manchester City', short: 'MCI', league: 'Premier League', strength: 92, colorPrimary: '#6CABDD', colorSecondary: '#FFFFFF' },
  { name: 'Liverpool', short: 'LIV', league: 'Premier League', strength: 90, colorPrimary: '#C8102E', colorSecondary: '#FFFFFF' },
  { name: 'Chelsea', short: 'CHE', league: 'Premier League', strength: 86, colorPrimary: '#034694', colorSecondary: '#FFFFFF' },
  { name: 'Manchester United', short: 'MUN', league: 'Premier League', strength: 85, colorPrimary: '#DA291C', colorSecondary: '#FBE122' },
  { name: 'Tottenham', short: 'TOT', league: 'Premier League', strength: 84, colorPrimary: '#132257', colorSecondary: '#FFFFFF' },
  { name: 'Newcastle United', short: 'NEW', league: 'Premier League', strength: 82, colorPrimary: '#241F20', colorSecondary: '#FFFFFF' },
  { name: 'Aston Villa', short: 'AVL', league: 'Premier League', strength: 80, colorPrimary: '#95BFE5', colorSecondary: '#670E36' },
  { name: 'Brighton', short: 'BHA', league: 'Premier League', strength: 78, colorPrimary: '#0057B8', colorSecondary: '#FFFFFF' },
  { name: 'West Ham', short: 'WHU', league: 'Premier League', strength: 77, colorPrimary: '#7A263A', colorSecondary: '#1BB1E7' },
  // La Liga
  { name: 'Real Madrid', short: 'RMA', league: 'La Liga', strength: 93, colorPrimary: '#FFFFFF', colorSecondary: '#FEBE10' },
  { name: 'Barcelona', short: 'BAR', league: 'La Liga', strength: 91, colorPrimary: '#A50044', colorSecondary: '#004D98' },
  { name: 'Atletico Madrid', short: 'ATM', league: 'La Liga', strength: 87, colorPrimary: '#CB3524', colorSecondary: '#FFFFFF' },
  { name: 'Sevilla', short: 'SEV', league: 'La Liga', strength: 80, colorPrimary: '#FFFFFF', colorSecondary: '#D6001C' },
  { name: 'Real Sociedad', short: 'RSO', league: 'La Liga', strength: 79, colorPrimary: '#0067B1', colorSecondary: '#FFFFFF' },
  { name: 'Villarreal', short: 'VIL', league: 'La Liga', strength: 78, colorPrimary: '#FFE114', colorSecondary: '#005187' },
  { name: 'Athletic Bilbao', short: 'ATH', league: 'La Liga', strength: 77, colorPrimary: '#EE2523', colorSecondary: '#FFFFFF' },
  { name: 'Valencia', short: 'VAL', league: 'La Liga', strength: 76, colorPrimary: '#FFFFFF', colorSecondary: '#FF6600' },
  { name: 'Real Betis', short: 'BET', league: 'La Liga', strength: 75, colorPrimary: '#00954C', colorSecondary: '#FFFFFF' },
  // Bundesliga
  { name: 'Bayern Munich', short: 'BAY', league: 'Bundesliga', strength: 92, colorPrimary: '#DC052D', colorSecondary: '#0066B2' },
  { name: 'Borussia Dortmund', short: 'BVB', league: 'Bundesliga', strength: 86, colorPrimary: '#FDE100', colorSecondary: '#000000' },
  { name: 'Bayer Leverkusen', short: 'LEV', league: 'Bundesliga', strength: 84, colorPrimary: '#E32221', colorSecondary: '#000000' },
  { name: 'RB Leipzig', short: 'RBL', league: 'Bundesliga', strength: 83, colorPrimary: '#DD0741', colorSecondary: '#FFFFFF' },
  { name: 'Eintracht Frankfurt', short: 'SGE', league: 'Bundesliga', strength: 79, colorPrimary: '#E1000F', colorSecondary: '#000000' },
  { name: 'Stuttgart', short: 'STU', league: 'Bundesliga', strength: 77, colorPrimary: '#FFFFFF', colorSecondary: '#E32219' },
  { name: 'Wolfsburg', short: 'WOB', league: 'Bundesliga', strength: 76, colorPrimary: '#65B32E', colorSecondary: '#FFFFFF' },
  { name: 'Freiburg', short: 'SCF', league: 'Bundesliga', strength: 75, colorPrimary: '#E4002B', colorSecondary: '#000000' },
  // Serie A
  { name: 'Inter Milan', short: 'INT', league: 'Serie A', strength: 90, colorPrimary: '#010E80', colorSecondary: '#000000' },
  { name: 'AC Milan', short: 'MIL', league: 'Serie A', strength: 87, colorPrimary: '#FB090B', colorSecondary: '#000000' },
  { name: 'Juventus', short: 'JUV', league: 'Serie A', strength: 86, colorPrimary: '#000000', colorSecondary: '#FFFFFF' },
  { name: 'Napoli', short: 'NAP', league: 'Serie A', strength: 85, colorPrimary: '#12A0D7', colorSecondary: '#FFFFFF' },
  { name: 'Roma', short: 'ROM', league: 'Serie A', strength: 82, colorPrimary: '#8E1F2F', colorSecondary: '#F0BC42' },
  { name: 'Lazio', short: 'LAZ', league: 'Serie A', strength: 80, colorPrimary: '#87D8F7', colorSecondary: '#FFFFFF' },
  { name: 'Atalanta', short: 'ATA', league: 'Serie A', strength: 79, colorPrimary: '#1E71B8', colorSecondary: '#000000' },
  { name: 'Fiorentina', short: 'FIO', league: 'Serie A', strength: 77, colorPrimary: '#482E92', colorSecondary: '#FFFFFF' },
  // Ligue 1
  { name: 'Paris Saint-Germain', short: 'PSG', league: 'Ligue 1', strength: 91, colorPrimary: '#004170', colorSecondary: '#DA291C' },
  { name: 'Marseille', short: 'OM', league: 'Ligue 1', strength: 82, colorPrimary: '#2FAEE0', colorSecondary: '#FFFFFF' },
  { name: 'Monaco', short: 'MON', league: 'Ligue 1', strength: 81, colorPrimary: '#E30613', colorSecondary: '#FFFFFF' },
  { name: 'Lyon', short: 'OL', league: 'Ligue 1', strength: 80, colorPrimary: '#FFFFFF', colorSecondary: '#0F2D6B' },
  { name: 'Lille', short: 'LIL', league: 'Ligue 1', strength: 78, colorPrimary: '#E30613', colorSecondary: '#FFFFFF' },
  { name: 'Nice', short: 'NIC', league: 'Ligue 1', strength: 77, colorPrimary: '#E30613', colorSecondary: '#000000' },
  { name: 'Lens', short: 'RCL', league: 'Ligue 1', strength: 76, colorPrimary: '#D2122E', colorSecondary: '#FCD116' },
  { name: 'Rennes', short: 'REN', league: 'Ligue 1', strength: 75, colorPrimary: '#E30613', colorSecondary: '#000000' },
];

export const MATCH_INTERVAL_PRESETS = [
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
  { label: '3 minutes', seconds: 180 },
  { label: '5 minutes', seconds: 300 },
];

export const DEFAULT_MATCH_INTERVAL_SECONDS = 60;
export const DEFAULT_BETTING_CLOSE_SECONDS = 10;
