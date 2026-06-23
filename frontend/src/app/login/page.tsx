'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthBranding from '@/components/auth/AuthBranding';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      const staffRoles = ['admin', 'super_admin', 'manager'];
      router.replace(staffRoles.includes(user.role) ? '/admin/dashboard' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    void handleSubmit(fakeEvent);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <AuthBranding />
      <div className="card border-primary-500/20">
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome Back</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Sign in to your SkyBet account</p>
        <form onSubmit={handleSubmit} className="space-y-4" action="#" method="post">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field mt-1" required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="button" disabled={loading} onClick={handleLoginClick} className="btn-primary w-full py-3">
            {loading ? 'Logging in...' : 'Login to SkyBet'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400 space-y-2">
          <Link href="/forgot-password" className="text-primary-500 hover:underline">Forgot password?</Link>
          <p>Don&apos;t have an account? <Link href="/register" className="text-primary-500 hover:underline">Register</Link></p>
        </div>
      </div>
    </div>
  );
}
