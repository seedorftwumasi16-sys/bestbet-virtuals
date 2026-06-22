'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface Promo {
  id: string;
  title: string;
  description: string;
  badge?: string;
}

export default function PromotionsSlider() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    api<Promo[]>('/promotions').then(setPromos).catch(console.error);
  }, []);

  useEffect(() => {
    if (promos.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % promos.length), 5000);
    return () => clearInterval(t);
  }, [promos.length]);

  if (!promos.length) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden h-28 bg-gradient-to-r from-primary-600/20 via-dark-800 to-accent-500/20 border border-primary-500/20">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="absolute inset-0 flex items-center px-6"
        >
          {promos[active].badge && (
            <span className="badge-hot mr-4">{promos[active].badge}</span>
          )}
          <div>
            <h3 className="font-bold text-lg text-white">{promos[active].title}</h3>
            <p className="text-gray-400 text-sm">{promos[active].description}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      {promos.length > 1 && (
        <div className="absolute bottom-2 right-4 flex gap-1">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === active ? 'bg-accent-500 w-4' : 'bg-dark-600'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
