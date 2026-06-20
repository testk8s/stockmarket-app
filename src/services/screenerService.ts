import type { CountryMarket, ScreenerCriteria, ScreenerResult, StockQuote } from '@/types';
import { COUNTRY_STOCKS } from '@/data/countryStocks';
import { getQuote, getHistorical, getFundamentals, getNews, getRatings } from './stockService';
import { computeIndicators } from './technicalAnalysis';
import { generatePrediction } from './prediction';
import { cacheService, TTL } from './cache';

export async function fetchCountryQuotes(country: CountryMarket): Promise<StockQuote[]> {
  const cacheKey = `screener:quotes:${country}`;
  const cached = cacheService.get<StockQuote[]>(cacheKey);
  if (cached) return cached;

  const stocks = COUNTRY_STOCKS[country];
  const BATCH = 8;
  const results: StockQuote[] = [];

  for (let i = 0; i < stocks.length; i += BATCH) {
    const batch = stocks.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(s => getQuote(s.symbol, 'global', s.name, s.exchange))
    );
    results.push(...fetched);
  }

  cacheService.set(cacheKey, results, TTL.QUOTE);
  return results;
}

export async function buildScreenerResults(
  country: CountryMarket,
  criteria: ScreenerCriteria
): Promise<ScreenerResult[]> {
  const stocks = COUNTRY_STOCKS[country];
  const quotes = await fetchCountryQuotes(country);

  // Filter by quote-level criteria first (fast path)
  const filtered = quotes.filter(q => {
    const s = stocks.find(st => st.symbol === q.symbol);
    if (!s) return false;
    if (criteria.minPrice !== undefined && q.price < criteria.minPrice) return false;
    if (criteria.maxPrice !== undefined && q.price > criteria.maxPrice) return false;
    if (criteria.minMarketCap !== undefined && (q.marketCap ?? 0) < criteria.minMarketCap) return false;
    if (criteria.maxMarketCap !== undefined && (q.marketCap ?? Infinity) > criteria.maxMarketCap) return false;
    if (criteria.minChangePercent !== undefined && q.changePercent < criteria.minChangePercent) return false;
    if (criteria.maxChangePercent !== undefined && q.changePercent > criteria.maxChangePercent) return false;
    if (criteria.minVolume !== undefined && q.volume < criteria.minVolume) return false;
    if (criteria.sectors?.length && !criteria.sectors.includes(s.sector)) return false;
    return true;
  });

  // For each filtered stock, load detail and compute prediction
  const results = await Promise.all(
    filtered.map(async (q) => {
      const s = stocks.find(st => st.symbol === q.symbol)!;
      try {
        const [historical, fundamentals, news, ratings] = await Promise.all([
          getHistorical(q.symbol, 100),
          getFundamentals(q.symbol),
          getNews([q.symbol]),
          getRatings(q.symbol),
        ]);

        const technicals = computeIndicators(historical);
        const sentimentScore = news.reduce((acc, n) => acc + n.sentimentScore, 0) / Math.max(1, news.length);

        // Fundamental filter (needs detail data)
        if (criteria.minPE !== undefined && (fundamentals.peRatio ?? Infinity) < criteria.minPE) return null;
        if (criteria.maxPE !== undefined && (fundamentals.peRatio ?? 0) > criteria.maxPE) return null;
        if (criteria.minROE !== undefined && (fundamentals.roe ?? 0) < criteria.minROE) return null;
        if (criteria.minRevenueGrowth !== undefined && (fundamentals.revenueGrowthYoY ?? 0) < criteria.minRevenueGrowth) return null;
        if (criteria.maxDebtEquity !== undefined && (fundamentals.debtEquity ?? Infinity) > criteria.maxDebtEquity) return null;

        // RSI filter
        if (criteria.minRSI !== undefined && (technicals.rsi14 ?? 0) < criteria.minRSI) return null;
        if (criteria.maxRSI !== undefined && (technicals.rsi14 ?? 100) > criteria.maxRSI) return null;

        const prediction = generatePrediction({
          symbol: q.symbol,
          currentPrice: q.price,
          historical,
          technicals,
          fundamentals,
          sentimentScore,
          analystScore: ratings.averageScore,
        });

        // Prediction direction filter
        if (criteria.predictionDirection && criteria.predictionDirection !== 'all') {
          if (prediction.direction !== criteria.predictionDirection) return null;
        }
        if (criteria.minConfidence !== undefined && prediction.confidenceScore < criteria.minConfidence) return null;

        // Composite score (0–100): blend of multiple signals
        const score = computeCompositeScore(q, prediction, technicals, fundamentals);

        return {
          symbol: q.symbol,
          name: q.name,
          exchange: q.exchange,
          sector: s.sector,
          country,
          quote: q,
          prediction,
          score,
        } satisfies ScreenerResult;
      } catch {
        return null;
      }
    })
  );

  return results.filter((r): r is ScreenerResult => r !== null)
    .sort((a, b) => b.score - a.score);
}

function computeCompositeScore(
  quote: StockQuote,
  prediction: ReturnType<typeof generatePrediction>,
  technicals: ReturnType<typeof computeIndicators>,
  fundamentals: Awaited<ReturnType<typeof getFundamentals>>
): number {
  let score = 50; // base

  // Momentum (20%)
  score += Math.min(20, Math.max(-20, quote.changePercent * 2));

  // RSI (15%) — oversold = bullish opportunity
  if (technicals.rsi14 !== null) {
    const rsi = technicals.rsi14;
    if (rsi < 30) score += 15;
    else if (rsi < 40) score += 7;
    else if (rsi > 70) score -= 15;
    else if (rsi > 60) score -= 5;
  }

  // Prediction direction & confidence (30%)
  const dirScore = prediction.direction === 'bullish' ? 1 : prediction.direction === 'bearish' ? -1 : 0;
  score += dirScore * (prediction.confidenceScore / 100) * 30;

  // Revenue growth (15%)
  if (fundamentals.revenueGrowthYoY !== undefined) {
    score += Math.min(15, Math.max(-10, fundamentals.revenueGrowthYoY * 0.3));
  }

  // P/E value (10%)
  if (fundamentals.peRatio !== undefined && fundamentals.peRatio > 0) {
    if (fundamentals.peRatio < 15) score += 10;
    else if (fundamentals.peRatio < 25) score += 5;
    else if (fundamentals.peRatio > 50) score -= 10;
  }

  // Debt discipline (10%)
  if (fundamentals.debtEquity !== undefined) {
    if (fundamentals.debtEquity < 0.5) score += 10;
    else if (fundamentals.debtEquity > 2) score -= 10;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

export type { ScreenerResult };
