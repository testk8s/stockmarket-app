import type { SwingTrade } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface SwingEntryCardProps {
  setup: SwingTrade;
}

function PriceLevel({ label, value, color, sym, note }: { label: string; value: number; color: string; sym: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2d3e]/50">
      <div>
        <span className="text-xs text-slate-400">{label}</span>
        {note && <span className="text-xs text-slate-600 ml-1.5">{note}</span>}
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {sym}{value.toFixed(2)}
      </span>
    </div>
  );
}

export function SwingEntryCard({ setup }: SwingEntryCardProps) {
  const sym = setup.currency === 'INR' ? '₹' : setup.currency === 'JPY' ? '¥' : setup.currency === 'EUR' ? '€' : '$';
  const isLong = setup.direction === 'long';
  const rrColor = setup.riskRewardRatio >= 3 ? '#22c55e' : setup.riskRewardRatio >= 2 ? '#f59e0b' : '#ef4444';

  // Risk-reward visual bar
  const riskW = 100 / (1 + setup.riskRewardRatio);
  const rewW = 100 - riskW;

  return (
    <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Trade Setup</p>
          <p className={`text-sm font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
            {isLong ? '▲ LONG' : '▼ SHORT'} — {setup.setupType.replace(/_/g, ' ').toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Risk / Reward</p>
          <p className="text-xl font-black tabular-nums" style={{ color: rrColor }}>1 : {setup.riskRewardRatio.toFixed(1)}</p>
        </div>
      </div>

      {/* RR visual */}
      <div>
        <div className="flex rounded-full overflow-hidden h-2 mb-1">
          <div className="bg-red-500/60 transition-all" style={{ width: `${riskW}%` }} />
          <div className="bg-green-500/60 transition-all" style={{ width: `${rewW}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span className="text-red-400">Risk {setup.riskPercent.toFixed(2)}%</span>
          <span className="text-green-400">Reward {setup.rewardPercent.toFixed(2)}%</span>
        </div>
      </div>

      {/* Entry zone */}
      <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-400 mb-2">Entry Zone</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-slate-500">Low</p>
            <p className="text-sm font-bold text-blue-300 tabular-nums">{sym}{setup.entryZoneLow.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">High</p>
            <p className="text-sm font-bold text-blue-300 tabular-nums">{sym}{setup.entryZoneHigh.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">Current: <span className="text-slate-300 font-semibold">{sym}{setup.currentPrice.toFixed(2)}</span></p>
      </div>

      {/* Levels */}
      <div>
        <PriceLevel label="Stop Loss" value={setup.stopLoss} color="#ef4444" sym={sym} note="(exit if breached)" />
        <PriceLevel label="Target 1" value={setup.target1} color="#86efac" sym={sym} note="(partial exit 40%)" />
        <PriceLevel label="Target 2" value={setup.target2} color="#22c55e" sym={sym} note="(primary target 40%)" />
        <PriceLevel label="Target 3" value={setup.target3} color="#16a34a" sym={sym} note="(trail remainder)" />
      </div>

      {/* Context metrics */}
      <div className="grid grid-cols-3 gap-2 bg-[#0f1117]/50 rounded-lg p-3">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Vol Ratio</p>
          <p className={`text-sm font-bold tabular-nums ${setup.volumeRatio > 1.5 ? 'text-cyan-400' : 'text-slate-300'}`}>
            {setup.volumeRatio.toFixed(2)}×
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">ATR</p>
          <p className="text-sm font-bold text-slate-300 tabular-nums">{sym}{setup.atr.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Key Level</p>
          <p className="text-sm font-bold text-yellow-400 tabular-nums">{sym}{setup.keyLevel.toFixed(2)}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-yellow-500/8 border border-yellow-500/20 rounded-lg px-3 py-2">
        <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/70 leading-relaxed">
          Swing setups are for educational analysis only. Always use proper position sizing. Past patterns do not guarantee future moves.
        </p>
      </div>
    </div>
  );
}
