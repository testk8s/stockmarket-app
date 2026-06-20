/**
 * Swing Trading Engine
 * Detects high-probability swing setups using price action, volume analysis,
 * technical indicators, and news sentiment.
 */
import type {
  OHLCVData, TechnicalIndicators, NewsItem,
  SwingTrade, SwingSignal, SwingSetupType, SwingTimeframe, SwingMarketSource
} from '@/types';

interface SwingInput {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  market: SwingMarketSource;
  quote: { price: number; changePercent: number; volume: number; avgVolume: number; currency: string; high: number; low: number; open: number };
  historical: OHLCVData[];
  technicals: TechnicalIndicators;
  news: NewsItem[];
}

// ─────────────────────────────────────────────────────────────
// Price Action Analysis
// ─────────────────────────────────────────────────────────────

function detectSupportResistance(data: OHLCVData[], lookback = 40): number[] {
  const levels: number[] = [];
  const candles = data.slice(-lookback);
  for (let i = 2; i < candles.length - 2; i++) {
    const hi = candles[i].high;
    const lo = candles[i].low;
    const isSwingHigh = hi > candles[i-1].high && hi > candles[i-2].high && hi > candles[i+1].high && hi > candles[i+2].high;
    const isSwingLow  = lo < candles[i-1].low  && lo < candles[i-2].low  && lo < candles[i+1].low  && lo < candles[i+2].low;
    if (isSwingHigh) levels.push(hi);
    if (isSwingLow)  levels.push(lo);
  }
  return levels;
}

function findNearestLevel(price: number, levels: number[]): number {
  if (!levels.length) return price;
  return levels.reduce((best, lvl) => Math.abs(lvl - price) < Math.abs(best - price) ? lvl : best, levels[0]);
}

function detectBreakout(data: OHLCVData[], lookback = 20): { isBreakout: boolean; isBreakdown: boolean; level: number; strength: number } {
  const recent = data.slice(-lookback - 1);
  const base = recent.slice(0, -1);
  const last = data[data.length - 1];
  const resistanceHigh = Math.max(...base.map(d => d.high));
  const supportLow    = Math.min(...base.map(d => d.low));
  const isBreakout   = last.close > resistanceHigh;
  const isBreakdown  = last.close < supportLow;
  const breakStrength = isBreakout
    ? Math.min(1, (last.close - resistanceHigh) / resistanceHigh * 20)
    : isBreakdown
    ? Math.min(1, (supportLow - last.close) / supportLow * 20)
    : 0;
  return { isBreakout, isBreakdown, level: isBreakout ? resistanceHigh : supportLow, strength: breakStrength };
}

function detectPullback(data: OHLCVData[], sma20: number | null, sma50: number | null): { isPullback: boolean; toLevel: number; strength: number } {
  if (!sma20 || !sma50) return { isPullback: false, toLevel: 0, strength: 0 };
  const last = data[data.length - 1];
  const prev5 = data.slice(-6, -1);
  const trendUp = sma20 > sma50;
  const trendDown = sma20 < sma50;
  const retracedToSMA20 = Math.abs(last.close - sma20) / sma20 < 0.015;
  const retracedToSMA50 = Math.abs(last.close - sma50) / sma50 < 0.015;
  const prev5Down = prev5.every((d, i) => i === 0 || d.close < prev5[i-1].close);
  const prev5Up   = prev5.every((d, i) => i === 0 || d.close > prev5[i-1].close);

  if (trendUp && prev5Down && retracedToSMA20) {
    return { isPullback: true, toLevel: sma20, strength: 0.75 };
  }
  if (trendUp && prev5Down && retracedToSMA50) {
    return { isPullback: true, toLevel: sma50, strength: 0.65 };
  }
  if (trendDown && prev5Up && retracedToSMA20) {
    return { isPullback: true, toLevel: sma20, strength: 0.6 };
  }
  return { isPullback: false, toLevel: 0, strength: 0 };
}

function detectReversal(data: OHLCVData[], rsi: number | null): { isReversal: boolean; type: 'bullish' | 'bearish'; strength: number } {
  if (data.length < 5) return { isReversal: false, type: 'bullish', strength: 0 };
  const c = data.slice(-3);
  const last = c[2];
  const prev = c[1];
  const pprev = c[0];

  // Bullish engulfing: large green candle after 2 red candles
  const bullishEngulf = pprev.close < pprev.open && prev.close < prev.open &&
    last.close > last.open && last.close > pprev.open && last.open < pprev.close;

  // Bearish engulfing: large red candle after 2 green candles
  const bearishEngulf = pprev.close > pprev.open && prev.close > prev.open &&
    last.close < last.open && last.open > pprev.close && last.close < pprev.open;

  // Hammer: small body, long lower wick (bullish reversal)
  const body = Math.abs(last.close - last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  const upperWick = last.high - Math.max(last.close, last.open);
  const isHammer = lowerWick > body * 2 && upperWick < body * 0.5 && (rsi !== null && rsi < 35);

  // Shooting star: small body, long upper wick (bearish reversal)
  const isShootingStar = upperWick > body * 2 && lowerWick < body * 0.5 && (rsi !== null && rsi > 65);

  if (bullishEngulf || isHammer) return { isReversal: true, type: 'bullish', strength: bullishEngulf ? 0.8 : 0.65 };
  if (bearishEngulf || isShootingStar) return { isReversal: true, type: 'bearish', strength: bearishEngulf ? 0.8 : 0.65 };
  return { isReversal: false, type: 'bullish', strength: 0 };
}

// ─────────────────────────────────────────────────────────────
// Volume Analysis
// ─────────────────────────────────────────────────────────────

function analyzeVolume(data: OHLCVData[], currentVol: number, avgVol: number) {
  const volRatio = avgVol > 0 ? currentVol / avgVol : 1;

  // Climax volume: spike > 3× avg
  const isClimax = volRatio > 3;
  // Buildup: steadily rising volume over 5 days
  const vol5 = data.slice(-5).map(d => d.volume);
  const isBuildup = vol5.every((v, i) => i === 0 || v >= vol5[i-1] * 0.9);

  // Volume dry-up (low vol pullback — bullish)
  const vol3 = data.slice(-3).map(d => d.volume);
  const avgVol20 = data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const isDryUp = vol3.every(v => v < avgVol20 * 0.7);

  // OBV divergence (simple)
  const closes = data.slice(-10).map(d => d.close);
  const vols   = data.slice(-10).map(d => d.volume);
  let obv = 0;
  const obvSeries = closes.map((c, i) => {
    if (i === 0) return 0;
    obv += c > closes[i-1] ? vols[i] : c < closes[i-1] ? -vols[i] : 0;
    return obv;
  });
  const priceDir = closes[closes.length-1] > closes[0] ? 1 : -1;
  const obvDir   = obvSeries[obvSeries.length-1] > 0 ? 1 : -1;
  const divergence = priceDir !== obvDir;

  return { volRatio, isClimax, isBuildup, isDryUp, divergence };
}

// ─────────────────────────────────────────────────────────────
// Technical Scoring
// ─────────────────────────────────────────────────────────────

function scoreTechnicals(tech: TechnicalIndicators, price: number): { score: number; signals: SwingSignal[] } {
  const signals: SwingSignal[] = [];
  let raw = 0;
  let count = 0;

  // RSI
  if (tech.rsi14 !== null) {
    const r = tech.rsi14;
    let s = 0;
    if (r < 25)      { s = 0.90; }
    else if (r < 35) { s = 0.70; }
    else if (r < 45) { s = 0.40; }
    else if (r < 55) { s = 0.20; }
    else if (r < 65) { s = -0.10; }
    else if (r < 75) { s = -0.40; }
    else             { s = -0.80; }
    raw += s; count++;
    signals.push({
      category: 'technical', name: 'RSI (14)', value: r.toFixed(1),
      impact: r < 40 ? 'bullish' : r > 60 ? 'bearish' : 'neutral',
      strength: Math.abs(s),
      description: r < 30 ? 'Oversold — high reversal probability' : r > 70 ? 'Overbought — watch for exhaustion' : `Neutral zone at ${r.toFixed(1)}`
    });
  }

  // MACD cross
  if (tech.macd !== null && tech.macdSignal !== null) {
    const cross = tech.macd - tech.macdSignal;
    const s = cross > 0 ? Math.min(0.8, cross * 5) : Math.max(-0.8, cross * 5);
    raw += s; count++;
    signals.push({
      category: 'technical', name: 'MACD Cross', value: `${cross > 0 ? '+' : ''}${cross.toFixed(3)}`,
      impact: cross > 0 ? 'bullish' : 'bearish', strength: Math.min(1, Math.abs(cross) * 5),
      description: cross > 0 ? 'MACD above signal — bullish momentum' : 'MACD below signal — bearish momentum'
    });
  }

  // Price vs SMA20 / SMA50
  if (tech.sma20 !== null) {
    const d = (price - tech.sma20) / tech.sma20;
    const s = d > 0 ? Math.min(0.5, d * 10) : Math.max(-0.5, d * 10);
    raw += s; count++;
    const pct = (d * 100).toFixed(1);
    signals.push({
      category: 'technical', name: 'Price vs SMA20', value: `${d > 0 ? '+' : ''}${pct}%`,
      impact: d > 0 ? 'bullish' : 'bearish', strength: Math.min(1, Math.abs(d) * 10),
      description: d > 0 ? `Price ${pct}% above SMA20 — uptrend` : `Price ${pct}% below SMA20 — downtrend`
    });
  }

  // MA trend (SMA50 vs SMA200)
  if (tech.sma50 !== null && tech.sma200 !== null) {
    const cross = tech.sma50 > tech.sma200;
    const s = cross ? 0.4 : -0.4;
    raw += s; count++;
    signals.push({
      category: 'technical', name: cross ? 'Golden Cross' : 'Death Cross',
      value: `SMA50 ${cross ? '>' : '<'} SMA200`,
      impact: cross ? 'bullish' : 'bearish', strength: 0.4,
      description: cross ? 'Long-term uptrend structure intact' : 'Long-term downtrend structure — caution'
    });
  }

  // Bollinger Bands
  if (tech.bbUpper !== null && tech.bbLower !== null && tech.bbMiddle !== null) {
    const range = tech.bbUpper - tech.bbLower;
    const pos = range > 0 ? (price - tech.bbLower) / range : 0.5;
    let s = 0;
    if (pos < 0.1)      { s = 0.85; }
    else if (pos < 0.25) { s = 0.55; }
    else if (pos > 0.9)  { s = -0.85; }
    else if (pos > 0.75) { s = -0.55; }
    raw += s; count++;
    signals.push({
      category: 'technical', name: 'Bollinger Bands', value: `${(pos * 100).toFixed(0)}% of band`,
      impact: pos < 0.25 ? 'bullish' : pos > 0.75 ? 'bearish' : 'neutral',
      strength: Math.abs(s),
      description: pos < 0.1 ? 'Near lower band — oversold squeeze setup' :
                   pos > 0.9 ? 'Near upper band — overbought extension' :
                   `At ${(pos * 100).toFixed(0)}% of BB range`
    });
  }

  // Stochastic
  if (tech.stochK !== null && tech.stochD !== null) {
    const k = tech.stochK;
    const d = tech.stochD;
    let s = 0;
    if (k < 20 && k > d) { s = 0.75; }      // Stoch bullish cross from oversold
    else if (k < 20)     { s = 0.55; }
    else if (k > 80 && k < d) { s = -0.75; }// Stoch bearish cross from overbought
    else if (k > 80)     { s = -0.55; }
    raw += s; count++;
    signals.push({
      category: 'technical', name: 'Stochastic', value: `%K ${k.toFixed(1)} / %D ${d.toFixed(1)}`,
      impact: k < 20 ? 'bullish' : k > 80 ? 'bearish' : 'neutral',
      strength: Math.abs(s),
      description: k < 20 && k > d ? 'Bullish stochastic cross from oversold zone' :
                   k > 80 && k < d ? 'Bearish stochastic cross from overbought zone' :
                   `Stochastic at ${k.toFixed(1)}`
    });
  }

  // ATR as % of price (volatility context)
  if (tech.atr14 !== null && price > 0) {
    const atrPct = (tech.atr14 / price) * 100;
    signals.push({
      category: 'technical', name: 'ATR Volatility', value: `${atrPct.toFixed(2)}%/day`,
      impact: 'neutral', strength: 0.3,
      description: `Average daily range of ${atrPct.toFixed(2)}% — ${atrPct < 1 ? 'low' : atrPct < 3 ? 'moderate' : 'high'} volatility`
    });
  }

  const score = count > 0 ? Math.round(((raw / count + 1) / 2) * 100) : 50;
  return { score: Math.min(100, Math.max(0, score)), signals };
}

// ─────────────────────────────────────────────────────────────
// Price Action Score
// ─────────────────────────────────────────────────────────────

function scorePriceAction(data: OHLCVData[], tech: TechnicalIndicators, quote: SwingInput['quote']): { score: number; signals: SwingSignal[] } {
  const signals: SwingSignal[] = [];
  let raw = 0; let count = 0;

  const breakout = detectBreakout(data);
  const pullback = detectPullback(data, tech.sma20, tech.sma50);
  const reversal = detectReversal(data, tech.rsi14);

  // Today's candle body
  const last = data[data.length - 1];
  const candleBody = Math.abs(last.close - last.open) / last.open * 100;
  const isBullBar = last.close > last.open;
  const bodyStrength = Math.min(1, candleBody / 2);

  signals.push({
    category: 'price', name: "Today's Candle", value: `${isBullBar ? '▲' : '▼'} ${candleBody.toFixed(2)}% body`,
    impact: isBullBar ? 'bullish' : 'bearish',
    strength: bodyStrength,
    description: `${isBullBar ? 'Bullish' : 'Bearish'} bar with ${candleBody.toFixed(2)}% body — ${candleBody > 1.5 ? 'strong' : 'weak'} conviction`
  });
  raw += isBullBar ? bodyStrength : -bodyStrength; count++;

  // Breakout
  if (breakout.isBreakout) {
    signals.push({
      category: 'price', name: 'Breakout Detected', value: `Above ${breakout.level.toFixed(2)}`,
      impact: 'bullish', strength: breakout.strength,
      description: `Price broke above 20-day resistance at ${breakout.level.toFixed(2)}`
    });
    raw += breakout.strength; count++;
  } else if (breakout.isBreakdown) {
    signals.push({
      category: 'price', name: 'Breakdown Detected', value: `Below ${breakout.level.toFixed(2)}`,
      impact: 'bearish', strength: breakout.strength,
      description: `Price broke below 20-day support at ${breakout.level.toFixed(2)}`
    });
    raw -= breakout.strength; count++;
  }

  // Pullback
  if (pullback.isPullback) {
    signals.push({
      category: 'price', name: 'Pullback to Support', value: `Near ${pullback.toLevel.toFixed(2)}`,
      impact: 'bullish', strength: pullback.strength,
      description: `Price pulled back to key MA — potential swing entry`
    });
    raw += pullback.strength; count++;
  }

  // Reversal candle
  if (reversal.isReversal) {
    signals.push({
      category: 'price', name: `${reversal.type === 'bullish' ? 'Bullish' : 'Bearish'} Reversal Pattern`,
      value: `Engulfing / Hammer pattern`,
      impact: reversal.type === 'bullish' ? 'bullish' : 'bearish',
      strength: reversal.strength,
      description: `Strong ${reversal.type} reversal candlestick pattern detected`
    });
    raw += reversal.type === 'bullish' ? reversal.strength : -reversal.strength;
    count++;
  }

  // 52-week proximity
  if (quote.high > 0) {
    const fromHigh = ((quote.price - quote.high) / quote.high) * 100;
    if (fromHigh > -5) {
      signals.push({
        category: 'price', name: 'Near 52-Week High', value: `${fromHigh.toFixed(1)}% from high`,
        impact: 'bullish', strength: 0.6,
        description: 'Price near 52-week high — strong momentum signal'
      });
      raw += 0.6; count++;
    }
  }

  // Clean trend (5/10/20 day ascending)
  const c5 = data.slice(-6);
  const trendUp5 = c5[c5.length-1].close > c5[0].close;
  const c10 = data.slice(-11);
  const trendUp10 = c10[c10.length-1].close > c10[0].close;
  if (trendUp5 && trendUp10) {
    signals.push({
      category: 'price', name: 'Short-Term Uptrend', value: '5d+10d ascending',
      impact: 'bullish', strength: 0.5,
      description: 'Price in a clean short-term uptrend (5 & 10 day)'
    });
    raw += 0.5; count++;
  } else if (!trendUp5 && !trendUp10) {
    signals.push({
      category: 'price', name: 'Short-Term Downtrend', value: '5d+10d descending',
      impact: 'bearish', strength: 0.5,
      description: 'Price in a short-term downtrend — wait for reversal'
    });
    raw -= 0.5; count++;
  }

  const score = count > 0 ? Math.round(((raw / count + 1) / 2) * 100) : 50;
  return { score: Math.min(100, Math.max(0, score)), signals };
}

// ─────────────────────────────────────────────────────────────
// Volume Score
// ─────────────────────────────────────────────────────────────

function scoreVolume(data: OHLCVData[], currentVol: number, avgVol: number, currentPrice: number, prevClose: number): { score: number; signals: SwingSignal[] } {
  const signals: SwingSignal[] = [];
  let raw = 0; let count = 0;

  const va = analyzeVolume(data, currentVol, avgVol);
  const isUp = currentPrice > prevClose;

  // Volume ratio vs average
  const vrSignal: SwingSignal = {
    category: 'volume', name: 'Volume vs Avg', value: `${va.volRatio.toFixed(2)}× average`,
    impact: va.volRatio > 1.5 ? (isUp ? 'bullish' : 'bearish') : 'neutral',
    strength: Math.min(1, (va.volRatio - 1) / 3),
    description: va.volRatio > 2 ? `Heavy volume ${isUp ? 'surge confirms breakout' : 'on decline — distribution'}` :
                 va.volRatio < 0.7 ? 'Low volume — weak conviction, wait for catalyst' :
                 `Volume at ${(va.volRatio * 100).toFixed(0)}% of average`
  };
  signals.push(vrSignal);
  if (va.volRatio > 1.5) { raw += isUp ? Math.min(0.9, va.volRatio / 4) : -Math.min(0.9, va.volRatio / 4); count++; }
  else { raw += 0; count++; }

  // Climax volume
  if (va.isClimax) {
    signals.push({
      category: 'volume', name: 'Volume Climax', value: `${va.volRatio.toFixed(1)}× surge`,
      impact: isUp ? 'bullish' : 'bearish', strength: 0.9,
      description: isUp ? 'Climax buying surge — high momentum breakout' : 'Climax selling spike — potential capitulation / exhaustion'
    });
    raw += isUp ? 0.9 : -0.9; count++;
  }

  // Volume buildup (rising volume confirms trend)
  if (va.isBuildup) {
    signals.push({
      category: 'volume', name: 'Volume Buildup', value: '5-day rising volume',
      impact: 'bullish', strength: 0.65,
      description: 'Steady volume buildup over 5 days — institutional accumulation signal'
    });
    raw += 0.65; count++;
  }

  // Dry-up pullback (bullish — low vol on retracement)
  if (va.isDryUp) {
    signals.push({
      category: 'volume', name: 'Volume Dry-Up', value: 'Low vol 3-day pullback',
      impact: 'bullish', strength: 0.7,
      description: 'Volume contracting on pullback — sellers not in control, ideal swing entry'
    });
    raw += 0.7; count++;
  }

  // OBV divergence
  if (va.divergence) {
    signals.push({
      category: 'volume', name: 'OBV Divergence', value: `Price vs OBV diverge`,
      impact: isUp ? 'bearish' : 'bullish', strength: 0.5,
      description: isUp
        ? 'Price rising but OBV declining — hidden selling, watch for reversal'
        : 'Price falling but OBV rising — hidden accumulation, potential reversal'
    });
    raw += isUp ? -0.5 : 0.5; count++;
  }

  // VWAP proxy (compare to last week's avg close as volume-weighted proxy)
  const recentData = data.slice(-5);
  const vwapProxy = recentData.reduce((s, d) => s + d.close * d.volume, 0) / recentData.reduce((s, d) => s + d.volume, 0);
  const aboveVWAP = currentPrice > vwapProxy;
  signals.push({
    category: 'volume', name: 'VWAP Position', value: `${aboveVWAP ? 'Above' : 'Below'} VWAP (~${vwapProxy.toFixed(2)})`,
    impact: aboveVWAP ? 'bullish' : 'bearish', strength: 0.45,
    description: aboveVWAP ? 'Price above VWAP — buyers in control intraday' : 'Price below VWAP — sellers in control intraday'
  });
  raw += aboveVWAP ? 0.45 : -0.45; count++;

  const score = count > 0 ? Math.round(((raw / count + 1) / 2) * 100) : 50;
  return { score: Math.min(100, Math.max(0, score)), signals };
}

// ─────────────────────────────────────────────────────────────
// News Sentiment Score
// ─────────────────────────────────────────────────────────────

function scoreNews(news: NewsItem[]): { score: number; signals: SwingSignal[] } {
  const signals: SwingSignal[] = [];
  if (!news.length) {
    signals.push({ category: 'news', name: 'No Recent News', value: 'Quiet', impact: 'neutral', strength: 0.1, description: 'No significant news catalysts detected' });
    return { score: 50, signals };
  }

  const recent = news.slice(0, 10);
  const avgSentiment = recent.reduce((s, n) => s + n.sentimentScore, 0) / recent.length;
  const posCount = recent.filter(n => n.sentiment === 'positive').length;
  const negCount = recent.filter(n => n.sentiment === 'negative').length;
  const latest = recent[0];

  // Overall sentiment signal
  signals.push({
    category: 'news', name: 'News Sentiment', value: avgSentiment > 0.1 ? 'Positive' : avgSentiment < -0.1 ? 'Negative' : 'Neutral',
    impact: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
    strength: Math.min(1, Math.abs(avgSentiment)),
    description: `${posCount} positive, ${negCount} negative out of ${recent.length} articles`
  });

  // Latest article breakdown
  signals.push({
    category: 'news', name: 'Latest Headline', value: `${latest.sentiment.toUpperCase()} — ${latest.source}`,
    impact: latest.sentiment === 'positive' ? 'bullish' : latest.sentiment === 'negative' ? 'bearish' : 'neutral',
    strength: Math.min(1, Math.abs(latest.sentimentScore)),
    description: latest.title.length > 60 ? latest.title.slice(0, 60) + '…' : latest.title
  });

  // Momentum: recent articles trending positive
  const last3 = recent.slice(0, 3);
  const last3Avg = last3.reduce((s, n) => s + n.sentimentScore, 0) / last3.length;
  if (Math.abs(last3Avg) > 0.2) {
    signals.push({
      category: 'news', name: 'News Momentum', value: last3Avg > 0 ? '↑ Improving' : '↓ Deteriorating',
      impact: last3Avg > 0 ? 'bullish' : 'bearish', strength: Math.min(1, Math.abs(last3Avg)),
      description: `Last 3 articles trending ${last3Avg > 0 ? 'positive' : 'negative'} — catalyst may be building`
    });
  }

  const rawScore = 50 + avgSentiment * 40;
  return { score: Math.min(100, Math.max(10, Math.round(rawScore))), signals };
}

// ─────────────────────────────────────────────────────────────
// Setup Classifier + Entry / Target / Stop
// ─────────────────────────────────────────────────────────────

function classifySetup(
  priceScore: number,
  _volScore: number,
  techScore: number,
  _newsScore: number,
  breakout: ReturnType<typeof detectBreakout>,
  pullback: ReturnType<typeof detectPullback>,
  reversal: ReturnType<typeof detectReversal>,
  rsi: number | null,
  volRatio: number
): { setupType: SwingSetupType; timeframe: SwingTimeframe; direction: 'long' | 'short' } {
  const bullish = priceScore + techScore > 110;
  const bearish = priceScore + techScore < 90;

  if (breakout.isBreakout && volRatio > 1.5) return { setupType: 'breakout', timeframe: '1w', direction: 'long' };
  if (breakout.isBreakdown && volRatio > 1.5) return { setupType: 'breakout', timeframe: '1w', direction: 'short' };
  if (pullback.isPullback && bullish) return { setupType: 'pullback', timeframe: '3d', direction: 'long' };
  if (pullback.isPullback && bearish) return { setupType: 'pullback', timeframe: '3d', direction: 'short' };
  if (reversal.isReversal) return { setupType: 'reversal', timeframe: '3d', direction: reversal.type === 'bullish' ? 'long' : 'short' };
  if (rsi !== null && rsi < 30) return { setupType: 'oversold_bounce', timeframe: '1w', direction: 'long' };
  if (volRatio > 2 && bullish) return { setupType: 'volume_surge', timeframe: '3d', direction: 'long' };
  if (volRatio > 2 && bearish) return { setupType: 'volume_surge', timeframe: '3d', direction: 'short' };
  if (bullish && priceScore > 65) return { setupType: 'momentum', timeframe: '1w', direction: 'long' };
  if (bearish && priceScore < 35) return { setupType: 'momentum', timeframe: '1w', direction: 'short' };
  return { setupType: 'trend_continuation', timeframe: '1w', direction: bullish ? 'long' : 'short' };
}

function calcEntryRisk(price: number, atr: number | null, direction: 'long' | 'short', setupType: SwingSetupType) {
  const atrVal = atr ?? price * 0.02;
  const stopMult = setupType === 'breakout' ? 1.0 : setupType === 'reversal' ? 0.8 : 1.2;
  const t1Mult  = setupType === 'momentum' ? 2.0 : 1.5;
  const t2Mult  = setupType === 'momentum' ? 3.5 : 2.5;
  const t3Mult  = setupType === 'momentum' ? 5.5 : 4.0;

  if (direction === 'long') {
    const entry = price;
    const entryLow  = price - atrVal * 0.3;
    const entryHigh = price + atrVal * 0.3;
    const stop  = price - atrVal * stopMult;
    const t1    = price + atrVal * t1Mult;
    const t2    = price + atrVal * t2Mult;
    const t3    = price + atrVal * t3Mult;
    const risk  = ((entry - stop) / entry) * 100;
    const rew   = ((t2 - entry) / entry) * 100;
    const rr    = rew / Math.max(0.1, risk);
    return { entry, entryLow, entryHigh, stop, t1, t2, t3, risk, reward: rew, rr };
  } else {
    const entry = price;
    const entryLow  = price - atrVal * 0.3;
    const entryHigh = price + atrVal * 0.3;
    const stop  = price + atrVal * stopMult;
    const t1    = price - atrVal * t1Mult;
    const t2    = price - atrVal * t2Mult;
    const t3    = price - atrVal * t3Mult;
    const risk  = ((stop - entry) / entry) * 100;
    const rew   = ((entry - t2) / entry) * 100;
    const rr    = rew / Math.max(0.1, risk);
    return { entry, entryLow, entryHigh, stop, t1, t2, t3, risk, reward: rew, rr };
  }
}

// ─────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────

export function analyzeSwingSetup(input: SwingInput): SwingTrade {
  const { symbol, name, exchange, sector, market, quote, historical, technicals, news } = input;
  const data = historical.slice(-50);

  // Run all four scoring engines
  const techResult   = scoreTechnicals(technicals, quote.price);
  const priceResult  = scorePriceAction(data, technicals, quote);
  const volResult    = scoreVolume(data, quote.volume, quote.avgVolume, quote.price, data[data.length - 2]?.close ?? quote.price);
  const newsResult   = scoreNews(news);

  // Combined overall score (weighted)
  const overallScore = Math.round(
    priceResult.score  * 0.30 +
    volResult.score    * 0.20 +
    techResult.score   * 0.35 +
    newsResult.score   * 0.15
  );

  // Detect patterns for setup classification
  const breakout  = detectBreakout(data);
  const pullback  = detectPullback(data, technicals.sma20, technicals.sma50);
  const reversal  = detectReversal(data, technicals.rsi14);
  const volAnalysis = analyzeVolume(data, quote.volume, quote.avgVolume);

  const { setupType, timeframe, direction } = classifySetup(
    priceResult.score, volResult.score, techResult.score, newsResult.score,
    breakout, pullback, reversal, technicals.rsi14, volAnalysis.volRatio
  );

  // Entry, stop, targets
  const { entry, entryLow, entryHigh, stop, t1, t2, t3, risk, reward, rr } =
    calcEntryRisk(quote.price, technicals.atr14, direction, setupType);

  // Trend strength (ADX proxy from directional move)
  const trendCandles = data.slice(-14);
  const upMoves   = trendCandles.filter(d => d.close > d.open).length;
  const trendStrength = upMoves / 14;

  // Collect all signals
  const allSignals: SwingSignal[] = [
    ...priceResult.signals,
    ...volResult.signals,
    ...techResult.signals,
    ...newsResult.signals,
  ];

  return {
    symbol, name, exchange, sector, market,
    currentPrice: quote.price,
    currency: quote.currency,

    setupType,
    direction,
    timeframe,

    entryPrice: parseFloat(entry.toFixed(2)),
    entryZoneLow: parseFloat(entryLow.toFixed(2)),
    entryZoneHigh: parseFloat(entryHigh.toFixed(2)),
    stopLoss: parseFloat(stop.toFixed(2)),
    target1: parseFloat(t1.toFixed(2)),
    target2: parseFloat(t2.toFixed(2)),
    target3: parseFloat(t3.toFixed(2)),
    riskRewardRatio: parseFloat(rr.toFixed(2)),
    riskPercent: parseFloat(risk.toFixed(2)),
    rewardPercent: parseFloat(reward.toFixed(2)),

    overallScore,
    priceScore: priceResult.score,
    volumeScore: volResult.score,
    technicalScore: techResult.score,
    newsScore: newsResult.score,

    signals: allSignals,

    volumeRatio: parseFloat(volAnalysis.volRatio.toFixed(2)),
    atr: technicals.atr14 ?? quote.price * 0.02,
    trendStrength,
    keyLevel: findNearestLevel(quote.price, detectSupportResistance(data)),
    generatedAt: Date.now(),
  };
}
