import { create } from 'zustand';
import type { CountryMarket, ScreenerCriteria, ScreenerResult } from '@/types';
import { buildScreenerResults, fetchCountryQuotes } from '@/services/screenerService';

interface ScreenerState {
  activeCountry: CountryMarket;
  criteria: ScreenerCriteria;
  results: ScreenerResult[];
  loading: boolean;
  error: string | null;
  lastRun: number | null;
  selectedSymbol: string | null;

  setActiveCountry: (c: CountryMarket) => void;
  setCriteria: (c: Partial<ScreenerCriteria>) => void;
  resetCriteria: () => void;
  runScreener: () => Promise<void>;
  preloadCountry: (c: CountryMarket) => Promise<void>;
  setSelectedSymbol: (s: string | null) => void;
}

const DEFAULT_CRITERIA: ScreenerCriteria = {
  predictionDirection: 'all',
  minConfidence: 0,
};

export const useScreenerStore = create<ScreenerState>()((set, get) => ({
  activeCountry: 'usa',
  criteria: DEFAULT_CRITERIA,
  results: [],
  loading: false,
  error: null,
  lastRun: null,
  selectedSymbol: null,

  setActiveCountry: (c) => set({ activeCountry: c, results: [], lastRun: null }),
  setCriteria: (c) => set(s => ({ criteria: { ...s.criteria, ...c } })),
  resetCriteria: () => set({ criteria: DEFAULT_CRITERIA }),
  setSelectedSymbol: (s) => set({ selectedSymbol: s }),

  runScreener: async () => {
    const { activeCountry, criteria } = get();
    set({ loading: true, error: null });
    try {
      const results = await buildScreenerResults(activeCountry, criteria);
      set({ results, lastRun: Date.now() });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  preloadCountry: async (c) => {
    try {
      await fetchCountryQuotes(c);
    } catch { /* silent preload */ }
  },
}));
