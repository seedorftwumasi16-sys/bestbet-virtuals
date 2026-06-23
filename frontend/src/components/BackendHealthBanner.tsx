'use client';

import { useEffect, useState } from 'react';
import { checkApiHealth, getConfiguredApiUrl, type ApiHealth } from '@/lib/api';

export default function BackendHealthBanner() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkApiHealth().then((h) => {
      setHealth(h);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  const ok = health?.status === 'ok' && health.database === 'connected';

  return (
    <div
      className={`text-xs px-4 py-2 border-b ${
        ok
          ? 'bg-primary-500/10 border-primary-500/20 text-primary-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {ok ? (
        <span>
          API connected — {health?.service || 'SkyBet API'} · DB {health?.dbMode || 'ok'} ·{' '}
          {getConfiguredApiUrl()}
        </span>
      ) : (
        <span>
          API offline — {health?.error || 'Unknown error'} · Expected: {getConfiguredApiUrl()}
        </span>
      )}
    </div>
  );
}
