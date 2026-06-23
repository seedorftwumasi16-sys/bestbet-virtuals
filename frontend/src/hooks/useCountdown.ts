import { useEffect, useState } from 'react';

/** Stable 1s countdown — only re-runs when target ISO string changes. */
export function useCountdown(targetIso: string | null | undefined) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!targetIso) {
      setLabel('');
      return;
    }

    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('Starting...');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setLabel(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}
