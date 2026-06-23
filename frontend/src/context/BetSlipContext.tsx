'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { api } from '@/lib/api';
import { generateSlipBookingCode } from '@/lib/bookingCode';

export interface BetSelection {
  matchId: string;
  market: string;
  selection: string;
  odds: number;
  homeTeam: string;
  awayTeam: string;
}

interface BetSlipContextType {
  selections: BetSelection[];
  addSelection: (sel: BetSelection) => void;
  removeSelection: (matchId: string, market: string) => void;
  clearSelections: () => void;
  isSelected: (matchId: string, market: string, selection: string) => boolean;
  totalOdds: number;
  stake: number;
  setStake: (s: number) => void;
  loadFromBooking: (selections: BetSelection[]) => void;
  bookingCode: string | null;
  setBookingCode: (code: string | null) => void;
}

const BetSlipContext = createContext<BetSlipContextType | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStake] = useState(10);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSlip = useCallback((sels: BetSelection[], code: string, slipStake: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api('/bets/slip', {
        method: 'POST',
        body: JSON.stringify({
          code,
          stake: slipStake,
          selections: sels.map((s) => ({
            matchId: s.matchId,
            market: s.market,
            selection: s.selection,
            odds: s.odds,
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
          })),
        }),
      }).catch(() => {});
    }, 600);
  }, []);

  const addSelection = useCallback((sel: BetSelection) => {
    setSelections((prev) => {
      const filtered = prev.filter((s) => s.matchId !== sel.matchId || s.market !== sel.market);
      const next = [...filtered, sel];
      setBookingCode((code) => {
        const c = code || generateSlipBookingCode();
        persistSlip(next, c, stake);
        return c;
      });
      return next;
    });
  }, [persistSlip, stake]);

  const removeSelection = useCallback((matchId: string, market: string) => {
    setSelections((prev) => {
      const next = prev.filter((s) => s.matchId !== matchId || s.market !== market);
      if (bookingCode && next.length) persistSlip(next, bookingCode, stake);
      if (!next.length) setBookingCode(null);
      return next;
    });
  }, [bookingCode, persistSlip, stake]);

  const clearSelections = useCallback(() => {
    setSelections([]);
    setBookingCode(null);
  }, []);

  const isSelected = useCallback(
    (matchId: string, market: string, selection: string) =>
      selections.some((s) => s.matchId === matchId && s.market === market && s.selection === selection),
    [selections]
  );

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const roundedOdds = Math.round(totalOdds * 100) / 100;

  const loadFromBooking = useCallback((sels: BetSelection[]) => {
    setSelections(sels);
  }, []);

  useEffect(() => {
    if (bookingCode && selections.length) persistSlip(selections, bookingCode, stake);
  }, [stake, bookingCode, selections, persistSlip]);

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        addSelection,
        removeSelection,
        clearSelections,
        isSelected,
        totalOdds: roundedOdds,
        stake,
        setStake,
        loadFromBooking,
        bookingCode,
        setBookingCode,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within BetSlipProvider');
  return ctx;
}
