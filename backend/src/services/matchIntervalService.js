import { getSetting } from './settingsService.js';
import {
  DEFAULT_MATCH_INTERVAL_SECONDS,
  DEFAULT_BETTING_CLOSE_SECONDS,
} from '../data/europeanFootball.js';

export async function getMatchIntervalSeconds() {
  const sec = await getSetting('match_interval_seconds', null);
  if (sec && !Number.isNaN(parseInt(sec, 10))) return parseInt(sec, 10);
  const min = parseInt(await getSetting('match_interval_minutes', '1'), 10);
  return min * 60 || DEFAULT_MATCH_INTERVAL_SECONDS;
}

export async function getMatchIntervalMs() {
  return (await getMatchIntervalSeconds()) * 1000;
}

export async function getBettingCloseSeconds() {
  const sec = await getSetting('betting_close_seconds', null);
  if (sec && !Number.isNaN(parseInt(sec, 10))) return parseInt(sec, 10);
  return DEFAULT_BETTING_CLOSE_SECONDS;
}

export async function getSimulationTickMs() {
  const intervalSec = await getMatchIntervalSeconds();
  const closeSec = await getBettingCloseSeconds();
  const simWindowSec = Math.max(25, intervalSec - closeSec - 5);
  return Math.max(400, Math.floor((simWindowSec * 1000) / 90));
}

export function formatIntervalLabel(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
