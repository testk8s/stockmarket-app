import { useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { CountryMarket } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { COUNTRY_STOCKS, COUNTRY_INFO } from '@/data/countryStocks';
import { formatPrice } from '@/utils/format';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Badge } from '@/components/ui/Badge';
import { PredictionChart } from '@/components/charts/PredictionChart';
import { PredictionPanel } from '@/components/stock/PredictionPanel';
import { TechnicalPanel } from '@/components/stock/TechnicalPanel';
import { FundamentalsPanel } from '@/components/stock/FundamentalsPanel';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { useState } from 'react';
import { RSIChart, MACDChart } from '@/components/charts/TechnicalCharts';

type DetailTab = 'prediction' | 'technical' | 'fundamental';

interface ScreenerDetailPanelProps {
  symbol: string;
  country: CountryMarket;
  onClose: () => void;
}

export function ScreenerDetailPanel({ symbol, country, onClose }: ScreenerDetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>('prediction');
  const { stockDetails, loading, loadStockDetail } = useMarketStore();
  const detail = stockDetails[symbol];
  const countryInfo = COUNTRY_INFO[country];
  const stockMeta = COUNTRY_STOCKS[country].find(s => s.symbol === symbol);

  useEffect(() => {
    loadStockDetail(symbol);
  }, [symbol]);

  const quote = detail?.quote;
  const shortSymbol = symbol.replace('.L', '').replace('.T', '').replace('.DE', '').replace('.HK', '');

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#2a2d3e] bg-[#1a1d26] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg">{countryInfo.flag}</span>
            <h2 className="text-base font-bold text-slate-200">{shortSymbol}</h2>
            <Badge variant="gray">{stockMeta?.exchange}</Badge>
            {stockMeta?.sector && <Badge variant="blue">{stockMeta.sector}</Badge>}
          </div>
          <p className="text-xs text-slate-500 truncate">{stockMeta?.name}</p>
          {quote && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xl font-bold text-slate-200 tabular-nums">
                {formatPrice(quote.price, quote.currency)}
              </span>
              <ChangeIndicator value={quote.changePercent} isPercent showIcon size="sm" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={() => loadStockDetail(symbol)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors"
          >
            <RefreshCw size={13} className={loading.detail ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2d3e] bg-[#1a1d26] flex-shrink-0">
        {([
          { id: 'prediction', label: '📈 Prediction' },
          { id: 'technical', label: '⚙️ Technical' },
          { id: 'fundamental', label: '📊 Fundamental' },
        ] as { id: DetailTab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!detail && loading.detail ? (
          <div className="space-y-4">
            <ChartSkeleton height={260} />
            <CardSkeleton rows={5} />
          </div>
        ) : !detail ? (
          <div className="text-center py-16 text-slate-500">
            <RefreshCw size={28} className="mx-auto mb-3 text-slate-600 animate-spin" />
            <p className="text-sm">Loading data…</p>
          </div>
        ) : (
          <>
            {tab === 'prediction' && (
              <div className="space-y-4">
                <PredictionChart
                  prediction={detail.prediction}
                  historical={detail.historical}
                  currency={detail.quote.currency}
                />
                <PredictionPanel prediction={detail.prediction} currency={detail.quote.currency} />
              </div>
            )}
            {tab === 'technical' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <RSIChart data={detail.historical} />
                  <MACDChart data={detail.historical} />
                </div>
                <TechnicalPanel technicals={detail.technicals} price={detail.quote.price} />
              </div>
            )}
            {tab === 'fundamental' && (
              <FundamentalsPanel fundamentals={detail.fundamentals} quote={detail.quote} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
