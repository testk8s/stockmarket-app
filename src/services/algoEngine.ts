/**
 * Algo Trading Engine
 * - Strategy definitions with configurable parameters
 * - Signal generator (runs each strategy against live quotes)
 * - Backtester (replay historical OHLCV data through strategy logic)
 */
import type {
  AlgoStrategy, AlgoStrategyType, AlgoStrategyParam, AlgoSignal,
  AlgoOrder, AlgoPosition, BacktestResult, BacktestTrade, OHLCVData
} from '@/types';
import { computeIndicatorSeries } from './technicalAnalysis';

// ─────────────────────────────────────────────────────────────
// Strategy Templates
// ─────────────────────────────────────────────────────────────

export const STRATEGY_TEMPLATES: Record<AlgoStrategyType, Omit<AlgoStrategy, 'id' | 'symbols' | 'createdAt' | 'updatedAt' | 'status'>> = {
  sma_crossover: {
    name: 'SMA Crossover',
    description: 'Buy when fast SMA crosses above slow SMA; sell on cross below.',
    type: 'sma_crossover',
    params: [
      { key: 'fastPeriod', label: 'Fast SMA Period', type: 'number', value: 10, min: 3, max: 50, step: 1, description: 'Short-period simple moving average' },
      { key: 'slowPeriod', label: 'Slow SMA Period', type: 'number', value: 30, min: 10, max: 200, step: 1, description: 'Long-period simple moving average' },
    ],
    market: 'all', positionSize: 10, maxPositions: 5, stopLossPercent: 3, takeProfitPercent: 8,
  },
  ema_crossover: {
    name: 'EMA Crossover',
    description: 'Buy when fast EMA crosses above slow EMA; sell on cross below. Faster signals than SMA.',
    type: 'ema_crossover',
    params: [
      { key: 'fastPeriod', label: 'Fast EMA Period', type: 'number', value: 9,  min: 3, max: 50, step: 1, description: 'Fast exponential moving average' },
      { key: 'slowPeriod', label: 'Slow EMA Period', type: 'number', value: 21, min: 10, max: 200, step: 1, description: 'Slow exponential moving average' },
    ],
    market: 'all', positionSize: 10, maxPositions: 5, stopLossPercent: 2.5, takeProfitPercent: 7,
  },
  rsi_mean_reversion: {
    name: 'RSI Mean Reversion',
    description: 'Buy when RSI drops below oversold; sell when RSI rises above overbought.',
    type: 'rsi_mean_reversion',
    params: [
      { key: 'period',      label: 'RSI Period',           type: 'number', value: 14, min: 5, max: 30, step: 1,   description: 'RSI lookback period' },
      { key: 'oversold',   label: 'Oversold Level',        type: 'number', value: 30, min: 10, max: 45, step: 1,  description: 'Buy trigger when RSI falls below this' },
      { key: 'overbought', label: 'Overbought Level',      type: 'number', value: 70, min: 55, max: 90, step: 1,  description: 'Sell trigger when RSI rises above this' },
    ],
    market: 'all', positionSize: 8, maxPositions: 6, stopLossPercent: 4, takeProfitPercent: 10,
  },
  macd_signal: {
    name: 'MACD Signal Cross',
    description: 'Buy on MACD bullish crossover; sell on bearish crossover.',
    type: 'macd_signal',
    params: [
      { key: 'fastPeriod',   label: 'Fast Period',   type: 'number', value: 12, min: 5, max: 30, step: 1, description: 'MACD fast EMA' },
      { key: 'slowPeriod',   label: 'Slow Period',   type: 'number', value: 26, min: 15, max: 60, step: 1, description: 'MACD slow EMA' },
      { key: 'signalPeriod', label: 'Signal Period', type: 'number', value: 9,  min: 3, max: 20, step: 1, description: 'Signal line EMA period' },
      { key: 'minHistogram', label: 'Min Histogram', type: 'number', value: 0.05, min: 0, max: 2, step: 0.01, description: 'Minimum histogram magnitude to trigger' },
    ],
    market: 'all', positionSize: 10, maxPositions: 5, stopLossPercent: 3, takeProfitPercent: 8,
  },
  bollinger_breakout: {
    name: 'Bollinger Band Breakout',
    description: 'Buy on close above upper band (breakout); sell on close below lower band.',
    type: 'bollinger_breakout',
    params: [
      { key: 'period',  label: 'BB Period',    type: 'number', value: 20, min: 10, max: 50, step: 1, description: 'Moving average period for BB' },
      { key: 'stdDev',  label: 'Std Dev Mult', type: 'number', value: 2,  min: 1, max: 3, step: 0.1, description: 'Standard deviation multiplier' },
      { key: 'squeeze', label: 'BB Squeeze Filter', type: 'boolean', value: true, description: 'Only trade after BB squeeze (low band width)' },
    ],
    market: 'all', positionSize: 10, maxPositions: 4, stopLossPercent: 3.5, takeProfitPercent: 9,
  },
  momentum: {
    name: 'Price Momentum',
    description: 'Buy stocks with strongest N-day momentum; sell on momentum reversal.',
    type: 'momentum',
    params: [
      { key: 'lookback',    label: 'Momentum Lookback (days)', type: 'number', value: 20, min: 5, max: 60, step: 1, description: 'Lookback for momentum calculation' },
      { key: 'threshold',   label: 'Min Momentum %',          type: 'number', value: 5,  min: 1, max: 30, step: 0.5, description: 'Minimum % gain to qualify signal' },
      { key: 'exitLookback',label: 'Exit Lookback (days)',     type: 'number', value: 5,  min: 1, max: 20, step: 1, description: 'Short lookback for reversal detection' },
    ],
    market: 'all', positionSize: 12, maxPositions: 4, stopLossPercent: 5, takeProfitPercent: 15,
  },
  dual_momentum: {
    name: 'Dual Momentum (Antonacci)',
    description: 'Absolute + relative momentum: long if both price > 12m ago and outperforms benchmark.',
    type: 'dual_momentum',
    params: [
      { key: 'lookback',   label: 'Lookback Period (days)', type: 'number', value: 60, min: 20, max: 252, step: 5, description: 'Days for absolute momentum check' },
      { key: 'topN',      label: 'Top N Winners',          type: 'number', value: 3,  min: 1, max: 10, step: 1,   description: 'Hold top N momentum stocks' },
    ],
    market: 'all', positionSize: 20, maxPositions: 3, stopLossPercent: 8, takeProfitPercent: 25,
  },
  vwap_reversion: {
    name: 'VWAP Mean Reversion',
    description: 'Buy when price drops >N% below VWAP; sell when it returns to VWAP.',
    type: 'vwap_reversion',
    params: [
      { key: 'deviationPct', label: 'VWAP Deviation %', type: 'number', value: 1.5, min: 0.5, max: 5, step: 0.1, description: 'Min % below VWAP to trigger buy' },
      { key: 'lookback',     label: 'VWAP Lookback',    type: 'number', value: 5,   min: 1, max: 20, step: 1,    description: 'Bars for VWAP calculation' },
    ],
    market: 'all', positionSize: 8, maxPositions: 6, stopLossPercent: 2, takeProfitPercent: 3,
  },
  custom: {
    name: 'Custom Strategy',
    description: 'Combine multiple indicators with custom logic.',
    type: 'custom',
    params: [
      { key: 'rsiOversold',   label: 'RSI Oversold',    type: 'number', value: 35,  min: 10, max: 50,   step: 1,   description: 'RSI oversold level' },
      { key: 'macdConfirm',   label: 'MACD Confirm',    type: 'boolean', value: true,                              description: 'Require MACD bullish alignment' },
      { key: 'volumeFilter',  label: 'Volume Filter',   type: 'number', value: 1.2, min: 1, max: 5,    step: 0.1,  description: 'Min volume ratio vs avg' },
      { key: 'trendFilter',   label: 'Trend Filter',    type: 'select', value: 'above_sma50', options: [
          { value: 'above_sma50', label: 'Price > SMA 50' },
          { value: 'above_sma200', label: 'Price > SMA 200' },
          { value: 'any', label: 'Any Trend' },
        ], description: 'Trend alignment filter' },
    ],
    market: 'all', positionSize: 10, maxPositions: 5, stopLossPercent: 3, takeProfitPercent: 8,
  },
};

// ─────────────────────────────────────────────────────────────
// Signal Generation — runs strategy logic on current bar
// ─────────────────────────────────────────────────────────────

function getParam(params: AlgoStrategyParam[], key: string): number | string | boolean {
  return params.find(p => p.key === key)?.value ?? 0;
}

function smaArray(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period;
  });
}

function emaArray(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(data.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (prev === null) { prev = data.slice(0, period).reduce((s, v) => s + v, 0) / period; result[i] = prev; }
    else { prev = data[i] * k + prev * (1 - k); result[i] = prev; }
  }
  return result;
}

function rsiArray(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1];
    if (d > 0) ag += d; else al += Math.abs(d);
  }
  ag /= period; al /= period;
  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const d = closes[i] - closes[i-1];
      ag = (ag * (period-1) + Math.max(0, d)) / period;
      al = (al * (period-1) + Math.max(0, -d)) / period;
    }
    result[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return result;
}

function macdArrays(closes: number[], fast: number, slow: number, signal: number) {
  const e1 = emaArray(closes, fast);
  const e2 = emaArray(closes, slow);
  const line = closes.map((_, i) => (e1[i] !== null && e2[i] !== null) ? (e1[i] as number) - (e2[i] as number) : null);
  const vals = line.filter((v): v is number => v !== null);
  const sigRaw = emaArray(vals, signal);
  const sig: (number | null)[] = new Array(closes.length).fill(null);
  let idx = 0;
  for (let i = 0; i < line.length; i++) { if (line[i] !== null) { sig[i] = sigRaw[idx] ?? null; idx++; } }
  const hist = closes.map((_, i) => (line[i] !== null && sig[i] !== null) ? (line[i] as number) - (sig[i] as number) : null);
  return { line, sig, hist };
}

function vwapProxy(data: OHLCVData[], lookback: number): number {
  const slice = data.slice(-lookback);
  const totalVol = slice.reduce((s, d) => s + d.volume, 0);
  if (totalVol === 0) return data[data.length - 1].close;
  return slice.reduce((s, d) => s + d.close * d.volume, 0) / totalVol;
}

export type StrategySignalResult = { side: 'buy' | 'sell' | null; reason: string; indicators: Record<string, number | string> };

export function runStrategyOnBar(strategy: AlgoStrategy, data: OHLCVData[], barIndex: number): StrategySignalResult {
  const closes = data.slice(0, barIndex + 1).map(d => d.close);
  const params = strategy.params;
  const n = closes.length;

  switch (strategy.type) {
    case 'sma_crossover': {
      const fast = Number(getParam(params, 'fastPeriod'));
      const slow = Number(getParam(params, 'slowPeriod'));
      const fa = smaArray(closes, fast);
      const sl = smaArray(closes, slow);
      if (n < slow + 1) return { side: null, reason: 'Insufficient data', indicators: {} };
      const cross = fa[n-1] !== null && sl[n-1] !== null && fa[n-2] !== null && sl[n-2] !== null;
      if (!cross) return { side: null, reason: 'No cross', indicators: { fast_sma: fa[n-1] ?? 0, slow_sma: sl[n-1] ?? 0 } };
      const bullish = (fa[n-2] as number) < (sl[n-2] as number) && (fa[n-1] as number) > (sl[n-1] as number);
      const bearish = (fa[n-2] as number) > (sl[n-2] as number) && (fa[n-1] as number) < (sl[n-1] as number);
      return {
        side: bullish ? 'buy' : bearish ? 'sell' : null,
        reason: bullish ? `SMA${fast} crossed above SMA${slow}` : bearish ? `SMA${fast} crossed below SMA${slow}` : 'No signal',
        indicators: { [`sma${fast}`]: parseFloat((fa[n-1] ?? 0).toFixed(2)), [`sma${slow}`]: parseFloat((sl[n-1] ?? 0).toFixed(2)) },
      };
    }

    case 'ema_crossover': {
      const fast = Number(getParam(params, 'fastPeriod'));
      const slow = Number(getParam(params, 'slowPeriod'));
      const fa = emaArray(closes, fast);
      const sl = emaArray(closes, slow);
      if (n < slow + 1) return { side: null, reason: 'Insufficient data', indicators: {} };
      const bullish = fa[n-2] !== null && sl[n-2] !== null && (fa[n-2] as number) < (sl[n-2] as number) && (fa[n-1] as number)! > (sl[n-1] as number)!;
      const bearish = fa[n-2] !== null && sl[n-2] !== null && (fa[n-2] as number) > (sl[n-2] as number) && (fa[n-1] as number)! < (sl[n-1] as number)!;
      return {
        side: bullish ? 'buy' : bearish ? 'sell' : null,
        reason: bullish ? `EMA${fast} crossed above EMA${slow}` : bearish ? `EMA${fast} crossed below EMA${slow}` : 'No signal',
        indicators: { [`ema${fast}`]: parseFloat((fa[n-1] ?? 0).toFixed(2)), [`ema${slow}`]: parseFloat((sl[n-1] ?? 0).toFixed(2)) },
      };
    }

    case 'rsi_mean_reversion': {
      const period   = Number(getParam(params, 'period'));
      const oversold  = Number(getParam(params, 'oversold'));
      const overbought = Number(getParam(params, 'overbought'));
      const rsi = rsiArray(closes, period);
      const cur = rsi[n-1]; const prev = rsi[n-2];
      if (cur === null || prev === null) return { side: null, reason: 'Insufficient RSI data', indicators: {} };
      const buy  = (prev as number) < oversold && (cur as number) > oversold;
      const sell = (prev as number) > overbought && (cur as number) < overbought;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `RSI crossed above ${oversold} from oversold` : sell ? `RSI crossed below ${overbought} from overbought` : 'RSI neutral',
        indicators: { rsi: parseFloat((cur as number).toFixed(1)), oversold, overbought },
      };
    }

    case 'macd_signal': {
      const fast   = Number(getParam(params, 'fastPeriod'));
      const slow   = Number(getParam(params, 'slowPeriod'));
      const signal = Number(getParam(params, 'signalPeriod'));
      const minH   = Number(getParam(params, 'minHistogram'));
      const { line, sig, hist } = macdArrays(closes, fast, slow, signal);
      const h1 = hist[n-1]; const h2 = hist[n-2];
      const l1 = line[n-1]; const s1 = sig[n-1];
      if (h1 === null || h2 === null) return { side: null, reason: 'Insufficient MACD data', indicators: {} };
      const buy  = (h2 as number) < 0 && (h1 as number) > 0 && Math.abs(h1 as number) >= minH;
      const sell = (h2 as number) > 0 && (h1 as number) < 0 && Math.abs(h1 as number) >= minH;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? 'MACD histogram crossed positive' : sell ? 'MACD histogram crossed negative' : 'MACD neutral',
        indicators: { macd: parseFloat((l1 ?? 0).toFixed(3)), signal: parseFloat((s1 ?? 0).toFixed(3)), histogram: parseFloat((h1 as number).toFixed(3)) },
      };
    }

    case 'bollinger_breakout': {
      const period = Number(getParam(params, 'period'));
      const stdDev = Number(getParam(params, 'stdDev'));
      if (n < period) return { side: null, reason: 'Insufficient data', indicators: {} };
      const slice = closes.slice(-period);
      const mean = slice.reduce((s, v) => s + v, 0) / period;
      const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      const upper = mean + stdDev * std;
      const lower = mean - stdDev * std;
      const cur = closes[n-1];
      const prev = closes[n-2];
      const buy  = prev <= upper && cur > upper;
      const sell = prev >= lower && cur < lower;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `Price broke above upper BB (${upper.toFixed(2)})` : sell ? `Price broke below lower BB (${lower.toFixed(2)})` : 'BB neutral',
        indicators: { upper: parseFloat(upper.toFixed(2)), middle: parseFloat(mean.toFixed(2)), lower: parseFloat(lower.toFixed(2)), price: cur },
      };
    }

    case 'momentum': {
      const lookback  = Number(getParam(params, 'lookback'));
      const threshold = Number(getParam(params, 'threshold'));
      const exitLB    = Number(getParam(params, 'exitLookback'));
      if (n < lookback + 1) return { side: null, reason: 'Insufficient data', indicators: {} };
      const momentum = (closes[n-1] - closes[n-1-lookback]) / closes[n-1-lookback] * 100;
      const shortMom = (closes[n-1] - closes[n-1-exitLB]) / closes[n-1-exitLB] * 100;
      const buy  = momentum >= threshold;
      const sell = shortMom < 0 && momentum > 0;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `${lookback}d momentum ${momentum.toFixed(1)}% ≥ threshold` : sell ? 'Short-term momentum reversal' : 'Momentum below threshold',
        indicators: { [`momentum_${lookback}d`]: parseFloat(momentum.toFixed(2)), [`momentum_${exitLB}d`]: parseFloat(shortMom.toFixed(2)), threshold },
      };
    }

    case 'dual_momentum': {
      const lookback = Number(getParam(params, 'lookback'));
      if (n < lookback + 1) return { side: null, reason: 'Insufficient data', indicators: {} };
      const absMom = (closes[n-1] - closes[n-1-lookback]) / closes[n-1-lookback] * 100;
      const buy  = absMom > 0;
      const sell = absMom < -2;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `Absolute ${lookback}d momentum: +${absMom.toFixed(1)}%` : sell ? `Negative momentum: ${absMom.toFixed(1)}%` : 'No signal',
        indicators: { absolute_momentum: parseFloat(absMom.toFixed(2)), lookback },
      };
    }

    case 'vwap_reversion': {
      const deviationPct = Number(getParam(params, 'deviationPct'));
      const lookback     = Number(getParam(params, 'lookback'));
      const vwap = vwapProxy(data.slice(0, barIndex + 1), lookback);
      const cur = closes[n-1];
      const devPct = (vwap - cur) / vwap * 100;
      const buy  = devPct >= deviationPct;
      const sell = devPct <= -deviationPct * 0.5;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `Price ${devPct.toFixed(1)}% below VWAP — buy reversion` : sell ? 'Price above VWAP — take profit' : 'Near VWAP',
        indicators: { vwap: parseFloat(vwap.toFixed(2)), price: cur, deviation_pct: parseFloat(devPct.toFixed(2)) },
      };
    }

    case 'custom': {
      const rsiOS = Number(getParam(params, 'rsiOversold'));
      const volMin = Number(getParam(params, 'volumeFilter'));
      const macdConf = getParam(params, 'macdConfirm') as boolean;
      const rsi = rsiArray(closes, 14);
      const { hist } = macdArrays(closes, 12, 26, 9);
      const vol5  = data.slice(Math.max(0, barIndex-4), barIndex+1).reduce((s, d) => s + d.volume, 0) / 5;
      const vol20 = data.slice(Math.max(0, barIndex-19), barIndex+1).reduce((s, d) => s + d.volume, 0) / 20;
      const volRatio = vol20 > 0 ? vol5 / vol20 : 1;
      const rsiOk  = rsi[n-1] !== null && (rsi[n-1] as number) < rsiOS;
      const volOk  = volRatio >= volMin;
      const macdOk = !macdConf || (hist[n-1] !== null && (hist[n-1] as number) > 0);
      const buy = rsiOk && volOk && macdOk;
      const sell = rsi[n-1] !== null && (rsi[n-1] as number) > 70;
      return {
        side: buy ? 'buy' : sell ? 'sell' : null,
        reason: buy ? `Custom: RSI oversold + volume surge + MACD confirm` : sell ? 'Custom: RSI overbought exit' : 'No signal',
        indicators: { rsi: parseFloat((rsi[n-1] ?? 0).toFixed(1)), vol_ratio: parseFloat(volRatio.toFixed(2)), macd_hist: parseFloat((hist[n-1] ?? 0).toFixed(3)) },
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Backtester
// ─────────────────────────────────────────────────────────────

export function runBacktest(
  strategy: AlgoStrategy,
  symbol: string,
  data: OHLCVData[],
  initialCapital = 100000
): BacktestResult {
  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  let entryDate = '';
  const trades: BacktestTrade[] = [];
  const equity: { date: string; equity: number; drawdown: number }[] = [];
  let peakEquity = initialCapital;

  const COMMISSION = 0.001; // 0.1% per trade

  for (let i = 30; i < data.length; i++) {
    const bar = data[i];
    const result = runStrategyOnBar(strategy, data, i);
    const positionValue = position > 0 ? position * bar.close : 0;
    const totalEquity = capital + positionValue;
    peakEquity = Math.max(peakEquity, totalEquity);
    const drawdown = peakEquity > 0 ? ((peakEquity - totalEquity) / peakEquity) * 100 : 0;
    equity.push({ date: bar.date, equity: parseFloat(totalEquity.toFixed(2)), drawdown: parseFloat(drawdown.toFixed(2)) });

    // Check stop-loss / take-profit
    if (position > 0) {
      const pnlPct = (bar.close - entryPrice) / entryPrice * 100;
      const hitStop    = pnlPct <= -strategy.stopLossPercent;
      const hitTarget  = pnlPct >= strategy.takeProfitPercent;
      if (hitStop || hitTarget) {
        const proceeds = position * bar.close * (1 - COMMISSION);
        const cost     = position * entryPrice * (1 + COMMISSION);
        const pnl      = proceeds - cost;
        capital += proceeds;
        trades.push({
          date: bar.date, symbol, side: 'sell', price: bar.close, quantity: position,
          pnl: parseFloat(pnl.toFixed(2)), pnlPercent: parseFloat(pnlPct.toFixed(2)),
          holdingDays: Math.round((new Date(bar.date).getTime() - new Date(entryDate).getTime()) / 86400000),
          reason: hitStop ? `Stop loss hit (${pnlPct.toFixed(1)}%)` : `Take profit hit (+${pnlPct.toFixed(1)}%)`,
        });
        position = 0; entryPrice = 0; entryDate = '';
        continue;
      }
    }

    // Strategy signal
    if (result.side === 'buy' && position === 0 && capital > 100) {
      const invest = capital * (strategy.positionSize / 100);
      const qty = Math.floor(invest / bar.close);
      if (qty > 0) {
        const cost = qty * bar.close * (1 + COMMISSION);
        if (cost <= capital) {
          capital -= cost;
          position = qty; entryPrice = bar.close; entryDate = bar.date;
          trades.push({
            date: bar.date, symbol, side: 'buy', price: bar.close, quantity: qty,
            pnl: 0, pnlPercent: 0, holdingDays: 0, reason: result.reason,
          });
        }
      }
    } else if (result.side === 'sell' && position > 0) {
      const proceeds = position * bar.close * (1 - COMMISSION);
      const cost     = position * entryPrice * (1 + COMMISSION);
      const pnl      = proceeds - cost;
      const pnlPct   = (bar.close - entryPrice) / entryPrice * 100;
      capital += proceeds;
      trades.push({
        date: bar.date, symbol, side: 'sell', price: bar.close, quantity: position,
        pnl: parseFloat(pnl.toFixed(2)), pnlPercent: parseFloat(pnlPct.toFixed(2)),
        holdingDays: Math.round((new Date(bar.date).getTime() - new Date(entryDate).getTime()) / 86400000),
        reason: result.reason,
      });
      position = 0; entryPrice = 0; entryDate = '';
    }
  }

  // Close open position at end
  if (position > 0 && data.length > 0) {
    const last = data[data.length - 1];
    const proceeds = position * last.close * (1 - COMMISSION);
    const cost     = position * entryPrice * (1 + COMMISSION);
    const pnl      = proceeds - cost;
    const pnlPct   = (last.close - entryPrice) / entryPrice * 100;
    capital += proceeds;
    trades.push({
      date: last.date, symbol, side: 'sell', price: last.close, quantity: position,
      pnl: parseFloat(pnl.toFixed(2)), pnlPercent: parseFloat(pnlPct.toFixed(2)),
      holdingDays: Math.round((new Date(last.date).getTime() - new Date(entryDate).getTime()) / 86400000),
      reason: 'End of backtest — position closed',
    });
  }

  const finalCapital   = capital;
  const totalReturn    = finalCapital - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  const sellTrades     = trades.filter(t => t.side === 'sell');
  const wins           = sellTrades.filter(t => t.pnl > 0);
  const losses         = sellTrades.filter(t => t.pnl <= 0);
  const winRate        = sellTrades.length > 0 ? (wins.length / sellTrades.length) * 100 : 0;
  const avgWin         = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0;
  const avgLoss        = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length) : 0;
  const profitFactor   = losses.reduce((s, t) => s + Math.abs(t.pnl), 0) > 0
    ? wins.reduce((s, t) => s + t.pnl, 0) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    : wins.length > 0 ? Infinity : 0;

  const maxDrawdown = equity.reduce((m, e) => Math.max(m, e.drawdown), 0);

  // Annualised return (approximate)
  const dayCount = data.length;
  const annualized = dayCount > 0 ? (Math.pow(1 + totalReturnPct / 100, 252 / dayCount) - 1) * 100 : 0;

  // Sharpe ratio (simplified, assume Rf = 0, use daily returns)
  const dailyReturns = equity.slice(1).map((e, i) => (e.equity - equity[i].equity) / equity[i].equity);
  const meanDaily = dailyReturns.reduce((s, v) => s + v, 0) / Math.max(1, dailyReturns.length);
  const stdDaily  = Math.sqrt(dailyReturns.reduce((s, v) => s + Math.pow(v - meanDaily, 2), 0) / Math.max(1, dailyReturns.length));
  const sharpe    = stdDaily > 0 ? (meanDaily / stdDaily) * Math.sqrt(252) : 0;

  return {
    strategyId: strategy.id,
    symbol,
    startDate: data[0]?.date ?? '',
    endDate: data[data.length-1]?.date ?? '',
    initialCapital,
    finalCapital: parseFloat(finalCapital.toFixed(2)),
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    totalReturnPercent: parseFloat(totalReturnPct.toFixed(2)),
    annualizedReturn: parseFloat(annualized.toFixed(2)),
    maxDrawdown: parseFloat(Math.min(0, -equity.reduce((m, e) => Math.max(m, e.drawdown), 0)).toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdown.toFixed(2)),
    sharpeRatio: parseFloat(sharpe.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    totalTrades: sellTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(Math.min(99, profitFactor).toFixed(2)),
    trades,
    equityCurve: equity,
  };
}

// ─────────────────────────────────────────────────────────────
// Live Signal Generator
// ─────────────────────────────────────────────────────────────

export function generateLiveSignals(
  strategies: AlgoStrategy[],
  dataMap: Record<string, OHLCVData[]>,
  quoteMap: Record<string, { price: number; name: string; exchange: string; currency: string }>
): AlgoSignal[] {
  const signals: AlgoSignal[] = [];

  for (const strategy of strategies.filter(s => s.status === 'running')) {
    for (const symbol of strategy.symbols) {
      const data = dataMap[symbol];
      const quote = quoteMap[symbol];
      if (!data || data.length < 30 || !quote) continue;

      const result = runStrategyOnBar(strategy, data, data.length - 1);
      if (result.side === null) continue;

      // Confidence based on indicator alignment
      const series = computeIndicatorSeries(data);
      const lastIdx = data.length - 1;
      let confidence = 60;
      if (series.rsi[lastIdx] !== null) {
        const rsi = series.rsi[lastIdx] as number;
        if (result.side === 'buy'  && rsi < 40) confidence += 10;
        if (result.side === 'sell' && rsi > 60) confidence += 10;
      }
      if (series.macdHistogram[lastIdx] !== null) {
        const hist = series.macdHistogram[lastIdx] as number;
        if (result.side === 'buy'  && hist > 0) confidence += 10;
        if (result.side === 'sell' && hist < 0) confidence += 10;
      }
      if (series.sma50[lastIdx] !== null) {
        if (result.side === 'buy'  && quote.price > (series.sma50[lastIdx] as number)) confidence += 10;
        if (result.side === 'sell' && quote.price < (series.sma50[lastIdx] as number)) confidence += 10;
      }
      confidence = Math.min(98, confidence);

      signals.push({
        id: `${strategy.id}-${symbol}-${Date.now()}`,
        strategyId: strategy.id,
        strategyName: strategy.name,
        symbol,
        name: quote.name,
        exchange: quote.exchange,
        side: result.side,
        price: quote.price,
        currency: quote.currency,
        reason: result.reason,
        indicators: result.indicators,
        confidence,
        generatedAt: Date.now(),
        status: 'new',
      });
    }
  }

  return signals;
}

// ─────────────────────────────────────────────────────────────
// Paper Order Simulator
// ─────────────────────────────────────────────────────────────

export function simulateOrder(
  signal: AlgoSignal,
  strategy: AlgoStrategy,
  availableCapital: number,
  positions: AlgoPosition[]
): AlgoOrder | null {
  if (positions.length >= strategy.maxPositions && signal.side === 'buy') return null;
  if (availableCapital < 100 && signal.side === 'buy') return null;

  const invest = signal.side === 'buy'
    ? Math.min(availableCapital, availableCapital * (strategy.positionSize / 100))
    : 0;
  const qty = signal.side === 'buy'
    ? Math.floor(invest / signal.price)
    : positions.find(p => p.symbol === signal.symbol)?.quantity ?? 1;

  if (qty <= 0) return null;

  return {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    strategyId: strategy.id,
    strategyName: strategy.name,
    symbol: signal.symbol,
    name: signal.name,
    side: signal.side,
    type: 'market',
    quantity: qty,
    price: signal.price,
    filledPrice: signal.price * (1 + (Math.random() - 0.5) * 0.001), // ±0.05% slippage
    currency: signal.currency,
    status: 'filled',
    filledAt: Date.now(),
    createdAt: Date.now(),
    pnl: undefined,
    pnlPercent: undefined,
  };
}
