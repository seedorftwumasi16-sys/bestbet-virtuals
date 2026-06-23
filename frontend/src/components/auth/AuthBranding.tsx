import { SkyBetWordmark } from '@/components/branding/SkyBetLogo';

export default function AuthBranding() {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <SkyBetWordmark />
      </div>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">
        Premium virtual football betting. Fast matches, live odds, instant payouts.
      </p>
    </div>
  );
}
