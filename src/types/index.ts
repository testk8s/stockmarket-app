export type Market = 'india' | 'global';
export type CountryMarket = 'usa' | 'uk' | 'japan' | 'germany' | 'china';

export interface ScreenerCriteria {
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  minChangePercent?: number;
  maxChangePercent?: number;
  minVolume?: number;
  minRSI?: number;
  maxRSI?: number;
  sectors?: string[];
  minROE?: number;
  minRevenueGrowth?: number;
  maxDebtEquity?: number;
  predictionDirection?: 'bullish' | 'bearish' | 'all';
  minConfidence?: number;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  country: CountryMarket;
  quote: StockQuote;
  prediction: PredictionResult;
  score: number; // composite screener score 0-100
}

export interface CountryInfo {
  id: CountryMarket;
  name: string;
  flag: string;
  exchanges: string[];
  currency: string;
  indexName: string;
  color: string;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  sector?: string;
  industry?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  week52High?: number;
  week52Low?: number;
  timestamp: number;
  currency: string;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbWidth: number | null;
  atr14: number | null;
  obv: number | null;
  stochK: number | null;
  stochD: number | null;
}

export interface FundamentalMetrics {
  peRatio?: number;
  eps?: number;
  pbRatio?: number;
  psRatio?: number;
  evEbitda?: number;
  debtEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  roe?: number;
  roa?: number;
  revenueGrowthYoY?: number;
  earningsGrowthYoY?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  dividendYield?: number;
  payoutRatio?: number;
  beta?: number;
  sharesOutstanding?: number;
  freeCashFlow?: number;
  revenue?: number;
  ebitda?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  relatedSymbols: string[];
  imageUrl?: string;
}

export interface AnalystRating {
  symbol: string;
  firm: string;
  analyst?: string;
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  priceTarget?: number;
  previousRating?: string;
  date: string;
}

export interface RatingsSummary {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  averageScore: number;
  consensusRating: string;
  averagePriceTarget?: number;
}

export interface PredictionResult {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  estimatedGrowthPercent: number;
  confidenceScore: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  horizon: '2weeks';
  signals: PredictionSignal[];
  generatedAt: number;
}

export interface PredictionSignal {
  name: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface WatchlistEntry {
  symbol: string;
  market: Market;
  addedAt: number;
  notes?: string;
  alertPrice?: number;
}

export interface MarketSummary {
  market: Market;
  indexName: string;
  indexValue: number;
  indexChange: number;
  indexChangePercent: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  totalVolume: number;
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type ViewTab = 'watchlist' | 'analysis' | 'dashboard' | 'news' | 'prediction';

// ─── Swing Trading ─────────────────────────────────────────────
export type SwingSetupType =
  | 'breakout'
  | 'pullback'
  | 'reversal'
  | 'momentum'
  | 'volume_surge'
  | 'oversold_bounce'
  | 'trend_continuation';

export type SwingTimeframe = '1d' | '3d' | '1w' | '2w';

export type SwingMarketSource = 'india' | 'global' | 'usa' | 'uk' | 'japan' | 'germany' | 'china';

export interface SwingSignal {
  category: 'price' | 'volume' | 'technical' | 'news';
  name: string;
  value: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  strength: number;   // 0–1
  description: string;
}

export interface SwingTrade {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  market: SwingMarketSource;
  currentPrice: number;
  currency: string;

  // Setup classification
  setupType: SwingSetupType;
  direction: 'long' | 'short';
  timeframe: SwingTimeframe;

  // Entry / Risk / Reward
  entryPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  riskPercent: number;
  rewardPercent: number;

  // Scoring
  overallScore: number;      // 0–100
  priceScore: number;
  volumeScore: number;
  technicalScore: number;
  newsScore: number;

  // Signals
  signals: SwingSignal[];

  // Context
  volumeRatio: number;       // current vol / 20d avg
  atr: number;
  trendStrength: number;     // 0–1 (ADX proxy)
  keyLevel: number;          // nearest S/R
  generatedAt: number;
}

export interface SwingFilter {
  market: SwingMarketSource | 'all';
  setupType: SwingSetupType | 'all';
  direction: 'long' | 'short' | 'all';
  minScore: number;
  minRR: number;
  maxRisk: number;
  sectors: string[];
}

export interface StockDetailData {
  quote: StockQuote;
  historical: OHLCVData[];
  technicals: TechnicalIndicators;
  fundamentals: FundamentalMetrics;
  news: NewsItem[];
  ratings: RatingsSummary;
  prediction: PredictionResult;
}
