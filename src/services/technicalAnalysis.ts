import type { OHLCVData, TechnicalIndicators } from '@/types';

function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

function ema(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(data.length).fill(null);
  let prev: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (prev === null) {
      prev = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
      result[i] = prev;
    } else {
      prev = data[i] * k + prev * (1 - k);
      result[i] = prev;
    }
  }
  return result;
}

function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      const gain = Math.max(0, diff);
      const loss = Math.max(0, -diff);
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  }
  return result;
}

function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const ema12 = ema(closes, fast);
  const ema26 = ema(closes, slow);
  const macdLine = closes.map((_, i) => {
    if (ema12[i] === null || ema26[i] === null) return null;
    return (ema12[i] as number) - (ema26[i] as number);
  });

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalRaw = ema(macdValues, signal);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  let sIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = signalRaw[sIdx] ?? null;
      sIdx++;
    }
  }

  const histogram = closes.map((_, i) => {
    if (macdLine[i] === null || signalLine[i] === null) return null;
    return (macdLine[i] as number) - (signalLine[i] as number);
  });

  return { macdLine, signalLine, histogram };
}

function bollingerBands(closes: number[], period = 20, stdDev = 2) {
  const mid = sma(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const width: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    if (mid[i] === null) continue;
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i] as number;
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = parseFloat((mean + stdDev * std).toFixed(4));
    lower[i] = parseFloat((mean - stdDev * std).toFixed(4));
    width[i] = mean > 0 ? parseFloat(((upper[i]! - lower[i]!) / mean * 100).toFixed(2)) : null;
  }
  return { mid, upper, lower, width };
}

function atr(data: OHLCVData[], period = 14): (number | null)[] {
  const trueRanges = data.map((d, i) => {
    if (i === 0) return d.high - d.low;
    const prev = data[i - 1].close;
    return Math.max(d.high - d.low, Math.abs(d.high - prev), Math.abs(d.low - prev));
  });
  return sma(trueRanges, period);
}

function obv(closes: number[], volumes: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const prev = result[i - 1];
    if (closes[i] > closes[i - 1]) result.push(prev + volumes[i]);
    else if (closes[i] < closes[i - 1]) result.push(prev - volumes[i]);
    else result.push(prev);
  }
  return result;
}

function stochastic(data: OHLCVData[], kPeriod = 14, dPeriod = 3) {
  const k: (number | null)[] = new Array(data.length).fill(null);
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const lowest = Math.min(...slice.map(d => d.low));
    const highest = Math.max(...slice.map(d => d.high));
    k[i] = highest === lowest ? 50 : parseFloat(((data[i].close - lowest) / (highest - lowest) * 100).toFixed(2));
  }
  const kVals = k.filter((v): v is number => v !== null);
  const dRaw = sma(kVals, dPeriod);
  const d: (number | null)[] = new Array(data.length).fill(null);
  let dIdx = 0;
  for (let i = 0; i < k.length; i++) {
    if (k[i] !== null) {
      d[i] = dRaw[dIdx] ?? null;
      dIdx++;
    }
  }
  return { k, d };
}

export function computeIndicators(data: OHLCVData[]): TechnicalIndicators {
  if (data.length < 30) {
    return {
      sma20: null, sma50: null, sma200: null,
      ema12: null, ema26: null,
      rsi14: null,
      macd: null, macdSignal: null, macdHistogram: null,
      bbUpper: null, bbMiddle: null, bbLower: null, bbWidth: null,
      atr14: null, obv: null,
      stochK: null, stochD: null,
    };
  }

  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const last = data.length - 1;

  const sma20v = sma(closes, 20);
  const sma50v = sma(closes, 50);
  const sma200v = sma(closes, 200);
  const ema12v = ema(closes, 12);
  const ema26v = ema(closes, 26);
  const rsi14v = rsi(closes, 14);
  const { macdLine, signalLine, histogram } = macd(closes);
  const bb = bollingerBands(closes);
  const atr14v = atr(data, 14);
  const obvV = obv(closes, volumes);
  const stoch = stochastic(data);

  const lastNonNull = <T>(arr: (T | null)[]): T | null => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null) return arr[i];
    }
    return null;
  };

  return {
    sma20: lastNonNull(sma20v),
    sma50: lastNonNull(sma50v),
    sma200: lastNonNull(sma200v),
    ema12: lastNonNull(ema12v),
    ema26: lastNonNull(ema26v),
    rsi14: lastNonNull(rsi14v),
    macd: lastNonNull(macdLine),
    macdSignal: lastNonNull(signalLine),
    macdHistogram: lastNonNull(histogram),
    bbUpper: lastNonNull(bb.upper),
    bbMiddle: lastNonNull(bb.mid),
    bbLower: lastNonNull(bb.lower),
    bbWidth: lastNonNull(bb.width),
    atr14: lastNonNull(atr14v),
    obv: obvV[last],
    stochK: lastNonNull(stoch.k),
    stochD: lastNonNull(stoch.d),
  };
}

export function computeIndicatorSeries(data: OHLCVData[]) {
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  const sma20v = sma(closes, 20);
  const sma50v = sma(closes, 50);
  const sma200v = sma(closes, Math.min(200, data.length));
  const ema12v = ema(closes, 12);
  const ema26v = ema(closes, 26);
  const rsi14v = rsi(closes, 14);
  const macdData = macd(closes);
  const bb = bollingerBands(closes);
  const obvV = obv(closes, volumes);

  return {
    dates: data.map(d => d.date),
    closes,
    volumes,
    sma20: sma20v,
    sma50: sma50v,
    sma200: sma200v,
    ema12: ema12v,
    ema26: ema26v,
    rsi: rsi14v,
    macdLine: macdData.macdLine,
    macdSignal: macdData.signalLine,
    macdHistogram: macdData.histogram,
    bbUpper: bb.upper,
    bbMiddle: bb.mid,
    bbLower: bb.lower,
    obv: obvV,
  };
}
