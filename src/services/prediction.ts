import type { OHLCVData, TechnicalIndicators, FundamentalMetrics, PredictionResult, PredictionSignal } from '@/types';

interface PredictionInput {
  symbol: string;
  currentPrice: number;
  historical: OHLCVData[];
  technicals: TechnicalIndicators;
  fundamentals: FundamentalMetrics;
  sentimentScore: number;
  analystScore: number;
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(-1, Math.min(1, (value - (min + max) / 2) / ((max - min) / 2)));
}

export function generatePrediction(input: PredictionInput): PredictionResult {
  const { symbol, currentPrice, historical, technicals, fundamentals, sentimentScore, analystScore } = input;
  const signals: PredictionSignal[] = [];
  let totalScore = 0;
  let totalWeight = 0;
  let confidenceFactors: number[] = [];

  // === TECHNICAL SIGNALS ===

  // RSI signal
  if (technicals.rsi14 !== null) {
    const rsi = technicals.rsi14;
    let impact: PredictionSignal['impact'];
    let score: number;
    if (rsi < 30) { score = 0.7; impact = 'positive'; }
    else if (rsi < 40) { score = 0.3; impact = 'positive'; }
    else if (rsi > 70) { score = -0.7; impact = 'negative'; }
    else if (rsi > 60) { score = -0.2; impact = 'negative'; }
    else { score = 0.1; impact = 'neutral'; }
    const w = 1.5;
    signals.push({ name: 'RSI (14)', value: `${rsi.toFixed(1)}`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.7);
  }

  // MACD signal
  if (technicals.macd !== null && technicals.macdSignal !== null) {
    const hist = technicals.macdHistogram ?? 0;
    const impact: PredictionSignal['impact'] = hist > 0 ? 'positive' : hist < 0 ? 'negative' : 'neutral';
    const score = normalize(hist, -5, 5);
    const w = 1.5;
    signals.push({ name: 'MACD Histogram', value: hist.toFixed(3), impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.75);
  }

  // Price vs SMA
  if (technicals.sma50 !== null) {
    const diff = (currentPrice - technicals.sma50) / technicals.sma50 * 100;
    const impact: PredictionSignal['impact'] = diff > 0 ? 'positive' : 'negative';
    const score = normalize(diff, -15, 15);
    const w = 1.2;
    signals.push({ name: 'Price vs SMA50', value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.7);
  }

  // Golden/Death cross
  if (technicals.sma50 !== null && technicals.sma200 !== null) {
    const diff = (technicals.sma50 - technicals.sma200) / technicals.sma200 * 100;
    const impact: PredictionSignal['impact'] = diff > 0 ? 'positive' : 'negative';
    const score = diff > 0 ? 0.5 : -0.5;
    const w = 1.0;
    signals.push({ name: diff > 0 ? 'Golden Cross' : 'Death Cross', value: `SMA50 ${diff > 0 ? '>' : '<'} SMA200`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.6);
  }

  // Bollinger Band position
  if (technicals.bbUpper !== null && technicals.bbLower !== null && technicals.bbMiddle !== null) {
    const range = technicals.bbUpper - technicals.bbLower;
    const pos = range > 0 ? (currentPrice - technicals.bbLower) / range : 0.5;
    let impact: PredictionSignal['impact'];
    let score: number;
    if (pos < 0.2) { score = 0.6; impact = 'positive'; }
    else if (pos > 0.8) { score = -0.6; impact = 'negative'; }
    else { score = 0.5 - pos; impact = score > 0 ? 'positive' : 'negative'; }
    const w = 1.0;
    signals.push({ name: 'Bollinger Position', value: `${(pos * 100).toFixed(0)}%`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.65);
  }

  // Momentum (5-day and 20-day returns)
  if (historical.length >= 20) {
    const closes = historical.map(d => d.close);
    const ret5 = (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6] * 100;
    const ret20 = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21] * 100;
    const momentum = ret5 * 0.4 + ret20 * 0.6;
    const impact: PredictionSignal['impact'] = momentum > 0 ? 'positive' : 'negative';
    const score = normalize(momentum, -20, 20);
    const w = 1.2;
    signals.push({ name: '5/20d Momentum', value: `${ret5.toFixed(1)}% / ${ret20.toFixed(1)}%`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.7);
  }

  // Volume trend
  if (historical.length >= 10) {
    const vol5 = historical.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
    const vol20 = historical.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
    const volRatio = vol5 / vol20;
    const priceDir = (historical[historical.length - 1].close - historical[historical.length - 6].close) > 0 ? 1 : -1;
    const score = normalize((volRatio - 1) * priceDir, -1, 1);
    const impact: PredictionSignal['impact'] = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    const w = 0.8;
    signals.push({ name: 'Volume Trend', value: `${((volRatio - 1) * 100).toFixed(0)}% vs avg`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.55);
  }

  // Stochastic
  if (technicals.stochK !== null) {
    const k = technicals.stochK;
    let impact: PredictionSignal['impact'];
    let score: number;
    if (k < 20) { score = 0.5; impact = 'positive'; }
    else if (k > 80) { score = -0.5; impact = 'negative'; }
    else { score = 0; impact = 'neutral'; }
    const w = 0.8;
    signals.push({ name: 'Stochastic %K', value: `${k.toFixed(1)}`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.6);
  }

  // === FUNDAMENTAL SIGNALS ===
  if (fundamentals.peRatio !== undefined && fundamentals.peRatio > 0) {
    const pe = fundamentals.peRatio;
    let impact: PredictionSignal['impact'];
    let score: number;
    if (pe < 10) { score = 0.6; impact = 'positive'; }
    else if (pe < 20) { score = 0.3; impact = 'positive'; }
    else if (pe > 50) { score = -0.5; impact = 'negative'; }
    else if (pe > 35) { score = -0.2; impact = 'negative'; }
    else { score = 0; impact = 'neutral'; }
    const w = 1.0;
    signals.push({ name: 'P/E Ratio', value: `${pe.toFixed(1)}x`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.6);
  }

  if (fundamentals.revenueGrowthYoY !== undefined) {
    const growth = fundamentals.revenueGrowthYoY;
    const score = normalize(growth, -20, 40);
    const impact: PredictionSignal['impact'] = growth > 10 ? 'positive' : growth < 0 ? 'negative' : 'neutral';
    const w = 1.2;
    signals.push({ name: 'Revenue Growth YoY', value: `${growth.toFixed(1)}%`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.65);
  }

  if (fundamentals.roe !== undefined) {
    const roe = fundamentals.roe;
    const score = normalize(roe, 0, 30);
    const impact: PredictionSignal['impact'] = roe > 15 ? 'positive' : roe < 0 ? 'negative' : 'neutral';
    const w = 0.8;
    signals.push({ name: 'ROE', value: `${roe.toFixed(1)}%`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.55);
  }

  if (fundamentals.debtEquity !== undefined) {
    const de = fundamentals.debtEquity;
    const score = de < 0.5 ? 0.3 : de < 1.5 ? 0 : de < 3 ? -0.3 : -0.7;
    const impact: PredictionSignal['impact'] = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    const w = 0.7;
    signals.push({ name: 'Debt/Equity', value: `${de.toFixed(2)}x`, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.5);
  }

  // === SENTIMENT & ANALYST ===
  if (sentimentScore !== 0) {
    const score = normalize(sentimentScore, -1, 1);
    const impact: PredictionSignal['impact'] = sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral';
    const w = 1.0;
    signals.push({ name: 'News Sentiment', value: sentimentScore > 0 ? 'Positive' : sentimentScore < 0 ? 'Negative' : 'Neutral', impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.5);
  }

  if (analystScore > 0) {
    const score = normalize(analystScore, 1, 5) * 0.8;
    const impact: PredictionSignal['impact'] = analystScore >= 4 ? 'positive' : analystScore <= 2 ? 'negative' : 'neutral';
    const w = 1.0;
    const ratingLabel = analystScore >= 4.5 ? 'Strong Buy' : analystScore >= 3.5 ? 'Buy' : analystScore >= 2.5 ? 'Hold' : 'Sell';
    signals.push({ name: 'Analyst Consensus', value: ratingLabel, impact, weight: w });
    totalScore += score * w;
    totalWeight += w;
    confidenceFactors.push(0.6);
  }

  // === FINAL COMPUTATION ===
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Base volatility from ATR or historical
  let volatility = 0.02;
  if (technicals.atr14 !== null && currentPrice > 0) {
    volatility = technicals.atr14 / currentPrice;
  } else if (historical.length >= 20) {
    const closes = historical.slice(-20).map(d => d.close);
    const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length;
    volatility = Math.sqrt(variance);
  }

  // 2-week expected move based on score × volatility scaling
  const daysHorizon = 14;
  const annualizedVol = volatility * Math.sqrt(252);
  const periodVol = annualizedVol * Math.sqrt(daysHorizon / 252);
  const drift = normalizedScore * periodVol * 2.5;

  const estimatedGrowthPercent = parseFloat((drift * 100).toFixed(2));
  const predictedPrice = parseFloat((currentPrice * (1 + drift)).toFixed(2));

  // Confidence: based on signal agreement and data quality
  const avgConfidence = confidenceFactors.length > 0
    ? confidenceFactors.reduce((s, v) => s + v, 0) / confidenceFactors.length
    : 0.3;
  const signalAgree = signals.length > 0
    ? signals.filter(s => {
        const isPos = s.impact === 'positive';
        const scorePos = normalizedScore > 0;
        return isPos === scorePos;
      }).length / signals.length
    : 0.5;
  const dataQuality = Math.min(1, historical.length / 100);
  const confidenceScore = parseFloat(Math.min(95, Math.max(10,
    (avgConfidence * 0.3 + signalAgree * 0.5 + dataQuality * 0.2) * 100
  )).toFixed(1));

  const direction: PredictionResult['direction'] =
    estimatedGrowthPercent > 1 ? 'bullish' :
    estimatedGrowthPercent < -1 ? 'bearish' : 'neutral';

  return {
    symbol,
    currentPrice,
    predictedPrice,
    estimatedGrowthPercent,
    confidenceScore,
    direction,
    horizon: '2weeks',
    signals: signals.sort((a, b) => b.weight - a.weight),
    generatedAt: Date.now(),
  };
}
