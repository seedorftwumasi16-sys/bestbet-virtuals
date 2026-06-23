'use client';

import { useBetSlip } from '@/context/BetSlipContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingBetButton() {
  const { selections } = useBetSlip();

  if (selections.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => {
          document.getElementById('bet-slip')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 btn-accent rounded-2xl flex items-center justify-center shadow-neon-lg animate-glow"
      >
        <div className="relative">
          <span className="text-2xl">🎫</span>
          <span className="absolute -top-2 -right-2 bg-primary-500 text-dark-900 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-900">
            {selections.length}
          </span>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
