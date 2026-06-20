import { useEffect } from 'react';
import type { CountryMarket } from '@/types';
import { useScreenerStore } from '@/store/screenerStore';
import { COUNTRY_INFO } from '@/data/countryStocks';
import { ScreenerFilters } from '@/components/screener/ScreenerFilters';
import { ScreenerTable } from '@/components/screener/ScreenerTable';
import { ScreenerDetailPanel } from '@/components/screener/ScreenerDetailPanel';
import { Badge } from '@/components/ui/Badge';
import { Loader2 } from 'lucide-react';

const COUNTRIES: CountryMarket[] = ['usa', 'uk', 'japan', 'germany', 'china'];

export function ScreenerScreen() {
  const {
    activeCountry, setActiveCountry, results, loading, error,
    lastRun, runScreener, selectedSymbol, setSelectedSymbol, preloadCountry,
  } = useScreenerStore();

  // Auto-run screener on first visit per country
  useEffect(() => {
    if (results.length === 0 && !loading) {
      runScreener();
    }
  }, [activeCountry]);

  // Preload neighbouring countries in background
  useEffect(() => {
    COUNTRIES.filter(c => c !== activeCountry).forEach(c => preloadCountry(c));
  }, []);

  const handleCountryChange = (c: CountryMarket) => {
    setActiveCountry(c);
    setSelectedSymbol(null);
  };

  const info = COUNTRY_INFO[activeCountry];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Country tab bar */}
      <div className="flex-shrink-0 bg-[#1a1d26] border-b border-[#2a2d3e]">
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          {COUNTRIES.map(c => {
            const ci = COUNTRY_INFO[c];
            const isActive = activeCountry === c;
            return (
              <button
                key={c}
                onClick={() => handleCountryChange(c)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 border ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#1e2130]'
                }`}
                style={isActive ? { backgroundColor: ci.color + '28', borderColor: ci.color + '50', color: ci.color } : {}}
              >
                <span className="text-base">{ci.flag}</span>
                <span>{ci.name}</span>
                {isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ci.color + '28', color: ci.color }}>
                    {results.length}
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-3 flex-shrink-0 pl-3 border-l border-[#2a2d3e]">
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                Running screener…
              </div>
            )}
            {lastRun && !loading && (
              <span className="text-xs text-slate-600">
                {results.length} results · {new Date(lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Country header */}
        <div className="px-4 py-2 flex items-center gap-3 border-t border-[#2a2d3e]/50">
          <span className="text-2xl">{info.flag}</span>
          <div>
            <h2 className="text-sm font-bold text-slate-200">{info.name} Market Screener</h2>
            <p className="text-xs text-slate-500">
              {info.exchanges.join(' · ')} · {info.indexName} · {info.currency}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="gray">{info.currency}</Badge>
            <Badge variant="blue">{info.indexName}</Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ScreenerFilters />

      {/* Main content: table + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: table */}
        <div className={`flex flex-col overflow-hidden ${selectedSymbol ? 'flex-1' : 'flex-1'}`}>
          {error ? (
            <div className="flex items-center justify-center py-12 text-red-400 text-sm gap-2">
              <span>Error loading data: {error}</span>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-blue-400" />
              <p className="text-sm font-medium">Running screener for {info.name}…</p>
              <p className="text-xs text-slate-600">Fetching quotes & computing predictions for all stocks</p>
            </div>
          ) : (
            <ScreenerTable
              results={results}
              onSelect={setSelectedSymbol}
              selectedSymbol={selectedSymbol}
            />
          )}
        </div>

        {/* Right: detail panel */}
        {selectedSymbol && (
          <>
            <div className="w-px bg-[#2a2d3e] flex-shrink-0" />
            <div className="w-[420px] flex-shrink-0 overflow-hidden border-l border-[#2a2d3e]">
              <ScreenerDetailPanel
                symbol={selectedSymbol}
                country={activeCountry}
                onClose={() => setSelectedSymbol(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
