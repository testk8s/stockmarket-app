import { useEffect, useState } from 'react';
import { X, Star, Bell, RefreshCw, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import type { Market } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { formatPrice } from '@/utils/format';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Badge } from '@/components/ui/Badge';
import { PriceChart } from '@/components/charts/PriceChart';
import { RSIChart, MACDChart, BollingerChart, StochasticChart } from '@/components/charts/TechnicalCharts';
import { TechnicalPanel } from './TechnicalPanel';
import { FundamentalsPanel } from './FundamentalsPanel';
import { NewsPanel } from './NewsPanel';
import { PredictionPanel } from './PredictionPanel';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/LoadingSkeleton';

type DetailTab = 'chart' | 'technical' | 'fundamental' | 'news' | 'prediction';

const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'chart', label: 'Chart', icon: <BarChart2 size={13} /> },
  { id: 'technical', label: 'Technical', icon: <TrendingUp size={13} /> },
  { id: 'fundamental', label: 'Fundamentals', icon: <TrendingDown size={13} /> },
  { id: 'news', label: 'News', icon: <Bell size={13} /> },
  { id: 'prediction', label: 'Prediction', icon: <Star size={13} /> },
];

interface StockDetailViewProps {
  symbol: string;
  market: Market;
  onClose: () => void;
}

export function StockDetailView({ symbol, onClose }: StockDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('chart');
  const { stockDetails, loading, loadStockDetail, news } = useMarketStore();
  const allStocks = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];
  const meta = allStocks.find(s => s.symbol === symbol);
  const detail = stockDetails[symbol];

  useEffect(() => {
    loadStockDetail(symbol);
  }, [symbol]);

  const quote = detail?.quote;

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#2a2d3e] bg-[#1a1d26]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg font-bold text-slate-200">
              {symbol.replace('.NS', '').replace('.L', '').replace('.SI', '')}
            </h2>
            <Badge variant="gray">{meta?.exchange || quote?.exchange}</Badge>
            {meta?.sector && <Badge variant="blue">{meta.sector}</Badge>}
          </div>
          <p className="text-sm text-slate-500 truncate">{meta?.name || quote?.name}</p>
          {quote && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold text-slate-200 tabular-nums">
                {formatPrice(quote.price, quote.currency)}
              </span>
              <div className="flex flex-col">
                <ChangeIndicator value={quote.change} showIcon={false} size="md" />
                <ChangeIndicator value={quote.changePercent} isPercent showIcon size="sm" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => loadStockDetail(symbol)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors"
          >
            <RefreshCw size={14} className={loading.detail ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {quote && (
        <div className="grid grid-cols-4 gap-px bg-[#2a2d3e] border-b border-[#2a2d3e]">
          {[
            { label: 'Open', value: formatPrice(quote.open, quote.currency) },
            { label: 'High', value: formatPrice(quote.high, quote.currency) },
            { label: 'Low', value: formatPrice(quote.low, quote.currency) },
            { label: 'Volume', value: (quote.volume / 1e6).toFixed(2) + 'M' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1a1d26] py-2 px-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xs font-semibold text-slate-200 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#2a2d3e] bg-[#1a1d26]">
        {DETAIL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!detail && loading.detail ? (
          <div className="space-y-4">
            <ChartSkeleton height={280} />
            <div className="grid grid-cols-2 gap-3">
              <CardSkeleton rows={4} />
              <CardSkeleton rows={4} />
            </div>
          </div>
        ) : !detail ? (
          <div className="text-center py-16 text-slate-500">
            <RefreshCw size={28} className="mx-auto mb-3 text-slate-600" />
            <p>Loading stock data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'chart' && (
              <div className="space-y-4">
                <PriceChart data={detail.historical} symbol={symbol} currency={detail.quote.currency} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RSIChart data={detail.historical} />
                  <MACDChart data={detail.historical} />
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BollingerChart data={detail.historical} />
                  <StochasticChart data={detail.historical} />
                </div>
                <TechnicalPanel technicals={detail.technicals} price={detail.quote.price} />
              </div>
            )}

            {activeTab === 'fundamental' && (
              <FundamentalsPanel fundamentals={detail.fundamentals} quote={detail.quote} />
            )}

            {activeTab === 'news' && (
              <NewsPanel
                news={detail.news.length > 0 ? detail.news : news}
                filterSymbol={symbol}
                loading={loading.news}
              />
            )}

            {activeTab === 'prediction' && (
              <PredictionPanel prediction={detail.prediction} currency={detail.quote.currency} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
