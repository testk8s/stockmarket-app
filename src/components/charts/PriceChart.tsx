import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { OHLCVData } from '@/types';
import { computeIndicatorSeries } from '@/services/technicalAnalysis';
import { format, parseISO } from 'date-fns';

interface PriceChartProps {
  data: OHLCVData[];
  symbol: string;
  currency?: string;
}

type Period = '1M' | '3M' | '6M' | '1Y';
type Overlay = 'sma20' | 'sma50' | 'sma200' | 'ema12' | 'bb';

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y'];
const PERIOD_DAYS: Record<Period, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const sym = currency === 'INR' ? '₹' : '$';
  return (
    <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex gap-4">
          <span className="text-slate-500">O</span><span className="text-slate-200">{sym}{d.open?.toFixed(2)}</span>
          <span className="text-slate-500">H</span><span className="text-green-400">{sym}{d.high?.toFixed(2)}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-500">L</span><span className="text-red-400">{sym}{d.low?.toFixed(2)}</span>
          <span className="text-slate-500">C</span><span className="text-slate-200">{sym}{d.close?.toFixed(2)}</span>
        </div>
        {d.volume && <div className="text-slate-500 pt-1 border-t border-[#2a2d3e]">Vol: {(d.volume / 1e6).toFixed(2)}M</div>}
      </div>
    </div>
  );
};

export function PriceChart({ data, symbol, currency = 'USD' }: PriceChartProps) {
  const [period, setPeriod] = useState<Period>('3M');
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(['sma20', 'sma50']));
  const [showVolume, setShowVolume] = useState(true);

  const indicators = useMemo(() => computeIndicatorSeries(data), [data]);

  const filtered = useMemo(() => {
    const days = PERIOD_DAYS[period];
    return data.slice(-days);
  }, [data, period]);

  const chartData = useMemo(() => {
    const startIdx = data.length - filtered.length;
    return filtered.map((d, i) => {
      const idx = startIdx + i;
      const row: Record<string, number | string | null> = {
        date: format(parseISO(d.date), 'MMM d'),
        open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
      };
      if (overlays.has('sma20')) row.sma20 = indicators.sma20[idx];
      if (overlays.has('sma50')) row.sma50 = indicators.sma50[idx];
      if (overlays.has('sma200')) row.sma200 = indicators.sma200[idx];
      if (overlays.has('ema12')) row.ema12 = indicators.ema12[idx];
      if (overlays.has('bb')) {
        row.bbUpper = indicators.bbUpper[idx];
        row.bbLower = indicators.bbLower[idx];
        row.bbMiddle = indicators.bbMiddle[idx];
      }
      return row;
    });
  }, [filtered, overlays, indicators, data.length]);

  const toggleOverlay = (o: Overlay) => {
    setOverlays(prev => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o); else next.add(o);
      return next;
    });
  };

  const sym = currency === 'INR' ? '₹' : '$';
  const lastClose = filtered[filtered.length - 1]?.close ?? 0;
  const firstClose = filtered[0]?.close ?? 0;
  const isUp = lastClose >= firstClose;

  const OVERLAY_COLORS: Record<Overlay, string> = {
    sma20: '#f59e0b', sma50: '#3b82f6', sma200: '#ef4444', ema12: '#a855f7', bb: '#06b6d4'
  };

  return (
    <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{symbol} Price Chart</h3>
          <p className="text-xs text-slate-500">OHLCV with technical overlays</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex bg-[#0f1117] rounded-lg border border-[#2a2d3e] overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Overlays */}
          <div className="flex gap-1 flex-wrap">
            {(['sma20', 'sma50', 'sma200', 'ema12', 'bb'] as Overlay[]).map(o => (
              <button
                key={o}
                onClick={() => toggleOverlay(o)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  overlays.has(o)
                    ? 'border-transparent text-black font-medium'
                    : 'border-[#2a2d3e] text-slate-500 hover:text-slate-300'
                }`}
                style={overlays.has(o) ? { backgroundColor: OVERLAY_COLORS[o] } : {}}
              >
                {o.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => setShowVolume(v => !v)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                showVolume ? 'bg-slate-600 border-transparent text-white' : 'border-[#2a2d3e] text-slate-500 hover:text-slate-300'
              }`}
            >
              VOL
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${sym}${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0)}`}
            domain={['auto', 'auto']}
          />
          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="left"
              tick={{ fontSize: 9, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
              width={40}
            />
          )}
          <Tooltip content={<CustomTooltip currency={currency} />} />

          {showVolume && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill={isUp ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}
              radius={[1, 1, 0, 0]}
            />
          )}

          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={isUp ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            fill={isUp ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)'}
            dot={false}
            activeDot={{ r: 3 }}
          />

          {overlays.has('bb') && <>
            <Line yAxisId="price" dataKey="bbUpper" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="4 2" />
            <Line yAxisId="price" dataKey="bbLower" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="4 2" />
            <Line yAxisId="price" dataKey="bbMiddle" stroke="#06b6d4" strokeWidth={0.8} dot={false} strokeOpacity={0.5} />
          </>}
          {overlays.has('sma20') && <Line yAxisId="price" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.2} dot={false} />}
          {overlays.has('sma50') && <Line yAxisId="price" dataKey="sma50" stroke="#3b82f6" strokeWidth={1.2} dot={false} />}
          {overlays.has('sma200') && <Line yAxisId="price" dataKey="sma200" stroke="#ef4444" strokeWidth={1.2} dot={false} />}
          {overlays.has('ema12') && <Line yAxisId="price" dataKey="ema12" stroke="#a855f7" strokeWidth={1.2} dot={false} />}

          <ReferenceLine yAxisId="price" y={firstClose} stroke="#2a2d3e" strokeDasharray="3 3" strokeOpacity={0.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
