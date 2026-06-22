'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) {
      api<{ first_name: string; last_name: string; phone: string }>('/profile')
        .then((p) => setForm({ firstName: p.first_name || '', lastName: p.last_name || '', phone: p.phone || '' }))
        .catch(console.error);
    }
  }, [user, authLoading, router]);

  const saveProfile = async () => {
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }) });
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  const changePassword = async () => {
    try {
      await api('/profile/password', { method: 'PUT', body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new }) });
      setMessage('Password updated');
      setPwForm({ current: '', new: '' });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (authLoading || !user) return <LoadingSpinner text="Loading profile..." />;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-black">My Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center text-2xl font-black text-dark-900">
            {(form.firstName?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg">{form.firstName} {form.lastName}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">First Name</label>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Last Name</label>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field mt-1" />
          </div>
          <button onClick={saveProfile} className="btn-primary w-full">Save Profile</button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">Change Password</h2>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} className="input-field" />
          <input type="password" placeholder="New password" value={pwForm.new} onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} className="input-field" />
          <button onClick={changePassword} className="btn-secondary w-full">Update Password</button>
        </div>
      </div>

      {message && <p className="text-primary-500 text-sm text-center">{message}</p>}
    </div>
  );
}
