'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage('If an account exists, a reset link has been sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
        {message && <p className="text-primary-500 text-sm mt-4 text-center">{message}</p>}
        <p className="mt-4 text-center text-sm text-gray-400">
          <Link href="/login" className="text-primary-500 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
