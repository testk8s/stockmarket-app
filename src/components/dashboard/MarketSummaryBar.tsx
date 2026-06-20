import { TrendingUp, TrendingDown, BarChart2, RefreshCw } from 'lucide-react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { formatVolume } from '@/utils/format';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';

export function MarketSummaryBar({ market }: { market: Market }) {
  const { marketSummary, loading, refreshQuotes } = useMarketStore();
  const summary = marketSummary[market];

  if (!summary) {
    return (
      <div className="bg-[#1a1d26] border-b border-[#2a2d3e] px-4 py-2 flex items-center gap-4">
        <div className="skeleton h-6 w-32 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-40 rounded" />
      </div>
    );
  }

  const isUp = summary.indexChangePercent >= 0;

  return (
    <div className="bg-[#1a1d26] border-b border-[#2a2d3e] px-4 py-2.5 flex items-center gap-6 overflow-x-auto">
      {/* Index */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm font-bold text-slate-200">{summary.indexName}</span>
        <span className={`text-base font-bold tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {summary.indexValue.toFixed(0)}
        </span>
        <ChangeIndicator value={summary.indexChangePercent} isPercent showIcon size="sm" />
      </div>

      <div className="h-4 w-px bg-[#2a2d3e] flex-shrink-0" />

      {/* A/D ratio */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <TrendingUp size={12} className="text-green-400" />
          <span className="text-xs text-green-400 font-medium">{summary.advancers}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={12} className="text-red-400" />
          <span className="text-xs text-red-400 font-medium">{summary.decliners}</span>
        </div>
        <span className="text-xs text-slate-500">{summary.unchanged} unchanged</span>
      </div>

      <div className="h-4 w-px bg-[#2a2d3e] flex-shrink-0" />

      {/* Volume */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <BarChart2 size={12} className="text-slate-500" />
        <span className="text-xs text-slate-400">Vol:</span>
        <span className="text-xs text-slate-200 font-medium">{formatVolume(summary.totalVolume)}</span>
      </div>

      <div className="h-4 w-px bg-[#2a2d3e] flex-shrink-0" />

      {/* Top movers ticker */}
      <div className="flex items-center gap-3 overflow-x-auto flex-shrink-0">
        <span className="text-xs text-slate-600 flex-shrink-0">Top:</span>
        {summary.topGainers.slice(0, 3).map(q => (
          <span key={q.symbol} className="text-xs flex items-center gap-1 flex-shrink-0">
            <span className="text-slate-400">{q.symbol.replace('.NS', '').replace('.L', '')}</span>
            <span className="text-green-400 font-medium">+{q.changePercent.toFixed(1)}%</span>
          </span>
        ))}
        {summary.topLosers.slice(0, 2).map(q => (
          <span key={q.symbol} className="text-xs flex items-center gap-1 flex-shrink-0">
            <span className="text-slate-400">{q.symbol.replace('.NS', '').replace('.L', '')}</span>
            <span className="text-red-400 font-medium">{q.changePercent.toFixed(1)}%</span>
          </span>
        ))}
      </div>

      <div className="ml-auto flex-shrink-0">
        <button
          onClick={() => refreshQuotes(market)}
          disabled={loading.quotes}
          className="p-1.5 rounded hover:bg-[#2a2d3e] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw size={12} className={loading.quotes ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
