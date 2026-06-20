import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { SwingTrade } from '@/types';
import { SwingSetupBadge, DirectionBadge, TimeframeBadge } from './SwingSetupBadge';
import { Badge } from '@/components/ui/Badge';

interface SwingTableProps {
  setups: SwingTrade[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}

type SortKey = 'overallScore' | 'riskRewardRatio' | 'volumeRatio' | 'rewardPercent';

function RRBar({ rr }: { rr: number }) {
  const pct = Math.min(100, (rr / 5) * 100);
  const color = rr >= 3 ? '#22c55e' : rr >= 2 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>1:{rr.toFixed(1)}</span>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

export function SwingTable({ setups, selectedSymbol, onSelect }: SwingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('overallScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...setups].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
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

  if (!setups.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <p className="text-sm font-medium">No setups found</p>
      <p className="text-xs mt-1">Click "Run Scan" to detect swing opportunities</p>
    </div>
  );

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-[#0f1117] z-10">
          <tr className="border-b border-[#2a2d3e]">
            <th className="pl-4 pr-2 py-2.5 text-left text-xs text-slate-600 w-8">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400">Symbol</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400">Setup</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">Price</th>
            <th className="px-4 py-2.5 text-right"><SortBtn k="rewardPercent" label="Potential" /></th>
            <th className="px-4 py-2.5 text-right"><SortBtn k="riskRewardRatio" label="R:R" /></th>
            <th className="px-4 py-2.5 text-right"><SortBtn k="volumeRatio" label="Vol Ratio" /></th>
            <th className="px-4 py-2.5 text-right"><SortBtn k="overallScore" label="Score" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const sym = s.currency === 'INR' ? '₹' : s.currency === 'JPY' ? '¥' : s.currency === 'EUR' ? '€' : '$';
            const isSelected = selectedSymbol === s.symbol;
            const shortSym = s.symbol.replace('.NS','').replace('.L','').replace('.T','').replace('.DE','').replace('.HK','');
            return (
              <tr
                key={s.symbol}
                onClick={() => onSelect(s.symbol)}
                className={`border-b border-[#2a2d3e]/50 cursor-pointer transition-colors group ${
                  isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-[#252840]/60'
                }`}
              >
                <td className="pl-4 pr-2 py-2.5 text-xs text-slate-600 tabular-nums">{i+1}</td>
                <td className="px-4 py-2.5">
                  <p className="font-bold text-sm text-slate-200">{shortSym}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[130px]">{s.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="gray" size="sm">{s.exchange}</Badge>
                    <DirectionBadge direction={s.direction} />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    <SwingSetupBadge setupType={s.setupType} />
                    <TimeframeBadge timeframe={s.timeframe} />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <p className="text-sm font-semibold text-slate-200">{sym}{s.currentPrice.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">SL: {sym}{s.stopLoss.toFixed(2)}</p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`text-sm font-bold ${s.rewardPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    +{s.rewardPercent.toFixed(2)}%
                  </span>
                  <p className="text-xs text-slate-500">T2: {sym}{s.target2.toFixed(2)}</p>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RRBar rr={s.riskRewardRatio} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`text-sm font-semibold ${s.volumeRatio > 2 ? 'text-cyan-400' : s.volumeRatio > 1.2 ? 'text-blue-400' : 'text-slate-400'}`}>
                    {s.volumeRatio.toFixed(2)}×
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ScorePill score={s.overallScore} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
