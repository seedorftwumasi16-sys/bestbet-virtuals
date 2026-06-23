'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn } from '../shared';

export default function ContentSection() {
  const [promotions, setPromotions] = useState<Array<Record<string, unknown>>>([]);
  const [banners, setBanners] = useState<Array<Record<string, unknown>>>([]);
  const [announcements, setAnnouncements] = useState<Array<Record<string, unknown>>>([]);
  const [promoForm, setPromoForm] = useState({ title: '', description: '', badge: '' });
  const [announceForm, setAnnounceForm] = useState({ title: '', message: '' });
  const [notifyForm, setNotifyForm] = useState({ title: '', message: '' });

  const load = () => {
    api<Array<Record<string, unknown>>>('/admin/promotions').then(setPromotions).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/banners').then(setBanners).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/announcements').then(setAnnouncements).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const createPromo = async () => {
    await api('/admin/promotions', { method: 'POST', body: JSON.stringify(promoForm) });
    setPromoForm({ title: '', description: '', badge: '' });
    load();
  };

  const createAnnouncement = async () => {
    await api('/admin/announcements', { method: 'POST', body: JSON.stringify(announceForm) });
    setAnnounceForm({ title: '', message: '' });
    load();
  };

  const sendNotification = async () => {
    await api('/admin/notifications/send', { method: 'POST', body: JSON.stringify({ ...notifyForm, audience: 'all' }) });
    alert('Notifications sent');
    setNotifyForm({ title: '', message: '' });
  };

  const deletePromo = async (id: string) => {
    await api(`/admin/promotions/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard title="Create Promotion">
          <div className="space-y-2">
            <input placeholder="Title" value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} className="input-field" />
            <input placeholder="Description" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} className="input-field" />
            <input placeholder="Badge" value={promoForm.badge} onChange={(e) => setPromoForm({ ...promoForm, badge: e.target.value })} className="input-field" />
            <button onClick={createPromo} className="btn-primary w-full">Create Promotion</button>
          </div>
        </AdminCard>

        <AdminCard title="Send Notification">
          <div className="space-y-2">
            <input placeholder="Title" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} className="input-field" />
            <textarea placeholder="Message" value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} className="input-field min-h-[80px]" />
            <button onClick={sendNotification} className="btn-accent w-full">Send to All Users</button>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Promotions">
        <AdminTable headers={['Title', 'Badge', 'Actions']}>
          {promotions.map((p) => (
            <tr key={String(p.id)} className="border-b border-dark-700">
              <td className="py-2 pr-4 text-white">{String(p.title)}</td>
              <td className="pr-4 text-accent-500 text-xs">{String(p.badge || '')}</td>
              <td><ActionBtn variant="danger" onClick={() => deletePromo(String(p.id))}>Delete</ActionBtn></td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      <AdminCard title="Announcements">
        <div className="space-y-2 mb-4">
          <input placeholder="Title" value={announceForm.title} onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })} className="input-field" />
          <textarea placeholder="Message" value={announceForm.message} onChange={(e) => setAnnounceForm({ ...announceForm, message: e.target.value })} className="input-field min-h-[60px]" />
          <button onClick={createAnnouncement} className="btn-secondary">Post Announcement</button>
        </div>
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={String(a.id)} className="border-b border-dark-700 py-2">
              <p className="font-medium text-white">{String(a.title)}</p>
              <p className="text-gray-400 text-sm">{String(a.message)}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Homepage Banners">
        <div className="space-y-2 text-sm text-gray-400">
          {banners.length === 0 && <p>No banners yet. Upload via API or add banner management UI expansion.</p>}
          {banners.map((b) => (
            <div key={String(b.id)} className="flex justify-between border-b border-dark-700 py-2">
              <span className="text-white">{String(b.title)}</span>
              <span>{b.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
