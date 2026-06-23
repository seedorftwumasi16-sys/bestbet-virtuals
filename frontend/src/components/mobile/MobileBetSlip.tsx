'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBetSlip } from '@/context/BetSlipContext';
import { formatCurrency } from '@/lib/api';
import BetSlip from '@/components/BetSlip';
import { SkyBetIcon } from '@/components/branding/SkyBetLogo';

/** Mobile sticky bet slip drawer — sits above bottom nav */
export default function MobileBetSlip() {
  const { selections, totalOdds, stake } = useBetSlip();
  const [open, setOpen] = useState(false);
  const potential = Math.round(stake * totalOdds * 100) / 100;

  if (selections.length === 0) return null;

  return (
    <>
      {/* Collapsed bar */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="lg:hidden fixed bottom-[4.5rem] left-0 right-0 z-40 px-3"
      >
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00E676] to-[#00c966] text-[#0A0F14] shadow-neon-lg border border-primary-400/50"
        >
          <div className="flex items-center gap-2">
            <SkyBetIcon size={28} />
            <span className="font-black text-sm">{selections.length} Selection{selections.length > 1 ? 's' : ''}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold opacity-80">Potential Win</p>
            <p className="font-black text-lg leading-none">{formatCurrency(potential)}</p>
          </div>
        </button>
      </motion.div>

      {/* Full drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl overflow-hidden border-t border-primary-500/30 bg-[#0A0F14]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600/50">
                <span className="font-black text-white">Bet Slip</span>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-dark-700 text-gray-400 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-52px)]">
                <BetSlip embedded />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
