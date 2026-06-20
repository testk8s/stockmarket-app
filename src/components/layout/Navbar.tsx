import { Globe, Menu, X, RefreshCw } from 'lucide-react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { useState } from 'react';

interface NavbarProps {
  activeMarket: Market;
  onMarketChange: (market: Market) => void;
}

export function Navbar({ activeMarket, onMarketChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { indiaWatchlist, globalWatchlist, loading, refreshQuotes } = useMarketStore();

  return (
    <nav className="bg-[#1a1d26] border-b border-[#2a2d3e] flex-shrink-0 z-20">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Globe size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200 leading-none">StockWatch</p>
            <p className="text-xs text-slate-500 leading-none">Global Multi-Market</p>
          </div>
        </div>

        {/* Market switcher (desktop) */}
        <div className="hidden sm:flex items-center bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-1 gap-1">
          <MarketTab
            market="india"
            active={activeMarket === 'india'}
            count={indiaWatchlist.length}
            onClick={() => onMarketChange('india')}
          />
          <MarketTab
            market="global"
            active={activeMarket === 'global'}
            count={globalWatchlist.length}
            onClick={() => onMarketChange('global')}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshQuotes(activeMarket)}
            disabled={loading.quotes}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={loading.quotes ? 'animate-spin' : ''} />
            Refresh
          </button>
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden p-2 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile market switcher */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#2a2d3e] px-4 py-3 flex gap-2">
          <MarketTab market="india" active={activeMarket === 'india'} count={indiaWatchlist.length} onClick={() => { onMarketChange('india'); setMobileOpen(false); }} />
          <MarketTab market="global" active={activeMarket === 'global'} count={globalWatchlist.length} onClick={() => { onMarketChange('global'); setMobileOpen(false); }} />
        </div>
      )}
    </nav>
  );
}

function MarketTab({
  market, active, count, onClick
}: { market: Market; active: boolean; count: number; onClick: () => void }) {
  const isIndia = market === 'india';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? isIndia
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e2130] border border-transparent'
      }`}
    >
      <span className="text-base">{isIndia ? '🇮🇳' : '🌍'}</span>
      <span>{isIndia ? 'Indian Market' : 'Global Markets'}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        active
          ? isIndia ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
          : 'bg-[#2a2d3e] text-slate-500'
      }`}>
        {count}
      </span>
    </button>
  );
}
