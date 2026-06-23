'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MyBetsPanel from '@/components/bets/MyBetsPanel';

export default function MyBetsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white">My Bets</h1>
        <p className="text-gray-500 text-sm mt-1">Track open, live, won and lost bets — booking codes saved permanently.</p>
      </div>
      <MyBetsPanel />
    </div>
  );
}
