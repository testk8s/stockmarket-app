import { useEffect, useState } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { Navbar, type AppView } from '@/components/layout/Navbar';
import { MarketScreen } from '@/screens/MarketScreen';
import { ScreenerScreen } from '@/screens/ScreenerScreen';
import { SwingScreen } from '@/screens/SwingScreen';
import { AlgoScreen } from '@/screens/AlgoScreen';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('india');
  const { refreshQuotes, quotes, indiaWatchlist, globalWatchlist } = useMarketStore();

  useEffect(() => {
    const indiaHasData = indiaWatchlist.some(w => quotes[w.symbol]);
    const globalHasData = globalWatchlist.some(w => quotes[w.symbol]);
    if (!indiaHasData) refreshQuotes('india');
    if (!globalHasData) refreshQuotes('global');
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f1117]">
      <Navbar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-hidden">
        <div className={`h-full ${activeView === 'india' ? 'block' : 'hidden'}`}>
          <MarketScreen market="india" />
        </div>
        <div className={`h-full ${activeView === 'global' ? 'block' : 'hidden'}`}>
          <MarketScreen market="global" />
        </div>
        <div className={`h-full ${activeView === 'screener' ? 'block' : 'hidden'}`}>
          <ScreenerScreen />
        </div>
        <div className={`h-full ${activeView === 'swing' ? 'block' : 'hidden'}`}>
          <SwingScreen />
        </div>
        <div className={`h-full ${activeView === 'algo' ? 'block' : 'hidden'}`}>
          <AlgoScreen />
        </div>
      </main>
    </div>
  );
}
