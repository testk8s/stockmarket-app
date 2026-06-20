import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import type { PredictionResult, OHLCVData } from '@/types';
import { format, addDays, parseISO } from 'date-fns';

interface PredictionChartProps {
  prediction: PredictionResult;
  historical: OHLCVData[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const sym = currency === 'INR' ? '₹' : currency === 'JPY' ? '¥' : currency === 'EUR' ? '€' : '$';
  return (
    <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => p.value !== null && p.value !== undefined && (
        <p key={i} className="mb-0.5" style={{ color: p.color }}>
          {p.name}: {sym}{Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

export function PredictionChart({ prediction, historical, currency = 'USD' }: PredictionChartProps) {
  const sym = currency === 'INR' ? '₹' : currency === 'JPY' ? '¥' : currency === 'EUR' ? '€' : '$';

  // Build chart data: last 30 historical bars + 14 predicted days
  const chartData = useMemo(() => {
    const recentHistory = historical.slice(-30);
    const lastBar = recentHistory[recentHistory.length - 1];
    const lastDate = lastBar ? parseISO(lastBar.date) : new Date();
    const lastClose = lastBar?.close ?? prediction.currentPrice;

    // Historical portion
    const histPoints = recentHistory.map(d => ({
      date: format(parseISO(d.date), 'MMM d'),
      actual: d.close,
      predicted: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
      isPrediction: false,
    }));

    // Generate 14-day prediction path with daily steps
    const totalGrowth = prediction.estimatedGrowthPercent / 100;
    const dailyReturn = totalGrowth / 14;

    // Volatility band (based on confidence: lower confidence = wider band)
    const confidenceFactor = prediction.confidenceScore / 100;
    const bandWidth = (1 - confidenceFactor) * 0.03; // max 3% daily band at 0% confidence

    const predPoints = Array.from({ length: 15 }, (_, i) => {
      if (i === 0) {
        // Overlap point: connect history to prediction
        return {
          date: format(lastDate, 'MMM d'),
          actual: lastClose,
          predicted: lastClose,
          upper: lastClose,
          lower: lastClose,
          isPrediction: true,
        };
      }
      const projectedPrice = lastClose * Math.pow(1 + dailyReturn, i);
      const band = projectedPrice * bandWidth * Math.sqrt(i);
      return {
        date: format(addDays(lastDate, i), 'MMM d'),
        actual: null,
        predicted: parseFloat(projectedPrice.toFixed(2)),
        upper: parseFloat((projectedPrice + band).toFixed(2)),
        lower: parseFloat((projectedPrice - band).toFixed(2)),
        isPrediction: true,
      };
    });

    return [...histPoints, ...predPoints.slice(1)];
  }, [historical, prediction]);

  const isUp = prediction.direction === 'bullish';
  const predColor = isUp ? '#22c55e' : prediction.direction === 'bearish' ? '#ef4444' : '#94a3b8';

  // Find where prediction starts in the dataset
  const splitIdx = chartData.findIndex(d => d.isPrediction);
  const splitDate = splitIdx >= 0 ? chartData[splitIdx].date : null;

  return (
    <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">14-Day Price Prediction</h3>
          <p className="text-xs text-slate-500">Historical close + projected path with confidence band</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 inline-block" />
            <span className="text-slate-500">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: predColor }} />
            <span className="text-slate-500">Predicted</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block opacity-40" style={{ backgroundColor: predColor }} />
            <span className="text-slate-500">Confidence Band</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${sym}${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Number(v).toFixed(0)}`}
            domain={['auto', 'auto']}
            width={56}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />

          {/* Shade prediction zone */}
          {splitDate && (
            <ReferenceArea
              x1={splitDate}
              fill="#1a1d26"
              fillOpacity={0.6}
            />
          )}

          {/* Confidence band area (upper - lower) */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill={predColor}
            fillOpacity={0.12}
            dot={false}
            legendType="none"
            name="Upper Band"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#0f1117"
            fillOpacity={1}
            dot={false}
            legendType="none"
            name="Lower Band"
          />

          {/* Historical price */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#94a3b8"
            strokeWidth={1.5}
            dot={false}
            name="Actual Price"
            connectNulls={false}
          />

          {/* Predicted path */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={predColor}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Predicted Price"
            connectNulls={false}
          />

          {/* Upper band line */}
          <Line
            type="monotone"
            dataKey="upper"
            stroke={predColor}
            strokeWidth={0.8}
            strokeOpacity={0.4}
            dot={false}
            legendType="none"
            name="Upper Band"
            connectNulls={false}
          />

          {/* Lower band line */}
          <Line
            type="monotone"
            dataKey="lower"
            stroke={predColor}
            strokeWidth={0.8}
            strokeOpacity={0.4}
            dot={false}
            legendType="none"
            name="Lower Band"
            connectNulls={false}
          />

          {/* Current price reference */}
          <ReferenceLine
            y={prediction.currentPrice}
            stroke="#475569"
            strokeDasharray="4 2"
            strokeOpacity={0.6}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#2a2d3e]">
        {[
          { label: 'Current', value: `${sym}${prediction.currentPrice.toFixed(2)}`, color: 'text-slate-300' },
          { label: 'Target (14d)', value: `${sym}${prediction.predictedPrice.toFixed(2)}`, color: predColor },
          { label: 'Est. Return', value: `${prediction.estimatedGrowthPercent > 0 ? '+' : ''}${prediction.estimatedGrowthPercent.toFixed(2)}%`, color: predColor },
          { label: 'Confidence', value: `${prediction.confidenceScore.toFixed(1)}%`, color: prediction.confidenceScore >= 70 ? '#22c55e' : prediction.confidenceScore >= 50 ? '#f59e0b' : '#ef4444' },
        ].map(item => (
          <div key={item.label} className="bg-[#0f1117]/60 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
            <p className="text-xs font-bold tabular-nums" style={{ color: typeof item.color === 'string' && item.color.startsWith('text-') ? undefined : item.color }}
               {...(typeof item.color === 'string' && item.color.startsWith('text-') ? { className: `text-xs font-bold tabular-nums ${item.color}` } : {})}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
