import { useEffect } from 'react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { Navbar } from '@/components/layout/Navbar';
import { MarketScreen } from '@/screens/MarketScreen';

export default function App() {
  const { activeMarket, setActiveMarket, refreshQuotes, quotes, indiaWatchlist, globalWatchlist } = useMarketStore();

  useEffect(() => {
    const indiaHasData = indiaWatchlist.some(w => quotes[w.symbol]);
    const globalHasData = globalWatchlist.some(w => quotes[w.symbol]);
    if (!indiaHasData) refreshQuotes('india');
    if (!globalHasData) refreshQuotes('global');
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f1117]">
      <Navbar activeMarket={activeMarket} onMarketChange={(m: Market) => setActiveMarket(m)} />
      <main className="flex-1 overflow-hidden">
        <div className={`h-full ${activeMarket === 'india' ? 'block' : 'hidden'}`}>
          <MarketScreen market="india" />
        </div>
        <div className={`h-full ${activeMarket === 'global' ? 'block' : 'hidden'}`}>
          <MarketScreen market="global" />
        </div>
      </main>
    </div>
  );
}
