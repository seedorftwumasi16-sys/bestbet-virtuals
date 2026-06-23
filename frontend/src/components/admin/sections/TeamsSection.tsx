'use client';

import { useEffect, useState } from 'react';
import { api, getApiBaseUrl, getConfiguredApiUrl } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface Team {
  id: string;
  name: string;
  short_name: string;
  strength: number;
  color_primary?: string;
  color_secondary?: string;
  league?: string;
  is_active: boolean;
  logo_url?: string;
}

export default function TeamsSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ strength: 50, colorPrimary: '#00E676', colorSecondary: '#FFD700', league: 'Virtual League' });

  const load = () => api<Team[]>('/admin/teams').then(setTeams).catch(console.error);

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api('/admin/teams', { method: 'POST', body: JSON.stringify(newTeam) });
    setNewTeam({ name: '', shortName: '' });
    load();
  };

  const saveDetails = async (id: string) => {
    await api(`/admin/teams/${id}/details`, { method: 'PUT', body: JSON.stringify(edit) });
    setEditId(null);
    load();
  };

  const uploadLogo = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    const token = localStorage.getItem('token');
    await fetch(`${getApiBaseUrl() || getConfiguredApiUrl()}/api/admin/teams/${id}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    load();
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete team?')) return;
    await api(`/admin/teams/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Create Team">
        <div className="flex gap-3 flex-wrap">
          <input placeholder="Team name" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} className="input-field flex-1" />
          <input placeholder="Short (3)" value={newTeam.shortName} onChange={(e) => setNewTeam({ ...newTeam, shortName: e.target.value })} className="input-field w-24" />
          <button onClick={create} className="btn-primary">Add Team</button>
        </div>
      </AdminCard>

      <AdminCard title="Team Management">
        <AdminTable headers={['Team', 'Short', 'Rating', 'Colors', 'League', 'Actions']}>
          {teams.map((t) => (
            <tr key={t.id} className="border-b border-dark-700">
              <td className="py-3 pr-4 font-medium text-white">{t.name}</td>
              <td className="pr-4">{t.short_name}</td>
              <td className="pr-4">{t.strength}</td>
              <td className="pr-4">
                <span className="inline-flex gap-1">
                  <span className="w-4 h-4 rounded" style={{ background: t.color_primary || '#00E676' }} />
                  <span className="w-4 h-4 rounded" style={{ background: t.color_secondary || '#FFD700' }} />
                </span>
              </td>
              <td className="pr-4 text-gray-400 text-xs">{t.league}</td>
              <td>
                <ActionBtn onClick={() => {
                  setEditId(t.id);
                  setEdit({
                    strength: t.strength,
                    colorPrimary: t.color_primary || '#00E676',
                    colorSecondary: t.color_secondary || '#FFD700',
                    league: t.league || 'Virtual League',
                  });
                }}>Edit</ActionBtn>
                <label className="text-xs text-primary-500 cursor-pointer mr-2">
                  Logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(t.id, e.target.files[0])} />
                </label>
                <ActionBtn variant="danger" onClick={() => deleteTeam(t.id)}>Delete</ActionBtn>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      {editId && (
        <AdminCard title="Edit Team Details">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Strength (1-100)">
              <input type="number" value={edit.strength} onChange={(e) => setEdit({ ...edit, strength: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="Primary Color">
              <input type="color" value={edit.colorPrimary} onChange={(e) => setEdit({ ...edit, colorPrimary: e.target.value })} className="w-full h-10 rounded" />
            </Field>
            <Field label="Secondary Color">
              <input type="color" value={edit.colorSecondary} onChange={(e) => setEdit({ ...edit, colorSecondary: e.target.value })} className="w-full h-10 rounded" />
            </Field>
            <Field label="League">
              <input value={edit.league} onChange={(e) => setEdit({ ...edit, league: e.target.value })} className="input-field" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => saveDetails(editId)} className="btn-primary">Save</button>
            <button onClick={() => setEditId(null)} className="btn-secondary">Cancel</button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
