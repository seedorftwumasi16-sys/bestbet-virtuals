'use client';

import { useEffect, useRef, useState } from 'react';
import { checkApiHealth, getConfiguredApiUrl, type ApiHealth } from '@/lib/api';

const RETRY_MS = 5000;
const MAX_ATTEMPTS = 12;

export default function BackendHealthBanner() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    let cancelled = false;

    const run = async () => {
      for (let i = 1; i <= MAX_ATTEMPTS && !cancelled; i++) {
        const h = await checkApiHealth();
        if (cancelled) return;
        setHealth(h);
        setAttempt(i);
        const ok = h.status === 'ok' && h.database === 'connected';
        if (ok) return;
        if (i < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_MS));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      running.current = false;
    };
  }, []);

  const ok = health?.status === 'ok' && health.database === 'connected';
  if (ok) return null;

  const starting = !health || health.status === 'starting';

  if (starting && attempt < 3) {
    return (
      <div className="text-xs px-4 py-2 border-b bg-amber-500/10 border-amber-500/20 text-amber-400">
        Connecting to API at {getConfiguredApiUrl()}…
      </div>
    );
  }

  return (
    <div className="text-xs px-4 py-2 border-b bg-red-500/10 border-red-500/30 text-red-400">
      API offline — {health?.error || 'Unknown error'} · Expected: {getConfiguredApiUrl()}
      {attempt < MAX_ATTEMPTS && (
        <span className="text-gray-500"> · Retrying ({attempt}/{MAX_ATTEMPTS})</span>
      )}
    </div>
  );
}
