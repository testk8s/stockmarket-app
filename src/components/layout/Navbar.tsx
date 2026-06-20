import { Globe, Menu, X, RefreshCw, Search } from 'lucide-react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { useState } from 'react';

export type AppView = 'india' | 'global' | 'screener';

interface NavbarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export function Navbar({ activeView, onViewChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { indiaWatchlist, globalWatchlist, loading, refreshQuotes } = useMarketStore();
  const isMarket = activeView === 'india' || activeView === 'global';

  return (
    <nav className="bg-[#1a1d26] border-b border-[#2a2d3e] flex-shrink-0 z-20">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Globe size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200 leading-none">StockWatch</p>
            <p className="text-xs text-slate-500 leading-none">Global Multi-Market</p>
          </div>
        </div>

        {/* Nav items (desktop) */}
        <div className="hidden sm:flex items-center gap-1 bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-1">
          <MarketTab
            market="india"
            active={activeView === 'india'}
            count={indiaWatchlist.length}
            onClick={() => onViewChange('india')}
          />
          <MarketTab
            market="global"
            active={activeView === 'global'}
            count={globalWatchlist.length}
            onClick={() => onViewChange('global')}
          />
          {/* Screener tab */}
          <button
            onClick={() => onViewChange('screener')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeView === 'screener'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#1e2130]'
            }`}
          >
            <Search size={14} />
            <span>Screener</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeView === 'screener' ? 'bg-purple-500/20 text-purple-300' : 'bg-[#2a2d3e] text-slate-500'
            }`}>
              5 Markets
            </span>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isMarket && (
            <button
              onClick={() => refreshQuotes(activeView as Market)}
              disabled={loading.quotes}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e] rounded-lg transition-colors"
            >
              <RefreshCw size={12} className={loading.quotes ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden p-2 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#2a2d3e] px-4 py-3 flex flex-col gap-2">
          <MarketTab market="india" active={activeView === 'india'} count={indiaWatchlist.length}
            onClick={() => { onViewChange('india'); setMobileOpen(false); }} />
          <MarketTab market="global" active={activeView === 'global'} count={globalWatchlist.length}
            onClick={() => { onViewChange('global'); setMobileOpen(false); }} />
          <button
            onClick={() => { onViewChange('screener'); setMobileOpen(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeView === 'screener' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'border-transparent text-slate-500'
            }`}
          >
            <Search size={14} /> Screener — 5 Country Markets
          </button>
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
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
        active
          ? isIndia
            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e2130] border-transparent'
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
