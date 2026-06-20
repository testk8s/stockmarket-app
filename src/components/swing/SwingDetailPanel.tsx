import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { SwingTrade } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { SwingSetupBadge, DirectionBadge, TimeframeBadge } from './SwingSetupBadge';
import { SwingSignalMeter, SwingSignalList } from './SwingSignalMeter';
import { SwingEntryCard } from './SwingEntryCard';
import { PriceChart } from '@/components/charts/PriceChart';
import { RSIChart, MACDChart } from '@/components/charts/TechnicalCharts';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

type Tab = 'overview' | 'chart' | 'signals';

export function SwingDetailPanel({ setup, onClose }: { setup: SwingTrade; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const { stockDetails, loading, loadStockDetail } = useMarketStore();
  const detail = stockDetails[setup.symbol];

  useEffect(() => {
    loadStockDetail(setup.symbol);
  }, [setup.symbol]);

  const shortSym = setup.symbol.replace('.NS','').replace('.L','').replace('.T','').replace('.DE','').replace('.HK','');
  const sym = setup.currency === 'INR' ? '₹' : setup.currency === 'JPY' ? '¥' : setup.currency === 'EUR' ? '€' : '$';

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2d3e] bg-[#1a1d26] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base font-black text-slate-200">{shortSym}</h2>
              <DirectionBadge direction={setup.direction} />
              <SwingSetupBadge setupType={setup.setupType} />
            </div>
            <p className="text-xs text-slate-500 truncate mb-1">{setup.name}</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-slate-200 tabular-nums">{sym}{setup.currentPrice.toFixed(2)}</span>
              <TimeframeBadge timeframe={setup.timeframe} />
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => loadStockDetail(setup.symbol)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors">
              <RefreshCw size={12} className={loading.detail ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2d3e] bg-[#1a1d26] flex-shrink-0">
        {([
          { id: 'overview', label: '📋 Overview' },
          { id: 'chart',    label: '📈 Chart' },
          { id: 'signals',  label: '🔔 Signals' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              tab === t.id ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'overview' && (
          <>
            <SwingSignalMeter
              priceScore={setup.priceScore}
              volumeScore={setup.volumeScore}
              technicalScore={setup.technicalScore}
              newsScore={setup.newsScore}
              overallScore={setup.overallScore}
            />
            <SwingEntryCard setup={setup} />
          </>
        )}

        {tab === 'chart' && (
          !detail && loading.detail ? (
            <div className="space-y-4">
              <ChartSkeleton height={260} />
              <ChartSkeleton height={120} />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <PriceChart data={detail.historical} symbol={shortSym} currency={setup.currency} />
              <RSIChart data={detail.historical} />
              <MACDChart data={detail.historical} />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-slate-600" />
              Loading chart data…
            </div>
          )
        )}

        {tab === 'signals' && (
          <SwingSignalList signals={setup.signals} />
        )}
      </div>
    </div>
  );
}
