'use client';

import { useBetSlip } from '@/context/BetSlipContext';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency, formatOdds, MARKET_LABELS, SELECTION_LABELS } from '@/lib/api';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BetSlip() {
  const { selections, removeSelection, clearSelections, totalOdds, stake, setStake } = useBetSlip();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingCode, setBookingCode] = useState('');

  const potentialWin = Math.round(stake * totalOdds * 100) / 100;
  const qrUrl = bookingCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(bookingCode)}&bgcolor=111827&color=22c55e`
    : null;

  const placeBet = async () => {
    if (!user) { setMessage('Please login to place bets'); return; }
    if (selections.length === 0) { setMessage('Add selections to your bet slip'); return; }
    setLoading(true);
    setMessage('');
    try {
      const result = await api<{ bet: { booking_code: string } }>('/bets/place', {
        method: 'POST',
        body: JSON.stringify({
          selections: selections.map((s) => ({
            matchId: s.matchId,
            market: s.market,
            selection: s.selection,
          })),
          stake,
        }),
      });
      setBookingCode(result.bet.booking_code);
      clearSelections();
      await refreshUser();
      setMessage('Bet placed successfully!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div layout className="card-glow sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span className="text-accent-500">🎫</span> Bet Slip
        </h2>
        <motion.span
          key={selections.length}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="bg-gradient-to-r from-primary-500 to-accent-500 text-dark-900 text-xs font-black px-2.5 py-1 rounded-full"
        >
          {selections.length}
        </motion.span>
      </div>

      <AnimatePresence mode="popLayout">
        {selections.length === 0 ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 text-sm text-center py-10">
            Tap odds to add selections
          </motion.p>
        ) : (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {selections.map((sel) => (
              <motion.div
                key={`${sel.matchId}-${sel.market}`}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-dark-700/80 rounded-xl p-3 text-sm border border-dark-600"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-200 text-xs truncate">{sel.homeTeam} vs {sel.awayTeam}</p>
                    <p className="text-gray-400 text-[10px] mt-1">
                      {MARKET_LABELS[sel.market]} · {SELECTION_LABELS[sel.selection] || sel.selection}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-primary-500 font-bold">{formatOdds(sel.odds)}</span>
                    <button onClick={() => removeSelection(sel.matchId, sel.market)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {selections.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 border-t border-dark-600 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Odds</span>
            <span className="font-black text-accent-500 text-lg">{formatOdds(totalOdds)}</span>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-medium">Stake (GHS)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
              className="input-field mt-1"
              min={1}
            />
            <div className="flex gap-2 mt-2">
              {[5, 10, 25, 50, 100].map((v) => (
                <button key={v} onClick={() => setStake(v)} className="flex-1 bg-dark-700 hover:bg-primary-500/20 text-xs py-1.5 rounded-lg border border-dark-600 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-xl p-3 flex justify-between items-center border border-primary-500/20">
            <span className="text-gray-400 text-sm">Potential Win</span>
            <span className="font-black text-primary-500 text-xl">{formatCurrency(potentialWin)}</span>
          </div>

          <button onClick={placeBet} disabled={loading} className="btn-primary w-full py-3.5 text-base">
            {loading ? 'Placing Bet...' : 'Place Bet'}
          </button>
          <button onClick={clearSelections} className="btn-secondary w-full text-sm">Clear All</button>
        </motion.div>
      )}

      {message && (
        <p className={`text-sm mt-3 text-center font-medium ${message.includes('success') ? 'text-primary-500' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      {bookingCode && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-dark-700/50 rounded-xl p-4 text-center border border-accent-500/30">
          <p className="text-xs text-gray-400 mb-1">Booking Code</p>
          <p className="font-mono text-accent-500 font-black text-xl">{bookingCode}</p>
          {qrUrl && (
            <img src={qrUrl} alt="QR Code" className="mx-auto mt-3 rounded-lg border border-dark-600" width={120} height={120} />
          )}
          <p className="text-[10px] text-gray-500 mt-2">Scan or share this code</p>
        </motion.div>
      )}
    </motion.div>
  );
}
