'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { AdminCard, AdminTable } from '../shared';

interface Winner {
  id: string;
  full_name: string;
  country: string;
  username?: string;
  winning_amount: number | string;
  booking_slip_id: string;
  time_won: string;
  profile_picture?: string;
  is_pinned: boolean;
  is_active: boolean;
}

const AMOUNTS = [120, 450, 850, 1200, 2500, 5000];

const emptyForm = {
  full_name: '',
  country: 'Ghana',
  username: '',
  winning_amount: 450,
  booking_slip_id: '',
  time_won: new Date().toISOString().slice(0, 16),
  is_pinned: false,
  is_active: true,
};

export default function WinnersSection() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [autoRotation, setAutoRotation] = useState(true);
  const [rotationMinutes, setRotationMinutes] = useState(2);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ winners: Winner[]; auto_rotation: boolean; rotation_minutes: number }>('/admin/recent-winners');
    setWinners(data.winners);
    setAutoRotation(data.auto_rotation);
    setRotationMinutes(data.rotation_minutes);
  }, []);

  useEffect(() => { load().catch(console.error); }, [load]);

  const save = async () => {
    const payload = {
      ...form,
      winning_amount: Number(form.winning_amount),
      time_won: new Date(form.time_won).toISOString(),
    };
    if (editingId) {
      await api(`/admin/recent-winners/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/recent-winners/${editingId}/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        });
      }
    } else {
      const created = await api<Winner>('/admin/recent-winners', { method: 'POST', body: JSON.stringify(payload) });
      if (avatarFile && created.id) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/recent-winners/${created.id}/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        });
      }
    }
    setForm(emptyForm);
    setEditingId(null);
    setAvatarFile(null);
    setMessage('Winner saved — live on site instantly');
    await load();
  };

  const edit = (w: Winner) => {
    setEditingId(w.id);
    setForm({
      full_name: w.full_name,
      country: w.country,
      username: w.username || '',
      winning_amount: Number(w.winning_amount),
      booking_slip_id: w.booking_slip_id,
      time_won: new Date(w.time_won).toISOString().slice(0, 16),
      is_pinned: w.is_pinned,
      is_active: w.is_active,
    });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this winner?')) return;
    await api(`/admin/recent-winners/${id}`, { method: 'DELETE' });
    await load();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await api(`/admin/recent-winners/${id}/pin`, { method: 'PUT', body: JSON.stringify({ pinned }) });
    await load();
  };

  const saveRotation = async () => {
    await api('/admin/recent-winners/settings/rotation', {
      method: 'PUT',
      body: JSON.stringify({ auto_rotation: autoRotation, rotation_minutes: rotationMinutes }),
    });
    setMessage('Rotation settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Recent Winners Manager</h2>
        <p className="text-gray-500 text-sm">Changes appear instantly on the homepage via live socket updates.</p>
      </div>

      {message && <p className="text-primary-500 text-sm font-medium">{message}</p>}

      <AdminCard title="Auto Rotation">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={autoRotation} onChange={(e) => setAutoRotation(e.target.checked)} />
            Enable automatic winner rotation
          </label>
          <label className="text-sm text-gray-400">
            Every
            <input
              type="number"
              min={1}
              max={60}
              value={rotationMinutes}
              onChange={(e) => setRotationMinutes(parseInt(e.target.value, 10) || 2)}
              className="input-field w-16 mx-2 inline-block py-1"
            />
            minutes
          </label>
          <button type="button" onClick={saveRotation} className="btn-primary text-sm">Save Settings</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Realistic amounts: {AMOUNTS.map((a) => `GHS ${a}`).join(', ')}</p>
      </AdminCard>

      <AdminCard title={editingId ? 'Edit Winner' : 'Add Winner'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="input-field" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <input className="input-field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <select className="input-field" value={form.winning_amount} onChange={(e) => setForm({ ...form, winning_amount: Number(e.target.value) })}>
            {AMOUNTS.map((a) => <option key={a} value={a}>GHS {a}</option>)}
          </select>
          <input className="input-field" placeholder="Betting Slip ID (SB######)" value={form.booking_slip_id} onChange={(e) => setForm({ ...form, booking_slip_id: e.target.value })} />
          <input type="datetime-local" className="input-field" value={form.time_won} onChange={(e) => setForm({ ...form, time_won: e.target.value })} />
          <input type="file" accept="image/*" className="input-field sm:col-span-2" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
            Pin to top
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (visible)
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={save} className="btn-primary text-sm" disabled={!form.full_name}>Save Winner</button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="btn-secondary text-sm">Cancel</button>
          )}
        </div>
      </AdminCard>

      <AdminCard title="All Winners">
        <AdminTable headers={['Name', 'Amount', 'Slip', 'Time', 'Pin', 'Actions']}>
          {winners.map((w) => (
            <tr key={w.id} className="border-b border-dark-700/50">
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  {w.profile_picture ? (
                    <img src={w.profile_picture.startsWith('http') ? w.profile_picture : `${process.env.NEXT_PUBLIC_API_URL}${w.profile_picture}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-xs font-bold">
                      {w.full_name[0]}
                    </div>
                  )}
                  <span>{w.full_name}</span>
                </div>
              </td>
              <td className="py-2 pr-4 text-primary-500 font-bold">{formatCurrency(w.winning_amount)}</td>
              <td className="py-2 pr-4 font-mono text-xs">{w.booking_slip_id}</td>
              <td className="py-2 pr-4 text-xs text-gray-400">{new Date(w.time_won).toLocaleString()}</td>
              <td className="py-2 pr-4">
                <button type="button" onClick={() => togglePin(w.id, !w.is_pinned)} className="text-accent-500 text-xs">
                  {w.is_pinned ? '📌 Pinned' : 'Pin'}
                </button>
              </td>
              <td className="py-2 pr-4">
                <button type="button" onClick={() => edit(w)} className="text-primary-500 text-xs mr-2">Edit</button>
                <button type="button" onClick={() => remove(w.id)} className="text-red-400 text-xs">Delete</button>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
