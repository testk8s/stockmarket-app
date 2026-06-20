import { create } from 'zustand';
import type { SwingTrade, SwingFilter, SwingMarketSource } from '@/types';
import { analyzeSwingSetup } from '@/services/swingTradingService';
import { getQuote, getHistorical, getNews } from '@/services/stockService';
import { computeIndicators } from '@/services/technicalAnalysis';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { COUNTRY_STOCKS } from '@/data/countryStocks';
import { cacheService } from '@/services/cache';

// Aggregate all stocks by market source
function getStocksForMarket(market: SwingMarketSource) {
  if (market === 'india') return INDIAN_STOCKS.map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, sector: s.sector ?? 'Other', market: 'india' as SwingMarketSource }));
  if (market === 'global') return GLOBAL_STOCKS.map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, sector: s.sector ?? 'Other', market: 'global' as SwingMarketSource }));
  return (COUNTRY_STOCKS[market as keyof typeof COUNTRY_STOCKS] ?? []).map(s => ({ ...s, market: market as SwingMarketSource }));
}

const MARKET_SOURCES: SwingMarketSource[] = ['india', 'usa', 'uk', 'japan', 'germany', 'china'];

const DEFAULT_FILTER: SwingFilter = {
  market: 'all',
  setupType: 'all',
  direction: 'all',
  minScore: 55,
  minRR: 1.5,
  maxRisk: 10,
  sectors: [],
};

interface SwingState {
  setups: SwingTrade[];
  loading: boolean;
  progress: number;
  error: string | null;
  filter: SwingFilter;
  selectedSymbol: string | null;
  lastScan: number | null;
  activeMarket: SwingMarketSource | 'all';

  setFilter: (f: Partial<SwingFilter>) => void;
  resetFilter: () => void;
  setSelectedSymbol: (s: string | null) => void;
  setActiveMarket: (m: SwingMarketSource | 'all') => void;
  runScan: () => Promise<void>;
}

export const useSwingStore = create<SwingState>()((set, get) => ({
  setups: [],
  loading: false,
  progress: 0,
  error: null,
  filter: DEFAULT_FILTER,
  selectedSymbol: null,
  lastScan: null,
  activeMarket: 'all',

  setFilter: (f) => set(s => ({ filter: { ...s.filter, ...f } })),
  resetFilter: () => set({ filter: DEFAULT_FILTER }),
  setSelectedSymbol: (s) => set({ selectedSymbol: s }),
  setActiveMarket: (m) => set({ activeMarket: m }),

  runScan: async () => {
    const { activeMarket } = get();
    const markets = activeMarket === 'all' ? MARKET_SOURCES : [activeMarket];
    set({ loading: true, error: null, progress: 0, setups: [] });

    const results: SwingTrade[] = [];
    let done = 0;
    const allStocks = markets.flatMap(m => getStocksForMarket(m).slice(0, 15)); // Top 15 per market
    const total = allStocks.length;

    const CONCURRENCY = 5;
    for (let i = 0; i < allStocks.length; i += CONCURRENCY) {
      const batch = allStocks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (s) => {
          try {
            const cacheKey = `swing:${s.symbol}`;
            const cached = cacheService.get<SwingTrade>(cacheKey);
            if (cached) return cached;

            const [quote, historical, news] = await Promise.all([
              getQuote(s.symbol, s.market === 'india' ? 'india' : 'global', s.name, s.exchange),
              getHistorical(s.symbol, 60),
              getNews([s.symbol]),
            ]);
            const technicals = computeIndicators(historical);

            const setup = analyzeSwingSetup({
              symbol: s.symbol, name: s.name, exchange: s.exchange,
              sector: s.sector, market: s.market,
              quote: {
                price: quote.price, changePercent: quote.changePercent,
                volume: quote.volume, avgVolume: quote.avgVolume,
                currency: quote.currency, high: quote.week52High ?? quote.price,
                low: quote.week52Low ?? quote.price, open: quote.open,
              },
              historical, technicals, news,
            });

            cacheService.set(cacheKey, setup, 5 * 60 * 1000); // 5-min cache
            return setup;
          } catch { return null; }
        })
      );

      batchResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      });
      done += batch.length;
      set({ progress: Math.round((done / total) * 100) });
    }

    // Sort by overall score descending
    results.sort((a, b) => b.overallScore - a.overallScore);
    set({ setups: results, loading: false, progress: 100, lastScan: Date.now() });
  },
}));
