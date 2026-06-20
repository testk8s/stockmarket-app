import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { PredictionResult } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface PredictionPanelProps {
  prediction: PredictionResult;
  currency?: string;
}

function ConfidenceGauge({ score }: { score: number }) {
  const pct = score;
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return (
    <div className="relative w-32 h-16 mx-auto">
      <svg viewBox="0 0 100 55" className="w-full h-full">
        {/* Background arc */}
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#2a2d3e" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 125.6} 125.6`}
        />
        <text x="50" y="52" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{score.toFixed(0)}%</text>
      </svg>
      <p className="text-center text-xs text-slate-500 -mt-1">{label} Confidence</p>
    </div>
  );
}

function SignalBar({ weight }: { weight: number }) {
  const pct = Math.min(100, (weight / 2) * 100);
  return (
    <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
      <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PredictionPanel({ prediction, currency = 'USD' }: PredictionPanelProps) {
  const { estimatedGrowthPercent, confidenceScore, direction, signals, currentPrice, predictedPrice } = prediction;

  const directionColor = direction === 'bullish' ? 'text-green-400' : direction === 'bearish' ? 'text-red-400' : 'text-slate-400';
  const directionBg = direction === 'bullish' ? 'border-green-500/30 bg-green-500/5' : direction === 'bearish' ? 'border-red-500/30 bg-red-500/5' : 'border-slate-600 bg-slate-700/10';
  const DirectionIcon = direction === 'bullish' ? TrendingUp : direction === 'bearish' ? TrendingDown : Minus;

  const positiveSignals = signals.filter(s => s.impact === 'positive');
  const negativeSignals = signals.filter(s => s.impact === 'negative');
  const neutralSignals = signals.filter(s => s.impact === 'neutral');

  const sym = currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-3">
      {/* Main prediction card */}
      <Card className={`border-2 ${directionBg}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DirectionIcon size={18} className={directionColor} />
              <span className={`text-lg font-bold uppercase ${directionColor}`}>{direction}</span>
            </div>
            <p className="text-xs text-slate-500">2-Week Prediction</p>
          </div>
          <ConfidenceGauge score={confidenceScore} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0f1117]/50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Current Price</p>
            <p className="text-base font-bold text-slate-200 tabular-nums">{sym}{currentPrice.toFixed(2)}</p>
          </div>
          <div className="bg-[#0f1117]/50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Target Price</p>
            <p className={`text-base font-bold tabular-nums ${directionColor}`}>{sym}{predictedPrice.toFixed(2)}</p>
          </div>
          <div className={`rounded-lg p-3 ${direction === 'bullish' ? 'bg-green-500/10' : direction === 'bearish' ? 'bg-red-500/10' : 'bg-slate-700/20'}`}>
            <p className="text-xs text-slate-500 mb-1">Est. Return</p>
            <p className={`text-base font-bold tabular-nums ${directionColor}`}>
              {estimatedGrowthPercent > 0 ? '+' : ''}{estimatedGrowthPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80">
            Predictions are based on historical patterns and technical/fundamental signals. Not investment advice. Past performance does not guarantee future results.
          </p>
        </div>
      </Card>

      {/* Signal breakdown */}
      <Card>
        <CardHeader
          title="Signal Breakdown"
          subtitle={`${signals.length} signals analyzed`}
          action={
            <div className="flex gap-2 text-xs">
              <span className="text-green-400">{positiveSignals.length}↑</span>
              <span className="text-red-400">{negativeSignals.length}↓</span>
              <span className="text-slate-500">{neutralSignals.length}—</span>
            </div>
          }
        />
        <div className="space-y-2">
          {signals.map((signal, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  {signal.impact === 'positive' ? (
                    <TrendingUp size={11} className="text-green-400" />
                  ) : signal.impact === 'negative' ? (
                    <TrendingDown size={11} className="text-red-400" />
                  ) : (
                    <Minus size={11} className="text-slate-500" />
                  )}
                  <span className="text-xs text-slate-400">{signal.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium tabular-nums ${
                    signal.impact === 'positive' ? 'text-green-400' : signal.impact === 'negative' ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    {signal.value}
                  </span>
                  <Badge
                    variant={signal.impact === 'positive' ? 'green' : signal.impact === 'negative' ? 'red' : 'gray'}
                    size="sm"
                  >
                    {signal.impact === 'positive' ? '+' : signal.impact === 'negative' ? '−' : '·'}
                  </Badge>
                </div>
              </div>
              <SignalBar weight={signal.weight} />
            </div>
          ))}
        </div>
      </Card>

      {/* Score summary */}
      <Card>
        <CardHeader title="Model Summary" />
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-[#2a2d3e]/50">
            <span className="text-xs text-slate-400">Total Signals</span>
            <span className="text-xs text-slate-200 font-medium">{signals.length}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-[#2a2d3e]/50">
            <span className="text-xs text-slate-400">Bullish Signals</span>
            <span className="text-xs text-green-400 font-medium">{positiveSignals.length}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-[#2a2d3e]/50">
            <span className="text-xs text-slate-400">Bearish Signals</span>
            <span className="text-xs text-red-400 font-medium">{negativeSignals.length}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-[#2a2d3e]/50">
            <span className="text-xs text-slate-400">Confidence Score</span>
            <span className={`text-xs font-bold ${confidenceScore >= 70 ? 'text-green-400' : confidenceScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {confidenceScore.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-slate-400">Horizon</span>
            <Badge variant="blue">2 Weeks</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
