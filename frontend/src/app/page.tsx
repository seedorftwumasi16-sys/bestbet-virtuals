import MatchList from '@/components/MatchList';
import BetSlip from '@/components/BetSlip';
import WinnersTicker from '@/components/WinnersTicker';
import PromotionsSlider from '@/components/PromotionsSlider';
import LeagueWidget from '@/components/LeagueWidget';
import MatchCarousel from '@/components/MatchCarousel';
import FloatingBetButton from '@/components/FloatingBetButton';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
      <PromotionsSlider />
      <WinnersTicker />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <MatchCarousel />
          <MatchList />
        </div>
        <div className="lg:col-span-1 space-y-5">
          <div id="bet-slip">
            <BetSlip />
          </div>
          <LeagueWidget />
        </div>
      </div>

      <FloatingBetButton />
    </div>
  );
}
