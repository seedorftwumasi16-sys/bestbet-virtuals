'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import MatchList from '@/components/MatchList';
import BetSlip from '@/components/BetSlip';
import StadiumHero from '@/components/virtual-league/StadiumHero';
import LeagueSelectorTabs, { LeagueTab } from '@/components/virtual-league/LeagueSelectorTabs';
import LiveMatchCenterSection from '@/components/virtual-league/LiveMatchCenterSection';
import PremiumLeagueTable, { LeagueEntry } from '@/components/virtual-league/PremiumLeagueTable';
import PromotionalCards from '@/components/virtual-league/PromotionalCards';
import RecentWinners from '@/components/virtual-league/RecentWinners';
import TopScorersPanel from '@/components/virtual-league/TopScorersPanel';
import LeagueStatisticsPanel from '@/components/virtual-league/LeagueStatisticsPanel';
import UpcomingMatchesStrip from '@/components/virtual-league/UpcomingMatchesStrip';
import FadeInSection from '@/components/ui/FadeInSection';
import MobileBetSlip from '@/components/mobile/MobileBetSlip';
import { LeagueTableSkeleton } from '@/components/ui/LoadingSkeleton';
import { MatchesDataProvider } from '@/context/MatchesDataContext';

export default function HomePage() {
  const [leagueTable, setLeagueTable] = useState<LeagueEntry[]>([]);
  const [leagues, setLeagues] = useState<LeagueTab[]>([]);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [leagueLoading, setLeagueLoading] = useState(true);

  useEffect(() => {
    api<LeagueTab[]>('/matches/leagues').then(setLeagues).catch(console.error);
  }, []);

  useEffect(() => {
    setLeagueLoading(true);
    const q = activeLeague ? `?league=${encodeURIComponent(activeLeague)}` : '';
    api<LeagueEntry[]>(`/matches/league-table${q}`)
      .then(setLeagueTable)
      .catch(console.error)
      .finally(() => setLeagueLoading(false));
  }, [activeLeague]);

  return (
    <MatchesDataProvider leagueFilter={activeLeague}>
      <div className="min-h-screen bg-[#0A0F14]">
        <StadiumHero />
        <LiveMatchCenterSection />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
          <FadeInSection>
            <LeagueSelectorTabs leagues={leagues} active={activeLeague} onChange={setActiveLeague} />
          </FadeInSection>

          <FadeInSection>
            <PromotionalCards />
          </FadeInSection>

          <FadeInSection delay={0.05}>
            <UpcomingMatchesStrip />
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FadeInSection delay={0.08}>
              <LeagueStatisticsPanel />
            </FadeInSection>
            <FadeInSection delay={0.1}>
              <TopScorersPanel />
            </FadeInSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            <div className="lg:col-span-8 space-y-5">
              <FadeInSection delay={0.12}>
                <RecentWinners />
              </FadeInSection>

              <FadeInSection delay={0.14}>
                <MatchList />
              </FadeInSection>

              <FadeInSection delay={0.16}>
                {leagueLoading ? (
                  <LeagueTableSkeleton />
                ) : (
                  <PremiumLeagueTable table={leagueTable} compact />
                )}
              </FadeInSection>
            </div>

            <div className="lg:col-span-4 hidden lg:block">
              <div id="bet-slip" className="sticky top-20">
                <BetSlip />
              </div>
            </div>
          </div>
        </div>

        <MobileBetSlip />
      </div>
    </MatchesDataProvider>
  );
}
