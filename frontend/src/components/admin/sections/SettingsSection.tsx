'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, Field } from '../shared';

const INTERVAL_PRESETS = [
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
  { label: '3 minutes', seconds: 180 },
  { label: '5 minutes', seconds: 300 },
];

export default function SettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [paused, setPaused] = useState(false);
  const [intervalSec, setIntervalSec] = useState(60);

  useEffect(() => {
    api<Record<string, string>>('/admin/settings').then((s) => {
      setSettings(s);
      setPaused(s.competition_paused === 'true');
      setIntervalSec(parseInt(s.match_interval_seconds || '60', 10));
    }).catch(console.error);
  }, []);

  const save = async () => {
    const payload = {
      ...settings,
      match_interval_seconds: String(intervalSec),
      match_interval_minutes: String(Math.max(1, Math.round(intervalSec / 60))),
      betting_close_seconds: settings.betting_close_seconds || '10',
    };
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
    alert('Settings saved');
  };

  const togglePause = async () => {
    await api('/admin/competition/pause', { method: 'PUT', body: JSON.stringify({ paused: !paused }) });
    setPaused(!paused);
  };

  const resetTables = async () => {
    if (!confirm('Reset all league tables to zero?')) return;
    await api('/admin/league-table/reset', { method: 'POST' });
    alert('League tables reset');
  };

  const fields = [
    { key: 'rtp_percentage', label: 'RTP Percentage' },
    { key: 'house_profit_percentage', label: 'House Profit %' },
    { key: 'betting_close_seconds', label: 'Betting Close (seconds before kickoff)' },
    { key: 'min_deposit', label: 'Min Deposit (GHS)' },
    { key: 'min_withdrawal', label: 'Min Withdrawal (GHS)' },
    { key: 'min_bet', label: 'Min Bet (GHS)' },
    { key: 'max_bet', label: 'Max Bet (GHS)' },
    { key: 'prize_pool_base', label: 'Daily Jackpot Base (GHS)' },
    { key: 'current_season', label: 'Current Season' },
  ];

  return (
    <div className="space-y-4">
      <AdminCard title="Competition Control">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold">Virtual League Status</p>
            <p className="text-gray-500 text-sm">{paused ? 'Competition is paused' : 'Competition is running'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePause} className={paused ? 'btn-primary' : 'btn-secondary'}>
              {paused ? 'Resume Competition' : 'Pause Competition'}
            </button>
            <button onClick={resetTables} className="btn-secondary">Reset League Tables</button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Match Frequency">
        <p className="text-gray-500 text-sm mb-4">How often new virtual matches start</p>
        <div className="flex flex-wrap gap-2">
          {INTERVAL_PRESETS.map((p) => (
            <button
              key={p.seconds}
              type="button"
              onClick={() => setIntervalSec(p.seconds)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                intervalSec === p.seconds
                  ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                  : 'bg-dark-800 border-dark-600 text-gray-400 hover:border-primary-500/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">Selected: every {intervalSec < 60 ? `${intervalSec}s` : `${intervalSec / 60} min`}</p>
      </AdminCard>

      <AdminCard title="Platform Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                value={settings[f.key] || ''}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                className="input-field"
              />
            </Field>
          ))}
        </div>
        <button onClick={save} className="btn-primary mt-6">Save All Settings</button>
      </AdminCard>
    </div>
  );
}
