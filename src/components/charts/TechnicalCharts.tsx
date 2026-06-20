import { useMemo } from 'react';
import {
  LineChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, ComposedChart
} from 'recharts';
import type { OHLCVData } from '@/types';
import { computeIndicatorSeries } from '@/services/technicalAnalysis';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';

const miniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-[#2a2d3e] rounded p-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : '—'}
        </p>
      ))}
    </div>
  );
};

export function RSIChart({ data }: { data: OHLCVData[] }) {
  const indicators = useMemo(() => computeIndicatorSeries(data), [data]);
  const period = Math.min(data.length, 90);

  const chartData = useMemo(() => {
    const slice = data.slice(-period);
    const startIdx = data.length - period;
    return slice.map((d, i) => ({
      date: format(parseISO(d.date), 'MMM d'),
      rsi: indicators.rsi[startIdx + i],
    })).filter(d => d.rsi !== null);
  }, [data, indicators, period]);

  const lastRsi = indicators.rsi[data.length - 1];

  return (
    <Card>
      <CardHeader
        title="RSI (14)"
        subtitle="Relative Strength Index"
        action={
          lastRsi !== null ? (
            <span className={`text-sm font-bold ${(lastRsi as number) > 70 ? 'text-red-400' : (lastRsi as number) < 30 ? 'text-green-400' : 'text-blue-400'}`}>
              {(lastRsi as number).toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {(lastRsi as number) > 70 ? 'Overbought' : (lastRsi as number) < 30 ? 'Oversold' : 'Neutral'}
              </span>
            </span>
          ) : null
        }
      />
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} ticks={[0, 30, 50, 70, 100]} />
          <Tooltip content={miniTooltip} />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.6} />
          <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 2" strokeOpacity={0.4} />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.6} />
          <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="RSI" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function MACDChart({ data }: { data: OHLCVData[] }) {
  const indicators = useMemo(() => computeIndicatorSeries(data), [data]);
  const period = Math.min(data.length, 90);

  const chartData = useMemo(() => {
    const slice = data.slice(-period);
    const startIdx = data.length - period;
    return slice.map((d, i) => {
      const macd = indicators.macdLine[startIdx + i];
      const signal = indicators.macdSignal[startIdx + i];
      return {
        date: format(parseISO(d.date), 'MMM d'),
        macd,
        signal,
        histogram: macd !== null && signal !== null ? macd - signal : null,
      };
    }).filter(d => d.macd !== null);
  }, [data, indicators, period]);

  return (
    <Card>
      <CardHeader title="MACD (12,26,9)" subtitle="Moving Average Convergence Divergence" />
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={miniTooltip} />
          <ReferenceLine y={0} stroke="#475569" />
          <Bar dataKey="histogram" name="Histogram" radius={[1, 1, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={(entry.histogram ?? 0) >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.2} dot={false} name="MACD" />
          <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.2} dot={false} strokeDasharray="3 2" name="Signal" />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function BollingerChart({ data }: { data: OHLCVData[] }) {
  const indicators = useMemo(() => computeIndicatorSeries(data), [data]);
  const period = Math.min(data.length, 90);

  const chartData = useMemo(() => {
    const slice = data.slice(-period);
    const startIdx = data.length - period;
    return slice.map((d, i) => ({
      date: format(parseISO(d.date), 'MMM d'),
      close: d.close,
      upper: indicators.bbUpper[startIdx + i],
      middle: indicators.bbMiddle[startIdx + i],
      lower: indicators.bbLower[startIdx + i],
    })).filter(d => d.upper !== null);
  }, [data, indicators, period]);

  return (
    <Card>
      <CardHeader title="Bollinger Bands (20,2)" subtitle="Price volatility envelope" />
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
          <Tooltip content={miniTooltip} />
          <Line type="monotone" dataKey="upper" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Upper Band" />
          <Line type="monotone" dataKey="middle" stroke="#64748b" strokeWidth={1} dot={false} name="Middle (SMA20)" />
          <Line type="monotone" dataKey="lower" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Lower Band" />
          <Line type="monotone" dataKey="close" stroke="#e2e8f0" strokeWidth={1.5} dot={false} name="Close" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function StochasticChart({ data }: { data: OHLCVData[] }) {
  const period = Math.min(data.length, 90);
  const kPeriod = 14;
  const dPeriod = 3;

  const chartData = useMemo(() => {
    const slice = data.slice(-period);
    const kVals: (number | null)[] = [];

    for (let i = 0; i < slice.length; i++) {
      if (i < kPeriod - 1) { kVals.push(null); continue; }
      const window = slice.slice(i - kPeriod + 1, i + 1);
      const low = Math.min(...window.map(d => d.low));
      const high = Math.max(...window.map(d => d.high));
      kVals.push(high === low ? 50 : (slice[i].close - low) / (high - low) * 100);
    }

    return slice.map((d, i) => {
      const validK = kVals.slice(Math.max(0, i - dPeriod + 1), i + 1).filter((v): v is number => v !== null);
      return {
        date: format(parseISO(d.date), 'MMM d'),
        k: kVals[i],
        d: validK.length === dPeriod ? validK.reduce((s, v) => s + v, 0) / dPeriod : null,
      };
    }).filter(d => d.k !== null);
  }, [data, period]);

  return (
    <Card>
      <CardHeader title="Stochastic (14,3)" subtitle="%K / %D lines" />
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={28} ticks={[0, 20, 50, 80, 100]} />
          <Tooltip content={miniTooltip} />
          <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.6} />
          <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.6} />
          <Line type="monotone" dataKey="k" stroke="#a855f7" strokeWidth={1.5} dot={false} name="%K" />
          <Line type="monotone" dataKey="d" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 2" name="%D" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
