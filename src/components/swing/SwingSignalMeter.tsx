import type { SwingSignal } from '@/types';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart2, Activity, Newspaper } from 'lucide-react';

interface SwingSignalMeterProps {
  priceScore: number;
  volumeScore: number;
  technicalScore: number;
  newsScore: number;
  overallScore: number;
}

function ScoreArc({ score, label, color, size = 80 }: { score: number; label: string; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = Math.PI * r; // semicircle
  const fill = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path
          d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
          fill="none" stroke="#2a2d3e" strokeWidth="6" strokeLinecap="round"
        />
        <path
          d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
        />
        <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function SwingSignalMeter({ priceScore, volumeScore, technicalScore, newsScore, overallScore }: SwingSignalMeterProps) {
  const overallColor = overallScore >= 70 ? '#22c55e' : overallScore >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Swing Score</p>
          <p className="text-3xl font-black tabular-nums" style={{ color: overallColor }}>{overallScore}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
        <div className="flex gap-4">
          <ScoreArc score={priceScore}     label="Price"     color="#3b82f6" size={72} />
          <ScoreArc score={volumeScore}    label="Volume"    color="#06b6d4" size={72} />
          <ScoreArc score={technicalScore} label="Technical" color="#a855f7" size={72} />
          <ScoreArc score={newsScore}      label="News"      color="#f59e0b" size={72} />
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallScore}%`, backgroundColor: overallColor }} />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>Weak</span><span>Moderate</span><span>Strong</span>
      </div>
    </div>
  );
}

// Individual signal list
const CATEGORY_ICON: Record<SwingSignal['category'], React.ReactNode> = {
  price:     <DollarSign size={11} className="text-blue-400" />,
  volume:    <BarChart2  size={11} className="text-cyan-400" />,
  technical: <Activity   size={11} className="text-purple-400" />,
  news:      <Newspaper  size={11} className="text-yellow-400" />,
};

const CATEGORY_LABEL: Record<SwingSignal['category'], string> = {
  price: 'Price Action', volume: 'Volume', technical: 'Technical', news: 'News & Sentiment'
};

export function SwingSignalList({ signals }: { signals: SwingSignal[] }) {
  const grouped: Record<SwingSignal['category'], SwingSignal[]> = { price: [], volume: [], technical: [], news: [] };
  signals.forEach(s => grouped[s.category].push(s));

  return (
    <div className="space-y-4">
      {(['price', 'volume', 'technical', 'news'] as SwingSignal['category'][]).map(cat => {
        const sigs = grouped[cat];
        if (!sigs.length) return null;
        return (
          <div key={cat} className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              {CATEGORY_ICON[cat]}
              <span className="text-xs font-semibold text-slate-300">{CATEGORY_LABEL[cat]}</span>
              <span className="ml-auto text-xs text-slate-600">{sigs.length} signals</span>
            </div>
            <div className="space-y-2">
              {sigs.map((sig, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">
                    {sig.impact === 'bullish'
                      ? <TrendingUp  size={11} className="text-green-400" />
                      : sig.impact === 'bearish'
                      ? <TrendingDown size={11} className="text-red-400" />
                      : <Minus size={11} className="text-slate-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-300">{sig.name}</span>
                      <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                        sig.impact === 'bullish' ? 'text-green-400' : sig.impact === 'bearish' ? 'text-red-400' : 'text-slate-500'
                      }`}>{sig.value}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{sig.description}</p>
                    {/* Strength bar */}
                    <div className="h-1 bg-[#2a2d3e] rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.round(sig.strength * 100)}%`,
                        backgroundColor: sig.impact === 'bullish' ? '#22c55e' : sig.impact === 'bearish' ? '#ef4444' : '#64748b'
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
