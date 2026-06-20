import type { TechnicalIndicators } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatNumber } from '@/utils/format';

interface TechnicalPanelProps {
  technicals: TechnicalIndicators;
  price: number;
}

interface IndicatorRowProps {
  label: string;
  value: number | null;
  signal?: 'bullish' | 'bearish' | 'neutral';
  tooltip?: string;
  format?: (v: number) => string;
  suffix?: string;
}

function getSignalClass(signal?: 'bullish' | 'bearish' | 'neutral') {
  if (signal === 'bullish') return 'text-green-400';
  if (signal === 'bearish') return 'text-red-400';
  return 'text-slate-400';
}

function getSignalBadge(signal?: 'bullish' | 'bearish' | 'neutral') {
  if (signal === 'bullish') return <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/15 text-green-400">Bullish</span>;
  if (signal === 'bearish') return <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/15 text-red-400">Bearish</span>;
  return <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700/50 text-slate-400">Neutral</span>;
}

function IndicatorRow({ label, value, signal, tooltip, format: fmt, suffix = '' }: IndicatorRowProps) {
  const display = value === null ? '—' : fmt ? fmt(value) : `${formatNumber(value)}${suffix}`;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2d3e]/50">
      <div className="flex items-center gap-1">
        {tooltip ? (
          <Tooltip content={tooltip}>
            <span className="text-xs text-slate-400 cursor-help border-b border-dashed border-slate-600">{label}</span>
          </Tooltip>
        ) : (
          <span className="text-xs text-slate-400">{label}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium tabular-nums ${getSignalClass(signal)}`}>{display}</span>
        {signal && value !== null && getSignalBadge(signal)}
      </div>
    </div>
  );
}

function getSMASignal(price: number, sma: number | null): 'bullish' | 'bearish' | 'neutral' {
  if (sma === null) return 'neutral';
  return price > sma ? 'bullish' : price < sma ? 'bearish' : 'neutral';
}

function getRSISignal(rsi: number | null): 'bullish' | 'bearish' | 'neutral' {
  if (rsi === null) return 'neutral';
  if (rsi < 30) return 'bullish';
  if (rsi > 70) return 'bearish';
  return 'neutral';
}

function getMACDSignal(hist: number | null): 'bullish' | 'bearish' | 'neutral' {
  if (hist === null) return 'neutral';
  if (hist > 0) return 'bullish';
  if (hist < 0) return 'bearish';
  return 'neutral';
}

function getBollingerSignal(price: number, upper: number | null, lower: number | null): 'bullish' | 'bearish' | 'neutral' {
  if (upper === null || lower === null) return 'neutral';
  if (price <= lower) return 'bullish';
  if (price >= upper) return 'bearish';
  return 'neutral';
}

export function TechnicalPanel({ technicals, price }: TechnicalPanelProps) {
  const {
    sma20, sma50, sma200, ema12, ema26,
    rsi14, macd, macdSignal, macdHistogram,
    bbUpper, bbMiddle, bbLower, bbWidth,
    atr14, stochK, stochD, obv,
  } = technicals;

  const overallSignals = [
    getSMASignal(price, sma50),
    getSMASignal(price, sma200),
    getRSISignal(rsi14),
    getMACDSignal(macdHistogram),
    getBollingerSignal(price, bbUpper, bbLower),
  ];
  const bullCount = overallSignals.filter(s => s === 'bullish').length;
  const bearCount = overallSignals.filter(s => s === 'bearish').length;
  const overallSignal = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';
  const overallLabel = overallSignal === 'bullish' ? 'BULLISH' : overallSignal === 'bearish' ? 'BEARISH' : 'NEUTRAL';

  return (
    <div className="space-y-3">
      {/* Overall signal summary */}
      <div className={`bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4 border-l-4`}
        style={{ borderLeftColor: overallSignal === 'bullish' ? '#22c55e' : overallSignal === 'bearish' ? '#ef4444' : '#64748b' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Technical Signal</p>
            <p className={`text-xl font-bold ${overallSignal === 'bullish' ? 'text-green-400' : overallSignal === 'bearish' ? 'text-red-400' : 'text-slate-400'}`}>
              {overallLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-400">Bullish: {bullCount}</p>
            <p className="text-xs text-red-400">Bearish: {bearCount}</p>
            <p className="text-xs text-slate-500">Neutral: {overallSignals.length - bullCount - bearCount}</p>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <Card>
        <CardHeader title="Moving Averages" />
        <IndicatorRow label="SMA 20" value={sma20} signal={getSMASignal(price, sma20)} tooltip="Simple Moving Average (20 periods)" />
        <IndicatorRow label="SMA 50" value={sma50} signal={getSMASignal(price, sma50)} tooltip="Simple Moving Average (50 periods)" />
        <IndicatorRow label="SMA 200" value={sma200} signal={getSMASignal(price, sma200)} tooltip="Simple Moving Average (200 periods)" />
        <IndicatorRow label="EMA 12" value={ema12} signal={getSMASignal(price, ema12)} tooltip="Exponential Moving Average (12 periods)" />
        <IndicatorRow label="EMA 26" value={ema26} signal={getSMASignal(price, ema26)} tooltip="Exponential Moving Average (26 periods)" />
      </Card>

      {/* Oscillators */}
      <Card>
        <CardHeader title="Oscillators" />
        <IndicatorRow
          label="RSI (14)"
          value={rsi14}
          signal={getRSISignal(rsi14)}
          tooltip="Relative Strength Index — oversold < 30, overbought > 70"
        />
        <IndicatorRow
          label="MACD"
          value={macd}
          tooltip="MACD Line (12,26)"
        />
        <IndicatorRow
          label="MACD Signal"
          value={macdSignal}
          tooltip="Signal line (9-period EMA of MACD)"
        />
        <IndicatorRow
          label="MACD Histogram"
          value={macdHistogram}
          signal={getMACDSignal(macdHistogram)}
          tooltip="Difference between MACD and Signal line"
        />
        <IndicatorRow
          label="Stoch %K"
          value={stochK}
          signal={stochK !== null ? (stochK < 20 ? 'bullish' : stochK > 80 ? 'bearish' : 'neutral') : 'neutral'}
          tooltip="Stochastic %K — oversold < 20, overbought > 80"
        />
        <IndicatorRow label="Stoch %D" value={stochD} tooltip="Stochastic %D (3-period SMA of %K)" />
      </Card>

      {/* Bollinger Bands */}
      <Card>
        <CardHeader title="Bollinger Bands (20,2)" />
        <IndicatorRow label="Upper Band" value={bbUpper} signal={price >= (bbUpper ?? Infinity) ? 'bearish' : 'neutral'} />
        <IndicatorRow label="Middle (SMA20)" value={bbMiddle} />
        <IndicatorRow label="Lower Band" value={bbLower} signal={price <= (bbLower ?? -Infinity) ? 'bullish' : 'neutral'} />
        <IndicatorRow
          label="Band Width %"
          value={bbWidth}
          tooltip="(Upper - Lower) / Middle × 100 — higher = more volatility"
          suffix="%"
        />
        <IndicatorRow
          label="Price Position"
          value={bbUpper !== null && bbLower !== null ? ((price - bbLower) / (bbUpper - bbLower)) * 100 : null}
          tooltip="Where price sits within the bands (0% = lower, 100% = upper)"
          suffix="%"
          signal={getBollingerSignal(price, bbUpper, bbLower)}
        />
      </Card>

      {/* Volatility */}
      <Card>
        <CardHeader title="Volatility & Volume" />
        <IndicatorRow
          label="ATR (14)"
          value={atr14}
          tooltip="Average True Range — measure of daily price volatility"
        />
        <IndicatorRow
          label="ATR %"
          value={atr14 !== null && price > 0 ? (atr14 / price) * 100 : null}
          tooltip="ATR as percentage of current price"
          suffix="%"
        />
        <IndicatorRow
          label="OBV"
          value={obv}
          tooltip="On-Balance Volume — running volume accumulation/distribution"
          format={v => v > 1e9 ? `${(v / 1e9).toFixed(2)}B` : v > 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toFixed(0)}
        />
      </Card>
    </div>
  );
}
