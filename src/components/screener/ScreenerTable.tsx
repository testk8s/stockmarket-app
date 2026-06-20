import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import type { ScreenerResult } from '@/types';
import { formatVolume, formatMarketCap } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

interface ScreenerTableProps {
  results: ScreenerResult[];
  onSelect: (symbol: string) => void;
  selectedSymbol: string | null;
}

type SortKey = 'score' | 'price' | 'changePercent' | 'volume' | 'estimatedGrowthPercent' | 'confidenceScore';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function DirectionBadge({ direction }: { direction: 'bullish' | 'bearish' | 'neutral' }) {
  if (direction === 'bullish') return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-green-500/15 text-green-400 border border-green-500/20">
      <TrendingUp size={9} /> Bullish
    </span>
  );
  if (direction === 'bearish') return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/15 text-red-400 border border-red-500/20">
      <TrendingDown size={9} /> Bearish
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-700/50 text-slate-400 border border-slate-600/30">
      <Minus size={9} /> Neutral
    </span>
  );
}

export function ScreenerTable({ results, onSelect, selectedSymbol }: ScreenerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...results].sort((a, b) => {
    let av: number, bv: number;
    switch (sortKey) {
      case 'score': av = a.score; bv = b.score; break;
      case 'price': av = a.quote.price; bv = b.quote.price; break;
      case 'changePercent': av = a.quote.changePercent; bv = b.quote.changePercent; break;
      case 'volume': av = a.quote.volume; bv = b.quote.volume; break;
      case 'estimatedGrowthPercent': av = a.prediction.estimatedGrowthPercent; bv = b.prediction.estimatedGrowthPercent; break;
      case 'confidenceScore': av = a.prediction.confidenceScore; bv = b.prediction.confidenceScore; break;
      default: av = a.score; bv = b.score;
    }
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 ml-auto">
      {label}
      {sortKey === k
        ? sortDir === 'desc' ? <ChevronDown size={10} className="text-blue-400" /> : <ChevronUp size={10} className="text-blue-400" />
        : <ChevronUp size={10} className="text-slate-600" />
      }
    </button>
  );

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <TrendingUp size={32} className="mb-3 text-slate-700" />
        <p className="text-sm font-medium">No results yet</p>
        <p className="text-xs mt-1">Configure filters above and click "Run Screener"</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-[#0f1117] z-10">
          <tr className="border-b border-[#2a2d3e]">
            <th className="pl-4 pr-2 py-2 text-left text-xs text-slate-600 w-8">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Symbol</th>
            <th className="px-4 py-2 text-right"><SortBtn k="price" label="Price" /></th>
            <th className="px-4 py-2 text-right"><SortBtn k="changePercent" label="Change %" /></th>
            <th className="px-4 py-2 text-right"><SortBtn k="volume" label="Volume" /></th>
            <th className="px-4 py-2 text-right text-xs text-slate-400">Mkt Cap</th>
            <th className="px-4 py-2 text-center text-xs text-slate-400">Prediction</th>
            <th className="px-4 py-2 text-right"><SortBtn k="estimatedGrowthPercent" label="2W Est." /></th>
            <th className="px-4 py-2 text-right"><SortBtn k="confidenceScore" label="Confidence" /></th>
            <th className="px-4 py-2 text-right"><SortBtn k="score" label="Score" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const isUp = r.quote.changePercent >= 0;
            const isSelected = selectedSymbol === r.symbol;
            const predIsUp = r.prediction.estimatedGrowthPercent >= 0;
            const sym = r.quote.currency === 'INR' ? '₹' : r.quote.currency === 'JPY' ? '¥' : r.quote.currency === 'EUR' ? '€' : '$';

            return (
              <tr
                key={r.symbol}
                onClick={() => onSelect(r.symbol)}
                className={`border-b border-[#2a2d3e]/60 cursor-pointer transition-colors group ${
                  isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-[#252840]/60'
                }`}
              >
                <td className="pl-4 pr-2 py-2.5 text-xs text-slate-600 tabular-nums">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-sm text-slate-200">{r.symbol.replace('.L', '').replace('.T', '').replace('.DE', '').replace('.HK', '')}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[140px]">{r.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="gray" size="sm">{r.exchange}</Badge>
                    <Badge variant="blue" size="sm">{r.sector}</Badge>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className="text-sm font-medium text-slate-200">{sym}{r.quote.price.toFixed(2)}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{r.quote.changePercent.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                  {formatVolume(r.quote.volume)}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                  {formatMarketCap(r.quote.marketCap)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <DirectionBadge direction={r.prediction.direction} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`text-sm font-bold ${predIsUp ? 'text-green-400' : 'text-red-400'}`}>
                    {predIsUp ? '+' : ''}{r.prediction.estimatedGrowthPercent.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`text-xs font-semibold ${r.prediction.confidenceScore >= 70 ? 'text-green-400' : r.prediction.confidenceScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {r.prediction.confidenceScore.toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ScoreBar score={r.score} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
