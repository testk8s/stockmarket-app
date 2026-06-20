import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Market, StockQuote, WatchlistEntry, MarketSummary,
  ViewTab, StockDetailData, NewsItem
} from '@/types';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import {
  getBatchQuotes, getFullStockData, getMarketSummary, getNews
} from '@/services/stockService';

const DEFAULT_INDIA_WATCHLIST: WatchlistEntry[] = INDIAN_STOCKS.slice(0, 20).map(s => ({
  symbol: s.symbol,
  market: 'india' as Market,
  addedAt: Date.now(),
}));

const DEFAULT_GLOBAL_WATCHLIST: WatchlistEntry[] = GLOBAL_STOCKS.slice(0, 20).map(s => ({
  symbol: s.symbol,
  market: 'global' as Market,
  addedAt: Date.now(),
}));

interface LoadingState {
  quotes: boolean;
  detail: boolean;
  summary: boolean;
  news: boolean;
}

interface MarketState {
  // Navigation
  activeMarket: Market;
  activeTab: ViewTab;
  selectedSymbol: string | null;

  // Watchlists (persisted)
  indiaWatchlist: WatchlistEntry[];
  globalWatchlist: WatchlistEntry[];

  // Live data
  quotes: Record<string, StockQuote>;
  stockDetails: Record<string, StockDetailData>;
  marketSummary: Record<Market, MarketSummary | null>;
  news: NewsItem[];

  // UI
  loading: LoadingState;
  error: string | null;
  searchQuery: string;
  sortField: keyof StockQuote;
  sortDir: 'asc' | 'desc';
  filterSector: string;

  // Actions
  setActiveMarket: (market: Market) => void;
  setActiveTab: (tab: ViewTab) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  addToWatchlist: (symbol: string, market: Market) => void;
  removeFromWatchlist: (symbol: string, market: Market) => void;
  setWatchlistNotes: (symbol: string, market: Market, notes: string) => void;
  setAlertPrice: (symbol: string, market: Market, price: number | undefined) => void;
  reorderWatchlist: (market: Market, from: number, to: number) => void;
  setSearchQuery: (q: string) => void;
  setSortField: (field: keyof StockQuote) => void;
  setFilterSector: (sector: string) => void;
  refreshQuotes: (market: Market) => Promise<void>;
  loadStockDetail: (symbol: string) => Promise<void>;
  refreshMarketSummary: (market: Market) => Promise<void>;
  refreshNews: (market: Market) => Promise<void>;
  clearError: () => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      activeMarket: 'india',
      activeTab: 'watchlist',
      selectedSymbol: null,

      indiaWatchlist: DEFAULT_INDIA_WATCHLIST,
      globalWatchlist: DEFAULT_GLOBAL_WATCHLIST,

      quotes: {},
      stockDetails: {},
      marketSummary: { india: null, global: null },
      news: [],

      loading: { quotes: false, detail: false, summary: false, news: false },
      error: null,
      searchQuery: '',
      sortField: 'changePercent',
      sortDir: 'desc',
      filterSector: '',

      setActiveMarket: (market) => set({ activeMarket: market, selectedSymbol: null }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

      addToWatchlist: (symbol, market) => {
        const { indiaWatchlist, globalWatchlist } = get();
        const list = market === 'india' ? indiaWatchlist : globalWatchlist;
        if (list.length >= 500) return;
        if (list.find(e => e.symbol === symbol)) return;
        const entry: WatchlistEntry = { symbol, market, addedAt: Date.now() };
        if (market === 'india') {
          set({ indiaWatchlist: [...list, entry] });
        } else {
          set({ globalWatchlist: [...list, entry] });
        }
      },

      removeFromWatchlist: (symbol, market) => {
        const { indiaWatchlist, globalWatchlist } = get();
        if (market === 'india') {
          set({ indiaWatchlist: indiaWatchlist.filter(e => e.symbol !== symbol) });
        } else {
          set({ globalWatchlist: globalWatchlist.filter(e => e.symbol !== symbol) });
        }
      },

      setWatchlistNotes: (symbol, market, notes) => {
        const list = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;
        const updated = list.map(e => e.symbol === symbol ? { ...e, notes } : e);
        if (market === 'india') set({ indiaWatchlist: updated });
        else set({ globalWatchlist: updated });
      },

      setAlertPrice: (symbol, market, price) => {
        const list = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;
        const updated = list.map(e => e.symbol === symbol ? { ...e, alertPrice: price } : e);
        if (market === 'india') set({ indiaWatchlist: updated });
        else set({ globalWatchlist: updated });
      },

      reorderWatchlist: (market, from, to) => {
        const list = [...(market === 'india' ? get().indiaWatchlist : get().globalWatchlist)];
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        if (market === 'india') set({ indiaWatchlist: list });
        else set({ globalWatchlist: list });
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setSortField: (field) => {
        const { sortField, sortDir } = get();
        if (sortField === field) {
          set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
        } else {
          set({ sortField: field, sortDir: 'desc' });
        }
      },
      setFilterSector: (sector) => set({ filterSector: sector }),

      refreshQuotes: async (market) => {
        set(s => ({ loading: { ...s.loading, quotes: true }, error: null }));
        try {
          const watchlist = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;
          const allStocks = market === 'india' ? INDIAN_STOCKS : GLOBAL_STOCKS;
          const stocksToFetch = watchlist.map(w => {
            const meta = allStocks.find(s => s.symbol === w.symbol);
            return { symbol: w.symbol, name: meta?.name || w.symbol, exchange: meta?.exchange || '' };
          });

          const results = await getBatchQuotes(stocksToFetch, market);
          const quotesMap = { ...get().quotes };
          results.forEach(q => { quotesMap[q.symbol] = q; });
          set({ quotes: quotesMap });

          // Update market summary
          get().refreshMarketSummary(market);
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set(s => ({ loading: { ...s.loading, quotes: false } }));
        }
      },

      loadStockDetail: async (symbol) => {
        const { stockDetails } = get();
        if (stockDetails[symbol] && Date.now() - (stockDetails[symbol].quote?.timestamp || 0) < 120000) return;

        set(s => ({ loading: { ...s.loading, detail: true }, error: null }));
        try {
          const quote = get().quotes[symbol];
          const allStocks = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];
          const meta = allStocks.find(s => s.symbol === symbol);
          const market: Market = meta?.market || (quote?.exchange === 'NSE' || quote?.exchange === 'BSE' ? 'india' : 'global');

          const data = await getFullStockData(
            symbol, market,
            meta?.name || quote?.name || symbol,
            meta?.exchange || quote?.exchange || ''
          );

          const quotes = { ...get().quotes, [symbol]: data.quote };
          const details = { ...get().stockDetails, [symbol]: data };
          set({ quotes, stockDetails: details });
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set(s => ({ loading: { ...s.loading, detail: false } }));
        }
      },

      refreshMarketSummary: async (market) => {
        try {
          const watchlist = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;
          const quoteList = watchlist.map(w => get().quotes[w.symbol]).filter(Boolean) as StockQuote[];
          if (quoteList.length === 0) return;
          const summary = await getMarketSummary(market, quoteList);
          set(s => ({ marketSummary: { ...s.marketSummary, [market]: summary } }));
        } catch { /* silent */ }
      },

      refreshNews: async (market) => {
        set(s => ({ loading: { ...s.loading, news: true } }));
        try {
          const watchlist = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;
          const symbols = watchlist.slice(0, 30).map(w => w.symbol);
          const news = await getNews(symbols);
          set({ news });
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set(s => ({ loading: { ...s.loading, news: false } }));
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'stockmarket-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        indiaWatchlist: state.indiaWatchlist,
        globalWatchlist: state.globalWatchlist,
        activeMarket: state.activeMarket,
      }),
    }
  )
);
