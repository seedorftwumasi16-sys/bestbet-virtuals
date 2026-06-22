'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
}

const BetSlipContext = createContext<BetSlipContextType | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStake] = useState(10);

  const addSelection = useCallback((sel: BetSelection) => {
    setSelections((prev) => {
      const filtered = prev.filter((s) => s.matchId !== sel.matchId || s.market !== sel.market);
      return [...filtered, sel];
    });
  }, []);

  const removeSelection = useCallback((matchId: string, market: string) => {
    setSelections((prev) => prev.filter((s) => s.matchId !== matchId || s.market !== market));
  }, []);

  const clearSelections = useCallback(() => setSelections([]), []);

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
