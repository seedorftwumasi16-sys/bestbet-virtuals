'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency } from '@/lib/api';

type Tab = 'analytics' | 'teams' | 'matches' | 'users' | 'bets' | 'deposits' | 'withdrawals' | 'settings';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('analytics');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'admin') return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'teams', label: 'Teams' },
    { id: 'matches', label: 'Matches' },
    { id: 'users', label: 'Users' },
    { id: 'bets', label: 'Bets' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Control Panel</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'matches' && <MatchesTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'bets' && <BetsTab />}
      {tab === 'deposits' && <DepositsTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  useEffect(() => { api<Record<string, number>>('/admin/analytics').then(setData).catch(console.error); }, []);

  if (!data) return <div className="card p-8 text-center text-gray-500">Loading...</div>;

  const cards = [
    { label: 'Total Users', value: data.totalUsers },
    { label: 'Active (24h)', value: data.activeUsers24h },
    { label: 'Total Deposits', value: formatCurrency(data.totalDeposits) },
    { label: 'Total Withdrawals', value: formatCurrency(data.totalWithdrawals) },
    { label: 'Total Bets', value: data.totalBets },
    { label: 'Total Stake', value: formatCurrency(data.totalStake) },
    { label: 'House P/L', value: formatCurrency(data.houseProfit), color: data.houseProfit >= 0 ? 'text-primary-500' : 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card text-center">
          <p className={`text-2xl font-bold ${c.color || ''}`}>{c.value}</p>
          <p className="text-gray-400 text-sm mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function TeamsTab() {
  const [teams, setTeams] = useState<Array<{ id: string; name: string; short_name: string; is_active: boolean }>>([]);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '' });

  useEffect(() => { api<typeof teams>('/admin/teams').then(setTeams).catch(console.error); }, []);

  const create = async () => {
    await api('/admin/teams', { method: 'POST', body: JSON.stringify(newTeam) });
    setNewTeam({ name: '', shortName: '' });
    setTeams(await api('/admin/teams'));
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete team?')) return;
    await api(`/admin/teams/${id}`, { method: 'DELETE' });
    setTeams(await api('/admin/teams'));
  };

  return (
    <div className="space-y-4">
      <div className="card flex gap-3">
        <input placeholder="Team name" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} className="input-field" />
        <input placeholder="Short" value={newTeam.shortName} onChange={(e) => setNewTeam({ ...newTeam, shortName: e.target.value })} className="input-field w-24" />
        <button onClick={create} className="btn-primary">Add Team</button>
      </div>
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">Name</th><th>Short</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-b border-dark-700">
                <td className="py-3">{t.name}</td>
                <td>{t.short_name}</td>
                <td>{t.is_active ? 'Yes' : 'No'}</td>
                <td><button onClick={() => deleteTeam(t.id)} className="text-red-400 text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchesTab() {
  const [matches, setMatches] = useState<Array<{ id: string; home_team_name: string; away_team_name: string; status: string; home_score: number; away_score: number }>>([]);
  const [resultForm, setResultForm] = useState({ matchId: '', homeScore: 0, awayScore: 0 });

  useEffect(() => {
    api<Array<{ home_team_name: string; away_team_name: string; id: string; status: string; home_score: number; away_score: number }>>('/matches/upcoming')
      .then(setMatches).catch(console.error);
  }, []);

  const setResult = async () => {
    await api(`/admin/matches/${resultForm.matchId}/result`, {
      method: 'PUT',
      body: JSON.stringify({ homeScore: resultForm.homeScore, awayScore: resultForm.awayScore }),
    });
    alert('Result set');
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Set Match Result Manually</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400">Match ID</label>
            <input value={resultForm.matchId} onChange={(e) => setResultForm({ ...resultForm, matchId: e.target.value })} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Home</label>
            <input type="number" value={resultForm.homeScore} onChange={(e) => setResultForm({ ...resultForm, homeScore: parseInt(e.target.value) })} className="input-field mt-1 w-20" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Away</label>
            <input type="number" value={resultForm.awayScore} onChange={(e) => setResultForm({ ...resultForm, awayScore: parseInt(e.target.value) })} className="input-field mt-1 w-20" />
          </div>
          <button onClick={setResult} className="btn-primary">Set Result</button>
        </div>
      </div>
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">Match</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-b border-dark-700">
                <td className="py-3">{m.home_team_name} vs {m.away_team_name}</td>
                <td className="capitalize">{m.status}</td>
                <td>{m.home_score}-{m.away_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<Array<{ id: string; email: string; balance: number; is_suspended: boolean }>>([]);
  const [creditForm, setCreditForm] = useState({ userId: '', amount: 0 });

  useEffect(() => { api<typeof users>('/admin/users').then(setUsers).catch(console.error); }, []);

  const credit = async () => {
    await api(`/admin/users/${creditForm.userId}/credit`, { method: 'POST', body: JSON.stringify({ amount: creditForm.amount }) });
    setUsers(await api('/admin/users'));
  };

  const suspend = async (id: string, suspend: boolean) => {
    await api(`/admin/users/${id}/suspend`, { method: 'PUT', body: JSON.stringify({ suspend }) });
    setUsers(await api('/admin/users'));
  };

  return (
    <div className="space-y-4">
      <div className="card flex gap-3">
        <input placeholder="User ID" value={creditForm.userId} onChange={(e) => setCreditForm({ ...creditForm, userId: e.target.value })} className="input-field" />
        <input type="number" placeholder="Amount" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: parseFloat(e.target.value) })} className="input-field w-32" />
        <button onClick={credit} className="btn-primary">Credit</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">Email</th><th>Balance</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-dark-700">
                <td className="py-3">{u.email}</td>
                <td>{formatCurrency(u.balance)}</td>
                <td>{u.is_suspended ? 'Suspended' : 'Active'}</td>
                <td>
                  <button onClick={() => suspend(u.id, !u.is_suspended)} className="text-xs text-yellow-400">
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BetsTab() {
  const [bets, setBets] = useState<Array<{ id: string; booking_code: string; email: string; stake: number; status: string; created_at: string }>>([]);
  useEffect(() => { api<typeof bets>('/admin/bets').then(setBets).catch(console.error); }, []);

  const voidBet = async (id: string) => {
    if (!confirm('Void this bet?')) return;
    await api(`/admin/bets/${id}/void`, { method: 'PUT' });
    setBets(await api('/admin/bets'));
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">Code</th><th>User</th><th>Stake</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {bets.map((b) => (
            <tr key={b.id} className="border-b border-dark-700">
              <td className="py-3 font-mono text-primary-500">{b.booking_code}</td>
              <td>{b.email}</td>
              <td>{formatCurrency(b.stake)}</td>
              <td className="capitalize">{b.status}</td>
              <td>{new Date(b.created_at).toLocaleDateString()}</td>
              <td><button onClick={() => voidBet(b.id)} className="text-red-400 text-xs">Void</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepositsTab() {
  const [deposits, setDeposits] = useState<Array<{ id: string; email: string; amount: number; payment_method: string; status: string }>>([]);
  useEffect(() => { api<typeof deposits>('/admin/deposits').then(setDeposits).catch(console.error); }, []);

  const approve = async (id: string) => {
    await api(`/admin/deposits/${id}/approve`, { method: 'PUT' });
    setDeposits(await api('/admin/deposits'));
  };
  const reject = async (id: string) => {
    await api(`/admin/deposits/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: 'Rejected' }) });
    setDeposits(await api('/admin/deposits'));
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">User</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {deposits.map((d) => (
            <tr key={d.id} className="border-b border-dark-700">
              <td className="py-3">{d.email}</td>
              <td>{formatCurrency(d.amount)}</td>
              <td className="capitalize">{d.payment_method?.replace('_', ' ')}</td>
              <td className="capitalize">{d.status}</td>
              <td className="space-x-2">
                {d.status === 'pending' && (
                  <>
                    <button onClick={() => approve(d.id)} className="text-primary-500 text-xs">Approve</button>
                    <button onClick={() => reject(d.id)} className="text-red-400 text-xs">Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<Array<{ id: string; email: string; amount: number; phone_number: string; status: string }>>([]);
  useEffect(() => { api<typeof withdrawals>('/admin/withdrawals').then(setWithdrawals).catch(console.error); }, []);

  const approve = async (id: string) => {
    await api(`/admin/withdrawals/${id}/approve`, { method: 'PUT' });
    setWithdrawals(await api('/admin/withdrawals'));
  };
  const reject = async (id: string) => {
    await api(`/admin/withdrawals/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: 'Rejected' }) });
    setWithdrawals(await api('/admin/withdrawals'));
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-gray-400 border-b border-dark-600"><th className="py-2">User</th><th>Amount</th><th>Phone</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {withdrawals.map((w) => (
            <tr key={w.id} className="border-b border-dark-700">
              <td className="py-3">{w.email}</td>
              <td>{formatCurrency(w.amount)}</td>
              <td>{w.phone_number}</td>
              <td className="capitalize">{w.status}</td>
              <td className="space-x-2">
                {w.status === 'pending' && (
                  <>
                    <button onClick={() => approve(w.id)} className="text-primary-500 text-xs">Approve</button>
                    <button onClick={() => reject(w.id)} className="text-red-400 text-xs">Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => { api<Record<string, string>>('/admin/settings').then(setSettings).catch(console.error); }, []);

  const save = async () => {
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
    alert('Settings saved');
  };

  const fields = [
    { key: 'rtp_percentage', label: 'RTP Percentage' },
    { key: 'house_profit_percentage', label: 'House Profit %' },
    { key: 'automatic_mode', label: 'Automatic Mode (true/false)' },
    { key: 'manual_mode', label: 'Manual Mode (true/false)' },
    { key: 'match_interval_minutes', label: 'Match Interval (minutes)' },
    { key: 'min_deposit', label: 'Min Deposit (GHS)' },
    { key: 'min_withdrawal', label: 'Min Withdrawal (GHS)' },
    { key: 'min_bet', label: 'Min Bet (GHS)' },
    { key: 'max_bet', label: 'Max Bet (GHS)' },
  ];

  return (
    <div className="card space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-sm text-gray-400">{f.label}</label>
          <input
            value={settings[f.key] || ''}
            onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
            className="input-field mt-1"
          />
        </div>
      ))}
      <button onClick={save} className="btn-primary">Save Settings</button>
    </div>
  );
}
