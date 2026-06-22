function generateOdds(homeStrength, awayStrength) {
  const total = homeStrength + awayStrength;
  const homeProb = homeStrength / total;
  const awayProb = awayStrength / total;
  const drawProb = 0.25;

  const homeOdds = Math.max(1.1, (1 / (homeProb * 0.75 + 0.05)) * 0.92);
  const awayOdds = Math.max(1.1, (1 / (awayProb * 0.75 + 0.05)) * 0.92);
  const drawOdds = Math.max(1.5, (1 / drawProb) * 0.92);

  return {
    home: roundOdds(homeOdds),
    away: roundOdds(awayOdds),
    draw: roundOdds(drawOdds),
  };
}

function roundOdds(n) {
  return Math.round(n * 100) / 100;
}

const PLAYER_NAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Adjei', 'Osei', 'Kwarteng', 'Amoah', 'Darko', 'Appiah'];

export function generateMatchOdds(homeStrength = 50, awayStrength = 50) {
  const base = generateOdds(homeStrength, awayStrength);
  const odds = [];

  // Match Winner / Full Time Result
  odds.push({ market: 'match_winner', selection: 'home', odds: base.home });
  odds.push({ market: 'match_winner', selection: 'draw', odds: base.draw });
  odds.push({ market: 'match_winner', selection: 'away', odds: base.away });
  odds.push({ market: 'full_time', selection: 'home', odds: base.home });
  odds.push({ market: 'full_time', selection: 'draw', odds: base.draw });
  odds.push({ market: 'full_time', selection: 'away', odds: base.away });

  // Double Chance
  odds.push({ market: 'double_chance', selection: 'home_or_draw', odds: roundOdds(1 / (1/base.home + 1/base.draw)) });
  odds.push({ market: 'double_chance', selection: 'home_or_away', odds: roundOdds(1 / (1/base.home + 1/base.away)) });
  odds.push({ market: 'double_chance', selection: 'draw_or_away', odds: roundOdds(1 / (1/base.draw + 1/base.away)) });

  // Draw No Bet
  odds.push({ market: 'draw_no_bet', selection: 'home', odds: roundOdds(base.home * 0.75) });
  odds.push({ market: 'draw_no_bet', selection: 'away', odds: roundOdds(base.away * 0.75) });

  // Over/Under
  ['1.5', '2.5', '3.5'].forEach((line) => {
    odds.push({ market: 'over_under', selection: `over_${line}`, odds: roundOdds(1.3 + parseFloat(line) * 0.3 + Math.random() * 0.3) });
    odds.push({ market: 'over_under', selection: `under_${line}`, odds: roundOdds(1.3 + (4 - parseFloat(line)) * 0.3 + Math.random() * 0.3) });
  });

  // BTTS
  odds.push({ market: 'btts', selection: 'yes', odds: roundOdds(1.6 + Math.random() * 0.4) });
  odds.push({ market: 'btts', selection: 'no', odds: roundOdds(1.8 + Math.random() * 0.4) });

  // Correct Score
  ['1-0', '2-0', '2-1', '1-1', '0-0', '0-1', '0-2', '1-2', '3-0', '3-1'].forEach((score) => {
    odds.push({ market: 'correct_score', selection: score, odds: roundOdds(5 + Math.random() * 15) });
  });

  // Half Time
  odds.push({ market: 'half_time', selection: 'home', odds: roundOdds(base.home * 1.8) });
  odds.push({ market: 'half_time', selection: 'draw', odds: roundOdds(2.0 + Math.random() * 0.5) });
  odds.push({ market: 'half_time', selection: 'away', odds: roundOdds(base.away * 1.8) });

  // First / Last Goal
  odds.push({ market: 'first_goal', selection: 'home', odds: roundOdds(base.home * 0.9) });
  odds.push({ market: 'first_goal', selection: 'away', odds: roundOdds(base.away * 0.9) });
  odds.push({ market: 'first_goal', selection: 'no_goal', odds: roundOdds(8 + Math.random() * 5) });
  odds.push({ market: 'last_goal', selection: 'home', odds: roundOdds(base.home * 0.95) });
  odds.push({ market: 'last_goal', selection: 'away', odds: roundOdds(base.away * 0.95) });

  // Total Goals
  for (let i = 0; i <= 5; i++) {
    odds.push({ market: 'total_goals', selection: String(i), odds: roundOdds(3 + Math.random() * 8) });
  }

  // Total Corners / Cards
  odds.push({ market: 'total_corners', selection: 'over_8', odds: roundOdds(1.7 + Math.random() * 0.3) });
  odds.push({ market: 'total_corners', selection: 'under_8', odds: roundOdds(1.9 + Math.random() * 0.3) });
  odds.push({ market: 'total_cards', selection: 'over_3', odds: roundOdds(1.8 + Math.random() * 0.3) });
  odds.push({ market: 'total_cards', selection: 'under_3', odds: roundOdds(1.7 + Math.random() * 0.3) });

  return odds;
}

export function randomPlayerName() {
  return PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
}

export function evaluateSelection(market, selection, match) {
  const {
    home_score, away_score, half_time_home, half_time_away,
    first_goal_team_id, last_goal_team_id, home_team_id, away_team_id,
    corners_home, corners_away, yellow_cards_home, yellow_cards_away,
    red_cards_home, red_cards_away,
  } = match;
  const totalGoals = home_score + away_score;
  const totalCorners = (corners_home || 0) + (corners_away || 0);
  const totalCards = (yellow_cards_home || 0) + (yellow_cards_away || 0) + (red_cards_home || 0) + (red_cards_away || 0);

  switch (market) {
    case 'match_winner':
    case 'full_time':
      if (selection === 'home') return home_score > away_score;
      if (selection === 'away') return away_score > home_score;
      if (selection === 'draw') return home_score === away_score;
      break;
    case 'double_chance':
      if (selection === 'home_or_draw') return home_score >= away_score;
      if (selection === 'home_or_away') return home_score !== away_score;
      if (selection === 'draw_or_away') return away_score >= home_score;
      break;
    case 'draw_no_bet':
      if (selection === 'home') return home_score > away_score;
      if (selection === 'away') return away_score > home_score;
      break;
    case 'over_under': {
      const line = parseFloat(selection.split('_')[1]);
      const isOver = selection.startsWith('over');
      return isOver ? totalGoals > line : totalGoals < line;
    }
    case 'btts':
      if (selection === 'yes') return home_score > 0 && away_score > 0;
      if (selection === 'no') return home_score === 0 || away_score === 0;
      break;
    case 'correct_score':
      return selection === `${home_score}-${away_score}`;
    case 'half_time':
      if (selection === 'home') return half_time_home > half_time_away;
      if (selection === 'away') return half_time_away > half_time_home;
      if (selection === 'draw') return half_time_home === half_time_away;
      break;
    case 'first_goal':
      if (selection === 'no_goal') return totalGoals === 0;
      if (selection === 'home') return first_goal_team_id === home_team_id;
      if (selection === 'away') return first_goal_team_id === away_team_id;
      break;
    case 'last_goal':
      if (selection === 'no_goal') return totalGoals === 0;
      if (selection === 'home') return last_goal_team_id === home_team_id;
      if (selection === 'away') return last_goal_team_id === away_team_id;
      break;
    case 'total_goals':
      return parseInt(selection) === totalGoals;
    case 'total_corners': {
      const line = parseFloat(selection.split('_')[1]);
      return selection.startsWith('over') ? totalCorners > line : totalCorners < line;
    }
    case 'total_cards': {
      const line = parseFloat(selection.split('_')[1]);
      return selection.startsWith('over') ? totalCards > line : totalCards < line;
    }
  }
  return false;
}
