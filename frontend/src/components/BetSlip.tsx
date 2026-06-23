'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBetSlip } from '@/context/BetSlipContext';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency, formatOdds, MARKET_LABELS, SELECTION_LABELS } from '@/lib/api';
import { copyToClipboard } from '@/lib/bookingCode';
import { saveLastPlacedBet, loadLastPlacedBet, clearLastPlacedBet, BetRecord } from '@/lib/bets';
import BetTicketCard from '@/components/bets/BetTicketCard';
import { IconCard, IconFootball } from '@/components/icons/FootballIcons';

export default function BetSlip({ embedded = false }: { embedded?: boolean }) {
  const { selections, removeSelection, clearSelections, totalOdds, stake, setStake, bookingCode, setBookingCode } = useBetSlip();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [placedBet, setPlacedBet] = useState<BetRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = loadLastPlacedBet();
    if (saved) setPlacedBet(saved);
  }, []);

  const displayCode = placedBet?.booking_code || bookingCode;
  const potentialWin = Math.round(stake * totalOdds * 100) / 100;

  const copyCode = async () => {
    if (!displayCode) return;
    const ok = await copyToClipboard(displayCode);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const placeBet = async () => {
    if (!user) { setMessage('Please login to place bets'); return; }
    if (selections.length === 0) { setMessage('Add selections to your bet slip'); return; }
    setLoading(true);
    setMessage('');
    try {
      const result = await api<{ bet: BetRecord; selections: BetRecord['selections'] }>('/bets/place', {
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
      const record: BetRecord = {
        ...result.bet,
        selections: result.selections || result.bet.selections,
        display_status: 'pending',
        actual_win: 0,
      };
      setPlacedBet(record);
      saveLastPlacedBet(record);
      setBookingCode(null);
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
    <motion.div
      layout
      className={`glass-betslip relative overflow-hidden ${embedded ? '' : 'sticky top-4 lg:top-20'}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00E676]/8 via-transparent to-[#FFD700]/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E676]/50 to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/35 flex items-center justify-center shadow-neon">
              <IconCard size={18} className="text-primary-500" />
            </span>
            Bet Slip
          </h2>
          <motion.span
            key={selections.length}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-r from-primary-500 to-accent-500 text-dark-900 text-xs font-black px-3 py-1 rounded-full shadow-neon"
          >
            {selections.length}
          </motion.span>
        </div>

        {displayCode && selections.length > 0 && !placedBet && (
          <div className="mb-4 flex items-center justify-between bg-dark-800/80 rounded-xl px-3 py-2 border border-primary-500/20">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Booking Code</p>
              <p className="font-mono text-accent-400 font-black text-lg tracking-widest">{displayCode}</p>
            </div>
            <button type="button" onClick={copyCode} className="btn-secondary text-xs py-1.5 px-3">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {selections.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-dark-700/50 border border-dark-600/50 flex items-center justify-center opacity-60">
                <IconFootball size={32} className="text-primary-500" />
              </div>
              <p className="text-gray-500 text-sm">Tap odds to add selections</p>
              <p className="text-gray-600 text-xs mt-1">Auto-updating live odds</p>
            </motion.div>
          ) : (
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {selections.map((sel) => (
                <motion.div
                  key={`${sel.matchId}-${sel.market}`}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-dark-700/60 rounded-xl p-3 text-sm border border-primary-500/15 hover:border-primary-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-100 text-xs truncate">{sel.homeTeam} vs {sel.awayTeam}</p>
                      <p className="text-gray-400 text-[10px] mt-1">
                        {MARKET_LABELS[sel.market]} · {SELECTION_LABELS[sel.selection] || sel.selection}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <motion.span
                        key={sel.odds}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="text-primary-500 font-black text-sm"
                      >
                        {formatOdds(sel.odds)}
                      </motion.span>
                      <button
                        onClick={() => removeSelection(sel.matchId, sel.market)}
                        className="text-gray-500 hover:text-red-400 text-xs w-6 h-6 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {selections.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 border-t border-dark-600/50 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total Odds</span>
              <motion.span
                key={totalOdds}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="font-black text-accent-500 text-xl"
              >
                {formatOdds(totalOdds)}
              </motion.span>
            </div>

            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Stake (GHS)</label>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                className="input-field mt-1.5 font-bold text-lg"
                min={1}
              />
              <div className="flex gap-2 mt-2">
                {[5, 10, 25, 50, 100].map((v) => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStake(v)}
                    className={`flex-1 text-xs py-2 rounded-xl border font-bold transition-all ${
                      stake === v
                        ? 'bg-primary-500/20 border-primary-500 text-primary-500 shadow-neon'
                        : 'bg-dark-700/60 border-dark-600 text-gray-400 hover:border-primary-500/40'
                    }`}
                  >
                    {v}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl p-4 border border-primary-500/25 bg-gradient-to-r from-primary-500/10 via-dark-800/50 to-accent-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent animate-pulse-slow" />
              <div className="relative flex justify-between items-center">
                <span className="text-gray-400 text-sm font-medium">Potential Win</span>
                <motion.span
                  key={potentialWin}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-black text-primary-500 text-2xl"
                >
                  {formatCurrency(potentialWin)}
                </motion.span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0,230,118,0.45)' }}
              whileTap={{ scale: 0.97 }}
              onClick={placeBet}
              disabled={loading}
              className="w-full py-5 rounded-2xl text-lg font-black bg-gradient-to-r from-[#00E676] to-[#00c966] text-[#0A0F14] shadow-neon-lg border border-primary-400/30 disabled:opacity-50 transition-shadow"
            >
              {loading ? 'Placing Bet...' : 'PLACE BET'}
            </motion.button>
            <button onClick={clearSelections} className="btn-secondary w-full text-sm">Clear All</button>
          </motion.div>
        )}

        {message && (
          <p className={`text-sm mt-3 text-center font-medium ${message.includes('success') ? 'text-primary-500' : 'text-red-400'}`}>
            {message}
          </p>
        )}

        {placedBet && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
            <p className="text-center text-primary-500 font-bold text-sm">Bet Placed Successfully!</p>
            <BetTicketCard bet={placedBet} expanded />
            <div className="flex gap-2">
              <a href="/tickets" className="btn-primary flex-1 text-center text-sm py-3 min-h-[44px]">My Bets</a>
              <button
                type="button"
                onClick={() => { setPlacedBet(null); clearLastPlacedBet(); }}
                className="btn-secondary flex-1 text-sm py-3 min-h-[44px]"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
