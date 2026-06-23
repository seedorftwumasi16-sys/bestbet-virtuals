'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthBranding from '@/components/auth/AuthBranding';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', phone: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <AuthBranding />
      <div className="card border-primary-500/20">
        <h1 className="text-2xl font-bold mb-2 text-center">Join SkyBet</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Create your account — Bet Smart, Win More</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">First Name</label>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-400">Last Name</label>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone (Ghana)</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0244123456" className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field mt-1" required minLength={6} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating account...' : 'Register with SkyBet'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account? <Link href="/login" className="text-primary-500 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
