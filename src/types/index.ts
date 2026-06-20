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

// ─── Algo Trading ──────────────────────────────────────────────────────────

export type AlgoStrategyType =
  | 'sma_crossover'
  | 'ema_crossover'
  | 'rsi_mean_reversion'
  | 'macd_signal'
  | 'bollinger_breakout'
  | 'momentum'
  | 'dual_momentum'
  | 'vwap_reversion'
  | 'custom';

export type AlgoOrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type AlgoOrderSide = 'buy' | 'sell';
export type AlgoOrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
export type AlgoStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface AlgoStrategyParam {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  description: string;
}

export interface AlgoStrategy {
  id: string;
  name: string;
  description: string;
  type: AlgoStrategyType;
  params: AlgoStrategyParam[];
  symbols: string[];
  market: 'india' | 'global' | 'all';
  positionSize: number;       // % of capital per trade (1-100)
  maxPositions: number;       // max concurrent open positions
  stopLossPercent: number;
  takeProfitPercent: number;
  status: AlgoStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AlgoSignal {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  name: string;
  exchange: string;
  side: AlgoOrderSide;
  price: number;
  currency: string;
  reason: string;
  indicators: Record<string, number | string>;
  confidence: number;        // 0-100
  generatedAt: number;
  status: 'new' | 'acted' | 'dismissed';
}

export interface AlgoOrder {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  name: string;
  side: AlgoOrderSide;
  type: AlgoOrderType;
  quantity: number;
  price: number;
  filledPrice?: number;
  stopPrice?: number;
  currency: string;
  status: AlgoOrderStatus;
  filledAt?: number;
  createdAt: number;
  pnl?: number;
  pnlPercent?: number;
}

export interface AlgoPosition {
  symbol: string;
  name: string;
  exchange: string;
  strategyId: string;
  strategyName: string;
  side: AlgoOrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  currency: string;
  pnl: number;
  pnlPercent: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  durationMs: number;
}

export interface BacktestTrade {
  date: string;
  symbol: string;
  side: AlgoOrderSide;
  price: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  holdingDays: number;
  reason: string;
}

export interface BacktestResult {
  strategyId: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number; drawdown: number }[];
}

export interface AlgoPortfolioStats {
  totalCapital: number;
  deployedCapital: number;
  availableCapital: number;
  totalPnL: number;
  totalPnLPercent: number;
  todayPnL: number;
  winRate: number;
  totalOrders: number;
  openPositions: number;
  activeStrategies: number;
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
