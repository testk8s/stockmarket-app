import { useEffect, useState } from 'react';
import { LayoutDashboard, List, Newspaper, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { WatchlistTable } from '@/components/stock/WatchlistTable';
import { StockDetailView } from '@/components/stock/StockDetailView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { NewsPanel } from '@/components/stock/NewsPanel';
import { MarketSummaryBar } from '@/components/dashboard/MarketSummaryBar';

type ScreenTab = 'dashboard' | 'watchlist' | 'news';

const SCREEN_TABS: { id: ScreenTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'watchlist', label: 'Watchlist', icon: <List size={14} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={14} /> },
];

interface MarketScreenProps {
  market: Market;
}

export function MarketScreen({ market }: MarketScreenProps) {
  const [activeTab, setActiveTab] = useState<ScreenTab>('watchlist');
  const [detailExpanded, setDetailExpanded] = useState(false);
  const {
    selectedSymbol, setSelectedSymbol, refreshQuotes, refreshNews,
    quotes, indiaWatchlist, globalWatchlist, news, loading,
  } = useMarketStore();

  const watchlist = market === 'india' ? indiaWatchlist : globalWatchlist;
  const hasQuotes = watchlist.some(w => quotes[w.symbol]);

  useEffect(() => {
    if (!hasQuotes) {
      refreshQuotes(market);
    }
    refreshNews(market);
  }, [market]);

  const handleCloseDetail = () => {
    setSelectedSymbol(null);
    setDetailExpanded(false);
  };

  const showDetail = Boolean(selectedSymbol);
  const detailWidth = detailExpanded ? 'flex-1' : 'w-[420px]';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MarketSummaryBar market={market} />

      {/* Tab bar */}
      <div className="flex items-center border-b border-[#2a2d3e] bg-[#1a1d26] px-2">
        {SCREEN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${
          showDetail && !detailExpanded ? 'flex-1' : 'flex-1'
        } ${showDetail && detailExpanded ? 'hidden lg:flex' : ''}`}>
          {activeTab === 'dashboard' && <DashboardView market={market} />}
          {activeTab === 'watchlist' && <WatchlistTable market={market} />}
          {activeTab === 'news' && (
            <div className="flex-1 overflow-y-auto p-4">
              <NewsPanel news={news} loading={loading.news} />
            </div>
          )}
        </div>

        {/* Detail pane */}
        {showDetail && selectedSymbol && (
          <>
            {/* Divider with expand toggle */}
            <div className="w-px bg-[#2a2d3e] relative group flex-shrink-0">
              <button
                onClick={() => setDetailExpanded(v => !v)}
                className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-16 bg-[#1a1d26] border border-[#2a2d3e] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#252840] transition-all z-10 opacity-0 group-hover:opacity-100"
              >
                {detailExpanded ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
              </button>
            </div>
            <div className={`${detailWidth} min-w-0 flex-shrink-0 overflow-hidden border-l border-[#2a2d3e]`}>
              <StockDetailView
                symbol={selectedSymbol}
                market={market}
                onClose={handleCloseDetail}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
