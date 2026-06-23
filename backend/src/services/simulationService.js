import pool from '../db/pool.js';
import { pickGoalScorer } from '../data/europeanPlayers.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ATTACK_LINES = [
  '{player} breaks through the defence...',
  '{player} drives into the box...',
  'Dangerous attack from {team}...',
  '{player} threads a pass into the area...',
  '{team} building pressure in the final third...',
];

const CORNER_LINES = [
  'Corner awarded to {team}...',
  '{team} win a corner kick...',
  'The ball goes out — corner to {team}.',
];

const GOAL_LINES = [
  'GOAL! {player} scores from close range!',
  'GOAL! {player} finds the back of the net!',
  'GOAL! What a finish from {player}!',
  'GOAL! {player} slots it home!',
];

const COMMENTARY = {
  goal: ['GOAL! What a finish!', 'GOOOAL! The crowd erupts!', 'Into the net! Brilliant strike!', 'Scores! The stadium is alive!'],
  yellow: ['Yellow card shown.', 'Caution for the player.', 'Booked for dissent.'],
  red: ['RED CARD! Sent off!', 'Dismissed! Huge moment in the match!'],
  foul: ['Free kick awarded.', 'Challenge deemed foul.', 'Play stopped for infringement.'],
  corner: ['Corner kick.', 'Corner for the attacking side.'],
  injury: ['Player down — medical staff on.', 'Injury concern, play stopped.', 'Stretcher being prepared.'],
  substitution: ['Substitution made.', 'Fresh legs enter the pitch.', 'Tactical change from the bench.'],
  kickoff: ['KICK OFF! The match is underway!', 'And we are LIVE!'],
  halftime: ['Half time. Teams regroup in the tunnel.', 'HALF TIME whistle blows.'],
  secondhalf: ['Second half underway!', 'The teams return for the second period.'],
  fulltime: ['FULL TIME! The referee blows for the end.', 'That is the final whistle!'],
};

function teamPower(ratings, home = false) {
  const base = ratings.attack * 0.42 + ratings.midfield * 0.33 + ratings.defense * 0.25;
  return base * (home ? 1.08 : 1);
}

/** Poisson-style goal count from attack vs defense */
function expectedGoals(attack, defense) {
  const lambda = Math.max(0.15, (attack / Math.max(defense, 50)) * 1.35);
  let goals = 0;
  const L = Math.exp(-lambda);
  let p = 1;
  do {
    goals++;
    p *= Math.random();
  } while (p > L && goals < 6);
  return Math.max(0, goals - 1);
}

export async function loadTeamRatings(teamId) {
  const res = await pool.query(
    `SELECT id, name, strength, star_rating, attack_rating, midfield_rating, defense_rating
     FROM teams WHERE id = $1`,
    [teamId]
  );
  const t = res.rows[0];
  if (!t) return { attack: 50, midfield: 50, defense: 50, strength: 50, starRating: 3 };
  return {
    attack: t.attack_rating || t.strength || 50,
    midfield: t.midfield_rating || t.strength || 50,
    defense: t.defense_rating || t.strength || 50,
    strength: t.strength || 50,
    starRating: t.star_rating || 3,
    name: t.name,
  };
}

export async function loadSquad(teamId) {
  const res = await pool.query(
    `SELECT id, name, position, star_rating, is_striker FROM players
     WHERE team_id = $1 AND is_active = TRUE ORDER BY is_striker DESC, star_rating DESC`,
    [teamId]
  );
  if (!res.rows.length) return [];
  return res.rows.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    starRating: p.star_rating,
    is_striker: p.is_striker,
  }));
}

export async function simulateMatchOutcome(homeTeamId, awayTeamId) {
  const [homeRatings, awayRatings, homeSquad, awaySquad] = await Promise.all([
    loadTeamRatings(homeTeamId),
    loadTeamRatings(awayTeamId),
    loadSquad(homeTeamId),
    loadSquad(awayTeamId),
  ]);

  const homePower = teamPower(homeRatings, true);
  const awayPower = teamPower(awayRatings, false);
  const total = homePower + awayPower || 1;
  const homeShare = homePower / total;

  let homeGoals = expectedGoals(homeRatings.attack, awayRatings.defense);
  let awayGoals = expectedGoals(awayRatings.attack, homeRatings.defense);

  if (Math.random() < homeShare * 0.15) homeGoals += 1;
  if (Math.random() < (1 - homeShare) * 0.15) awayGoals += 1;

  const possessionHome = Math.round(35 + homeShare * 30 + randomInt(-5, 5));
  const events = buildEventTimeline({
    homeGoals,
    awayGoals,
    homeName: homeRatings.name,
    awayName: awayRatings.name,
    homeSquad,
    awaySquad,
    homeShare,
  });

  return { homeGoals, awayGoals, events, possessionHome: Math.min(70, Math.max(30, possessionHome)) };
}

function scorerForTeam(squad, fallbackName) {
  if (!squad.length) return fallbackName || 'Unknown';
  const p = pickGoalScorer(squad);
  return p.name;
}

export function buildEventTimeline({
  homeGoals,
  awayGoals,
  homeName,
  awayName,
  homeSquad,
  awaySquad,
  homeShare,
}) {
  const events = [];
  const goalMinutes = new Set();

  const addGoal = (team, squad, teamName) => {
    let minute;
    do { minute = randomInt(1, 90); } while (goalMinutes.has(minute));
    goalMinutes.add(minute);
    const player = scorerForTeam(squad, null);
    const tmpl = pick(GOAL_LINES);
    events.push({
      team,
      minute,
      type: 'goal',
      player,
      playerId: squad.find((s) => s.name === player)?.id || null,
      description: `⚽ ${tmpl.replace('{player}', player)} ${pick(COMMENTARY.goal)}`,
    });
  };

  for (let i = 0; i < homeGoals; i++) addGoal('home', homeSquad, homeName);
  for (let i = 0; i < awayGoals; i++) addGoal('away', awaySquad, awayName);

  const cardCount = randomInt(2, 6);
  for (let i = 0; i < cardCount; i++) {
    const team = Math.random() < homeShare ? 'home' : 'away';
    const isRed = Math.random() < 0.12;
    events.push({
      team,
      minute: randomInt(1, 90),
      type: isRed ? 'red_card' : 'yellow_card',
      description: isRed ? `🟥 ${pick(COMMENTARY.red)}` : `🟨 ${pick(COMMENTARY.yellow)}`,
    });
  }

  for (let i = 0; i < randomInt(1, 3); i++) {
    events.push({
      team: pick(['home', 'away']),
      minute: randomInt(15, 85),
      type: 'injury',
      description: `🏥 ${pick(COMMENTARY.injury)}`,
    });
  }

  for (let i = 0; i < randomInt(2, 5); i++) {
    events.push({
      team: pick(['home', 'away']),
      minute: randomInt(46, 88),
      type: 'substitution',
      description: `🔄 ${pick(COMMENTARY.substitution)}`,
    });
  }

  for (let i = 0; i < randomInt(4, 10); i++) {
    events.push({ team: pick(['home', 'away']), minute: randomInt(1, 90), type: 'foul', description: pick(COMMENTARY.foul) });
  }
  for (let i = 0; i < randomInt(4, 10); i++) {
    const team = pick(['home', 'away']);
    const teamName = team === 'home' ? homeName : awayName;
    const tmpl = pick(CORNER_LINES);
    events.push({
      team,
      minute: randomInt(1, 90),
      type: 'corner',
      description: `🚩 ${tmpl.replace('{team}', teamName)}`,
    });
  }

  events.push({ team: 'home', minute: 0, type: 'kickoff', description: pick(COMMENTARY.kickoff) });
  events.push({ team: 'home', minute: 45, type: 'halftime', description: pick(COMMENTARY.halftime) });
  events.push({ team: 'home', minute: 46, type: 'second_half', description: pick(COMMENTARY.secondhalf) });
  events.push({ team: 'home', minute: 90, type: 'fulltime', description: pick(COMMENTARY.fulltime) });

  events.sort((a, b) => a.minute - b.minute || (a.type === 'halftime' ? -1 : 0));
  return events;
}

export { COMMENTARY, pick };
