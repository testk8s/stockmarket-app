import { Bot, Settings, FlaskConical, Radio, BookOpen, BarChart3, RefreshCw } from 'lucide-react';
import type { AlgoStrategy, AlgoSignal, AlgoPosition } from '@/types';
import { useAlgoStore } from '@/store/algoStore';
import { StrategyBuilder } from '@/components/algo/StrategyBuilder';
import { BacktestPanel } from '@/components/algo/BacktestPanel';
import { LiveSignalsPanel } from '@/components/algo/LiveSignalsPanel';
import { OrderBook } from '@/components/algo/OrderBook';
import { AlgoPortfolio } from '@/components/algo/AlgoPortfolio';

type AlgoTab = 'strategies' | 'backtest' | 'signals' | 'orders' | 'portfolio';

interface TabDef {
  id: AlgoTab;
  label: string;
  icon: React.ReactNode;
  getBadge?: (strategies: AlgoStrategy[], signals: AlgoSignal[], positions: AlgoPosition[]) => string | undefined;
}

const TABS: TabDef[] = [
  { id: 'strategies', label: 'Strategies',  icon: <Settings size={14} />,    getBadge: (st) => st.length ? `${st.length}` : undefined },
  { id: 'backtest',   label: 'Backtest',    icon: <FlaskConical size={14} /> },
  { id: 'signals',    label: 'Live Signals',icon: <Radio size={14} />,       getBadge: (_, si) => { const n = si.filter(x => x.status === 'new').length; return n ? `${n}` : undefined; } },
  { id: 'orders',     label: 'Orders',      icon: <BookOpen size={14} />,    getBadge: (_, _si, pos) => pos.length ? `${pos.length}` : undefined },
  { id: 'portfolio',  label: 'Portfolio',   icon: <BarChart3 size={14} /> },
];

export function AlgoScreen() {
  const store = useAlgoStore();
  const { activeTab, setActiveTab, strategies, signals, positions, portfolioStats, loading, scanSignals } = store;
  const stats = portfolioStats();
  const runningCount = strategies.filter(s => s.status === 'running').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 bg-[#1a1d26] border-b border-[#2a2d3e] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-200">Algo Trading Engine</h1>
              <p className="text-xs text-slate-500">
                {strategies.length} strategies · {runningCount} live · {positions.length} positions
              </p>
            </div>
          </div>
          {/* Portfolio mini stats */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Paper Capital</p>
              <p className="text-sm font-bold text-slate-200 tabular-nums">
                ₹{stats.totalCapital.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total P&L</p>
              <p className={`text-sm font-bold tabular-nums ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}₹{Math.abs(stats.totalPnL).toLocaleString(undefined,{maximumFractionDigits:0})}
              </p>
            </div>
            {runningCount > 0 && (
              <button
                onClick={scanSignals}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Scan Signals
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center border-b border-[#2a2d3e] bg-[#1a1d26] px-2 overflow-x-auto">
        {TABS.map(tab => {
          const badge = tab.getBadge?.(strategies, signals, positions);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                isActive ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {badge && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[#2a2d3e] text-slate-400'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'strategies' && <StrategyBuilder />}
        {activeTab === 'backtest'   && <BacktestPanel />}
        {activeTab === 'signals'    && <LiveSignalsPanel />}
        {activeTab === 'orders'     && <OrderBook />}
        {activeTab === 'portfolio'  && <AlgoPortfolio />}
      </div>
    </div>
  );
}
