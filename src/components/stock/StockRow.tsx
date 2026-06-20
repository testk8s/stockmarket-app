import { StarOff, Bell } from 'lucide-react';
import type { StockQuote, WatchlistEntry } from '@/types';
import { formatPrice, formatVolume, formatMarketCap } from '@/utils/format';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Badge } from '@/components/ui/Badge';

interface StockRowProps {
  quote: StockQuote;
  watchlistEntry?: WatchlistEntry;
  isSelected?: boolean;
  onSelect: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
  rank?: number;
}

export function StockRow({ quote, watchlistEntry, isSelected, onSelect, onRemove, rank }: StockRowProps) {
  const isUp = quote.change >= 0;
  const alertTriggered = watchlistEntry?.alertPrice !== undefined &&
    ((isUp && quote.price >= watchlistEntry.alertPrice) ||
     (!isUp && quote.price <= watchlistEntry.alertPrice));

  return (
    <tr
      onClick={() => onSelect(quote.symbol)}
      className={`border-b border-[#2a2d3e]/60 cursor-pointer transition-colors group ${
        isSelected
          ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
          : 'hover:bg-[#252840]/60'
      }`}
    >
      {rank !== undefined && (
        <td className="pl-4 pr-2 py-3 text-xs text-slate-600 tabular-nums w-8">{rank}</td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-200 truncate">
                {quote.symbol.replace('.NS', '').replace('.L', '').replace('.SI', '')}
              </span>
              <Badge variant="gray" size="sm">{quote.exchange}</Badge>
              {alertTriggered && <Bell size={11} className="text-yellow-400" />}
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[160px]">{quote.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="text-sm font-medium text-slate-200">
          {formatPrice(quote.price, quote.currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <ChangeIndicator value={quote.change} showIcon={false} size="sm" />
      </td>
      <td className="px-4 py-3 text-right">
        <ChangeIndicator value={quote.changePercent} isPercent showIcon size="sm" />
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
        {formatVolume(quote.volume)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
        {formatMarketCap(quote.marketCap)}
      </td>
      <td className="px-4 py-3 text-right w-24">
        <MiniSparkline isUp={isUp} />
      </td>
      <td className="px-4 py-3 text-right">
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(quote.symbol); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
          >
            <StarOff size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

// Micro sparkline using inline SVG (no lib dependency)
function MiniSparkline({ isUp }: { isUp: boolean }) {
  const points = [40, 35, 45, 38, 50, 42, isUp ? 58 : 32, isUp ? 62 : 28];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const norm = (v: number) => ((v - min) / (max - min)) * 24;
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * 60},${24 - norm(v)}`).join(' ');
  return (
    <svg width="60" height="24" className="inline-block">
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Compact card variant for dashboard
export function StockCard({ quote, onSelect }: { quote: StockQuote; onSelect: (s: string) => void }) {
  const isUp = quote.change >= 0;
  return (
    <div
      onClick={() => onSelect(quote.symbol)}
      className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3 cursor-pointer hover:border-blue-500/30 hover:bg-[#252840] transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-bold text-slate-200">{quote.symbol.replace('.NS', '').replace('.L', '')}</p>
          <p className="text-xs text-slate-500 truncate max-w-[100px]">{quote.name}</p>
        </div>
        <ChangeIndicator value={quote.changePercent} isPercent showIcon size="sm" />
      </div>
      <p className={`text-lg font-bold tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {formatPrice(quote.price, quote.currency)}
      </p>
      <p className="text-xs text-slate-600 mt-1">Vol: {formatVolume(quote.volume)}</p>
    </div>
  );
}
