import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AlgoStrategy, AlgoSignal, AlgoOrder, AlgoPosition,
  BacktestResult, AlgoPortfolioStats, AlgoStrategyType
} from '@/types';
import {
  STRATEGY_TEMPLATES, runBacktest, generateLiveSignals, simulateOrder
} from '@/services/algoEngine';
import { getHistorical, getQuote } from '@/services/stockService';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';

const INITIAL_CAPITAL = 1_000_000; // ₹10 Lakh / $1M paper account

function makeId() { return `strat-${Date.now()}-${Math.floor(Math.random() * 9999)}`; }

interface AlgoState {
  // Strategies
  strategies: AlgoStrategy[];
  activeStrategyId: string | null;

  // Execution state
  signals: AlgoSignal[];
  orders: AlgoOrder[];
  positions: AlgoPosition[];

  // Paper portfolio
  capitalTotal: number;
  capitalAvailable: number;

  // Backtest
  backtestResult: BacktestResult | null;
  backtestSymbol: string;
  backtestLoading: boolean;

  // UI
  activeTab: 'strategies' | 'backtest' | 'signals' | 'orders' | 'portfolio';
  loading: boolean;
  error: string | null;
  scanInterval: number | null;

  // Derived
  portfolioStats: () => AlgoPortfolioStats;

  // Actions
  createStrategy: (type: AlgoStrategyType, symbols?: string[]) => AlgoStrategy;
  updateStrategy: (id: string, patch: Partial<AlgoStrategy>) => void;
  deleteStrategy: (id: string) => void;
  setActiveStrategy: (id: string | null) => void;
  toggleRunning: (id: string) => void;
  setActiveTab: (tab: AlgoState['activeTab']) => void;

  runBacktestAction: (strategyId: string, symbol: string) => Promise<void>;
  setBacktestSymbol: (s: string) => void;

  scanSignals: () => Promise<void>;
  actOnSignal: (signalId: string) => void;
  dismissSignal: (signalId: string) => void;
  clearOldSignals: () => void;

  closePosition: (symbol: string) => void;
  clearError: () => void;
}

export const useAlgoStore = create<AlgoState>()(
  persist(
    (set, get) => ({
      strategies: [],
      activeStrategyId: null,
      signals: [],
      orders: [],
      positions: [],
      capitalTotal: INITIAL_CAPITAL,
      capitalAvailable: INITIAL_CAPITAL,
      backtestResult: null,
      backtestSymbol: 'RELIANCE.NS',
      backtestLoading: false,
      activeTab: 'strategies',
      loading: false,
      error: null,
      scanInterval: null,

      portfolioStats: () => {
        const { positions, orders, capitalTotal, capitalAvailable, strategies } = get();
        const deployed = capitalTotal - capitalAvailable;
        const totalPnL = positions.reduce((s, p) => s + p.pnl, 0);
        const todayPnL = orders
          .filter(o => o.filledAt && Date.now() - o.filledAt < 86400000)
          .reduce((s, o) => s + (o.pnl ?? 0), 0);
        const closes  = orders.filter(o => o.side === 'sell');
        const wins    = closes.filter(o => (o.pnl ?? 0) > 0);
        const winRate = closes.length > 0 ? (wins.length / closes.length) * 100 : 0;
        return {
          totalCapital: capitalTotal,
          deployedCapital: deployed,
          availableCapital: capitalAvailable,
          totalPnL,
          totalPnLPercent: capitalTotal > 0 ? (totalPnL / capitalTotal) * 100 : 0,
          todayPnL,
          winRate,
          totalOrders: orders.length,
          openPositions: positions.length,
          activeStrategies: strategies.filter(s => s.status === 'running').length,
        };
      },

      createStrategy: (type, symbols) => {
        const template = STRATEGY_TEMPLATES[type];
        const defaults = type === 'sma_crossover' || type === 'ema_crossover'
          ? INDIAN_STOCKS.slice(0, 5).map(s => s.symbol)
          : GLOBAL_STOCKS.slice(0, 5).map(s => s.symbol);
        const strategy: AlgoStrategy = {
          ...template,
          id: makeId(),
          symbols: symbols ?? defaults,
          status: 'idle',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ strategies: [...s.strategies, strategy], activeStrategyId: strategy.id }));
        return strategy;
      },

      updateStrategy: (id, patch) => {
        set(s => ({
          strategies: s.strategies.map(st => st.id === id ? { ...st, ...patch, updatedAt: Date.now() } : st),
        }));
      },

      deleteStrategy: (id) => {
        set(s => ({
          strategies: s.strategies.filter(st => st.id !== id),
          activeStrategyId: s.activeStrategyId === id ? null : s.activeStrategyId,
        }));
      },

      setActiveStrategy: (id) => set({ activeStrategyId: id }),
      toggleRunning: (id) => {
        const { strategies } = get();
        const st = strategies.find(s => s.id === id);
        if (!st) return;
        const next: AlgoStrategy['status'] = st.status === 'running' ? 'paused' : 'running';
        get().updateStrategy(id, { status: next });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      runBacktestAction: async (strategyId, symbol) => {
        const { strategies } = get();
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;
        set({ backtestLoading: true, error: null, backtestResult: null });
        try {
          const data = await getHistorical(symbol, 365);
          if (data.length < 50) throw new Error('Not enough historical data for backtest');
          const result = runBacktest(strategy, symbol, data, get().capitalTotal);
          set({ backtestResult: result, backtestSymbol: symbol });
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set({ backtestLoading: false });
        }
      },

      setBacktestSymbol: (s) => set({ backtestSymbol: s }),

      scanSignals: async () => {
        const { strategies } = get();
        const running = strategies.filter(s => s.status === 'running');
        if (!running.length) return;

        set({ loading: true, error: null });
        try {
          const allSymbols = [...new Set(running.flatMap(s => s.symbols))];
          const allStocks  = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];

          const [dataMap, quoteMap] = await Promise.all([
            Promise.all(allSymbols.map(sym => getHistorical(sym, 60).then(d => [sym, d] as [string, typeof d]))).then(Object.fromEntries),
            Promise.all(allSymbols.map(async sym => {
              const meta = allStocks.find(s => s.symbol === sym);
              const q = await getQuote(sym, meta?.market ?? 'global', meta?.name ?? sym, meta?.exchange ?? 'NYSE');
              return [sym, { price: q.price, name: q.name, exchange: q.exchange, currency: q.currency }] as [string, { price: number; name: string; exchange: string; currency: string }];
            })).then(Object.fromEntries),
          ]);

          const newSignals = generateLiveSignals(running, dataMap, quoteMap);

          // Auto-execute signals as paper orders
          const newOrders: AlgoOrder[] = [];
          const newPositions = [...get().positions];
          let capital = get().capitalAvailable;

          for (const sig of newSignals) {
            const strategy = running.find(s => s.id === sig.strategyId);
            if (!strategy) continue;
            const order = simulateOrder(sig, strategy, capital, newPositions);
            if (!order) continue;

            if (order.side === 'buy') {
              capital -= order.quantity * (order.filledPrice ?? order.price);
              newPositions.push({
                symbol: sig.symbol,
                name: sig.name,
                exchange: sig.exchange,
                strategyId: strategy.id,
                strategyName: strategy.name,
                side: 'buy',
                quantity: order.quantity,
                entryPrice: order.filledPrice ?? order.price,
                currentPrice: order.price,
                currency: sig.currency,
                pnl: 0,
                pnlPercent: 0,
                stopLoss: order.price * (1 - strategy.stopLossPercent / 100),
                takeProfit: order.price * (1 + strategy.takeProfitPercent / 100),
                openedAt: Date.now(),
                durationMs: 0,
              });
            } else {
              const pos = newPositions.findIndex(p => p.symbol === sig.symbol);
              if (pos >= 0) {
                const p = newPositions[pos];
                const pnlPct = ((order.filledPrice ?? order.price) - p.entryPrice) / p.entryPrice * 100;
                const pnl = (((order.filledPrice ?? order.price) - p.entryPrice) * p.quantity);
                order.pnl = parseFloat(pnl.toFixed(2));
                order.pnlPercent = parseFloat(pnlPct.toFixed(2));
                capital += p.quantity * (order.filledPrice ?? order.price);
                newPositions.splice(pos, 1);
              }
            }
            newOrders.push(order);
          }

          set(st => ({
            signals: [...newSignals, ...st.signals.slice(0, 50)],
            orders: [...newOrders, ...st.orders],
            positions: newPositions,
            capitalAvailable: capital,
          }));
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set({ loading: false });
        }
      },

      actOnSignal: (signalId) => {
        set(s => ({ signals: s.signals.map(sig => sig.id === signalId ? { ...sig, status: 'acted' as const } : sig) }));
      },
      dismissSignal: (signalId) => {
        set(s => ({ signals: s.signals.map(sig => sig.id === signalId ? { ...sig, status: 'dismissed' as const } : sig) }));
      },
      clearOldSignals: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        set(s => ({ signals: s.signals.filter(sig => sig.generatedAt > cutoff) }));
      },

      closePosition: (symbol) => {
        const { positions, capitalAvailable } = get();
        const pos = positions.find(p => p.symbol === symbol);
        if (!pos) return;
        const proceeds = pos.quantity * pos.currentPrice;
        const pnl = (pos.currentPrice - pos.entryPrice) * pos.quantity;
        const closingOrder: AlgoOrder = {
          id: `ord-close-${Date.now()}`,
          strategyId: pos.strategyId,
          strategyName: pos.strategyName,
          symbol: pos.symbol,
          name: pos.name,
          side: 'sell',
          type: 'market',
          quantity: pos.quantity,
          price: pos.currentPrice,
          filledPrice: pos.currentPrice,
          currency: pos.currency,
          status: 'filled',
          filledAt: Date.now(),
          createdAt: Date.now(),
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: parseFloat(((pos.currentPrice - pos.entryPrice) / pos.entryPrice * 100).toFixed(2)),
        };
        set(s => ({
          positions: s.positions.filter(p => p.symbol !== symbol),
          orders: [closingOrder, ...s.orders],
          capitalAvailable: capitalAvailable + proceeds,
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'algo-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        strategies: s.strategies,
        orders: s.orders.slice(0, 200),
        positions: s.positions,
        capitalAvailable: s.capitalAvailable,
        capitalTotal: s.capitalTotal,
        backtestSymbol: s.backtestSymbol,
      }),
    }
  )
);
