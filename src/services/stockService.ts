/**
 * Stock data service — uses Yahoo Finance (via public API) with mock data fallback.
 * For production, replace fetchFromYahoo / fetchFromNSE with authenticated API calls.
 */
import type {
  StockQuote, OHLCVData, FundamentalMetrics, NewsItem,
  RatingsSummary, MarketSummary, Market
} from '@/types';
import { cacheService, TTL } from './cache';
import {
  generateMockQuote, generateMockHistorical, generateMockFundamentals,
  generateMockNews, generateMockRatings, generateMarketSummary
} from './mockData';
import { computeIndicators } from './technicalAnalysis';
import { generatePrediction } from './prediction';

// Yahoo Finance proxy endpoint (public, no auth required, rate-limited)
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_QUOTE_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote';

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function fetchYahooQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const url = `${YF_QUOTE_BASE}?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose,averageDailyVolume10Day,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName,longName,currency,exchange`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      exchange: q.exchange || '',
      price: q.regularMarketPrice,
      previousClose: q.regularMarketPreviousClose,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      volume: q.regularMarketVolume,
      avgVolume: q.averageDailyVolume10Day,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      week52High: q.fiftyTwoWeekHigh,
      week52Low: q.fiftyTwoWeekLow,
      timestamp: Date.now(),
      currency: q.currency || 'USD',
    };
  } catch {
    return null;
  }
}

async function fetchYahooHistorical(symbol: string, days = 200): Promise<OHLCVData[] | null> {
  try {
    const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y';
    const url = `${YF_BASE}/${symbol}?range=${range}&interval=1d&includePrePost=false`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0];
    if (!ohlcv || !timestamps.length) return null;

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: ohlcv.open?.[i] ?? 0,
      high: ohlcv.high?.[i] ?? 0,
      low: ohlcv.low?.[i] ?? 0,
      close: ohlcv.close?.[i] ?? 0,
      volume: ohlcv.volume?.[i] ?? 0,
    })).filter(d => d.close > 0);
  } catch {
    return null;
  }
}

export async function getQuote(symbol: string, _market: Market, name: string, exchange: string): Promise<StockQuote> {
  const cacheKey = `quote:${symbol}`;
  const cached = cacheService.get<StockQuote>(cacheKey);
  if (cached) return cached;

  // Try live data first
  const live = await fetchYahooQuote(symbol);
  if (live) {
    cacheService.set(cacheKey, live, TTL.QUOTE);
    return live;
  }

  // Fallback to mock
  const mock = generateMockQuote(symbol, exchange, name);
  cacheService.set(cacheKey, mock, TTL.QUOTE);
  return mock;
}

export async function getHistorical(symbol: string, days = 200): Promise<OHLCVData[]> {
  const cacheKey = `hist:${symbol}:${days}`;
  const cached = cacheService.get<OHLCVData[]>(cacheKey);
  if (cached) return cached;

  const live = await fetchYahooHistorical(symbol, days);
  if (live && live.length > 10) {
    cacheService.set(cacheKey, live, TTL.HISTORICAL);
    return live;
  }

  const mock = generateMockHistorical(symbol, days);
  cacheService.set(cacheKey, mock, TTL.HISTORICAL);
  return mock;
}

export async function getFundamentals(symbol: string): Promise<FundamentalMetrics> {
  const cacheKey = `fund:${symbol}`;
  const cached = cacheService.get<FundamentalMetrics>(cacheKey);
  if (cached) return cached;

  // Mock fundamentals (Yahoo Finance fundamentals need scraping or premium API)
  const data = generateMockFundamentals(symbol);
  cacheService.set(cacheKey, data, TTL.FUNDAMENTALS);
  return data;
}

export async function getNews(symbols: string[]): Promise<NewsItem[]> {
  const cacheKey = `news:${symbols.slice(0, 10).join(',')}`;
  const cached = cacheService.get<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const data = generateMockNews(symbols);
  cacheService.set(cacheKey, data, TTL.NEWS);
  return data;
}

export async function getRatings(symbol: string): Promise<RatingsSummary> {
  const cacheKey = `ratings:${symbol}`;
  const cached = cacheService.get<RatingsSummary>(cacheKey);
  if (cached) return cached;

  const data = generateMockRatings(symbol);
  cacheService.set(cacheKey, data, TTL.RATINGS);
  return data;
}

export async function getMarketSummary(market: Market, quotes: StockQuote[]): Promise<MarketSummary> {
  return generateMarketSummary(market, quotes);
}

export async function getBatchQuotes(
  stocks: Array<{ symbol: string; name: string; exchange: string }>,
  market: Market
): Promise<StockQuote[]> {
  const BATCH_SIZE = 10;
  const results: StockQuote[] = [];

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(s => getQuote(s.symbol, market, s.name, s.exchange))
    );
    results.push(...batchResults);
  }
  return results;
}

export async function getFullStockData(symbol: string, market: Market, name: string, exchange: string) {
  const [quote, historical, fundamentals, news, ratings] = await Promise.all([
    getQuote(symbol, market, name, exchange),
    getHistorical(symbol, 200),
    getFundamentals(symbol),
    getNews([symbol]),
    getRatings(symbol),
  ]);

  const technicals = computeIndicators(historical);
  const sentimentScore = news.reduce((s, n) => s + n.sentimentScore, 0) / Math.max(1, news.length);

  const prediction = generatePrediction({
    symbol,
    currentPrice: quote.price,
    historical,
    technicals,
    fundamentals,
    sentimentScore,
    analystScore: ratings.averageScore,
  });

  return { quote, historical, technicals, fundamentals, news, ratings, prediction };
}
