import { MIN_SQUAD_SIZE } from './europeanFootball.js';

const FIRST_NAMES = [
  'Luca', 'Marco', 'Alessandro', 'Giovanni', 'Pierre', 'Antoine', 'Hugo', 'Julian',
  'Thomas', 'Maximilian', 'Felix', 'Leon', 'James', 'Harry', 'Jack', 'Oliver',
  'Bruno', 'Pedro', 'Diego', 'Carlos', 'Miguel', 'Sergio', 'André', 'Nicolas',
  'Matteo', 'Lorenzo', 'Rafael', 'David', 'Emil', 'Viktor', 'Ivan', 'Stefan',
];

const LAST_NAMES = [
  'Müller', 'Schmidt', 'Rossi', 'Bianchi', 'Ferrari', 'García', 'Rodríguez', 'Martínez',
  'Silva', 'Santos', 'Dupont', 'Bernard', 'Martin', 'Dubois', 'Lefevre', 'Moreau',
  'Andersen', 'Johansson', 'Nielsen', 'Kowalski', 'Novak', 'Horvat', 'Petrov', 'Ivanov',
  'Costa', 'Almeida', 'Fernandes', 'Lopez', 'Gonzalez', 'Hernandez', 'Weber', 'Fischer',
];

const POSITIONS = [
  { pos: 'GK', count: 2, striker: false },
  { pos: 'DEF', count: 6, striker: false },
  { pos: 'MID', count: 7, striker: false },
  { pos: 'FWD', count: 5, striker: true },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueName(used) {
  for (let i = 0; i < 40; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${Math.floor(Math.random() * 90) + 1}`;
}

/** Build a squad of at least MIN_SQUAD_SIZE European players for a team */
export function generateSquad(teamShort, teamStars = 3) {
  const used = new Set();
  const squad = [];
  let shirt = 1;

  for (const block of POSITIONS) {
    for (let i = 0; i < block.count; i++) {
      const star = Math.min(5, Math.max(1, teamStars + (block.striker ? 1 : 0) + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0)));
      squad.push({
        name: uniqueName(used),
        position: block.pos,
        shirtNumber: shirt++,
        starRating: Math.min(5, Math.max(1, star)),
        isStriker: block.striker,
      });
    }
  }

  while (squad.length < MIN_SQUAD_SIZE) {
    squad.push({
      name: uniqueName(used),
      position: 'MID',
      shirtNumber: shirt++,
      starRating: teamStars,
      isStriker: false,
    });
  }

  return squad.map((p) => ({ ...p, teamShort }));
}

export function pickGoalScorer(players) {
  const scorers = players.filter((p) => p.is_striker || p.position === 'FWD' || p.position === 'MID');
  const pool = scorers.length ? scorers : players;
  const weights = pool.map((p) => (p.is_striker ? 4 : p.position === 'FWD' ? 3 : p.position === 'MID' ? 2 : 1) * p.starRating);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}
