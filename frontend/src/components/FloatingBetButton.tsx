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
        className="fixed bottom-6 right-6 z-50 lg:hidden btn-accent rounded-full w-16 h-16 flex items-center justify-center shadow-2xl shadow-accent-500/30 animate-glow"
      >
        <div className="relative">
          <span className="text-2xl">🎫</span>
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {selections.length}
          </span>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
