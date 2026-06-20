import type {
  StockQuote, OHLCVData, FundamentalMetrics, NewsItem,
  AnalystRating, RatingsSummary, MarketSummary
} from '@/types';
import { format, subDays } from 'date-fns';

// Seeded random for consistent mock data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function rng(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0;
  }
  return seededRandom(Math.abs(hash));
}

export function generateMockQuote(symbol: string, exchange: string, name: string): StockQuote {
  const r = rng(symbol);
  const basePrice = 50 + r() * 4950;
  const change = (r() - 0.48) * basePrice * 0.06;
  const price = basePrice + change;
  const currency = ['NSE', 'BSE'].includes(exchange) ? 'INR' : 'USD';

  return {
    symbol,
    name,
    exchange,
    price: parseFloat(price.toFixed(2)),
    previousClose: parseFloat(basePrice.toFixed(2)),
    open: parseFloat((basePrice + (r() - 0.5) * basePrice * 0.02).toFixed(2)),
    high: parseFloat((price + r() * price * 0.02).toFixed(2)),
    low: parseFloat((price - r() * price * 0.02).toFixed(2)),
    volume: Math.floor(100000 + r() * 50000000),
    avgVolume: Math.floor(500000 + r() * 10000000),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
    marketCap: parseFloat((price * (1e7 + r() * 1e12)).toFixed(0)),
    week52High: parseFloat((price * (1.1 + r() * 0.5)).toFixed(2)),
    week52Low: parseFloat((price * (0.5 + r() * 0.4)).toFixed(2)),
    timestamp: Date.now(),
    currency,
  };
}

export function generateMockHistorical(symbol: string, days = 200): OHLCVData[] {
  const r = rng(symbol + 'hist');
  const result: OHLCVData[] = [];
  let price = 100 + r() * 900;

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dailyReturn = (r() - 0.48) * 0.04;
    price = price * (1 + dailyReturn);
    const open = price;
    const high = open * (1 + r() * 0.03);
    const low = open * (1 - r() * 0.03);
    const close = low + r() * (high - low);
    const volume = Math.floor(500000 + r() * 5000000);

    result.push({
      date: format(date, 'yyyy-MM-dd'),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
  }
  return result;
}

export function generateMockFundamentals(symbol: string): FundamentalMetrics {
  const r = rng(symbol + 'fund');
  return {
    peRatio: parseFloat((5 + r() * 45).toFixed(2)),
    eps: parseFloat((1 + r() * 50).toFixed(2)),
    pbRatio: parseFloat((0.5 + r() * 8).toFixed(2)),
    psRatio: parseFloat((0.5 + r() * 10).toFixed(2)),
    evEbitda: parseFloat((5 + r() * 30).toFixed(2)),
    debtEquity: parseFloat((r() * 3).toFixed(2)),
    currentRatio: parseFloat((0.8 + r() * 3).toFixed(2)),
    quickRatio: parseFloat((0.5 + r() * 2.5).toFixed(2)),
    roe: parseFloat((5 + r() * 40).toFixed(2)),
    roa: parseFloat((2 + r() * 20).toFixed(2)),
    revenueGrowthYoY: parseFloat((-10 + r() * 60).toFixed(2)),
    earningsGrowthYoY: parseFloat((-20 + r() * 80).toFixed(2)),
    grossMargin: parseFloat((20 + r() * 60).toFixed(2)),
    operatingMargin: parseFloat((5 + r() * 40).toFixed(2)),
    netMargin: parseFloat((2 + r() * 30).toFixed(2)),
    dividendYield: r() > 0.5 ? parseFloat((r() * 5).toFixed(2)) : 0,
    payoutRatio: parseFloat((r() * 80).toFixed(2)),
    beta: parseFloat((0.3 + r() * 2).toFixed(2)),
    sharesOutstanding: Math.floor(1e7 + r() * 1e10),
    freeCashFlow: parseFloat(((-1e8) + r() * 5e9).toFixed(0)),
    revenue: parseFloat((1e8 + r() * 5e10).toFixed(0)),
    ebitda: parseFloat((1e7 + r() * 5e9).toFixed(0)),
  };
}

const newsTitles: Record<string, string[]> = {
  positive: [
    '{symbol} Reports Strong Q3 Earnings, Beats Analyst Estimates',
    '{symbol} Announces Major Partnership Deal Worth $2B',
    '{symbol} Stock Upgraded to Buy by Leading Analysts',
    '{symbol} Hits 52-Week High on Strong Revenue Growth',
    '{symbol} Expands Into New Markets, Driving Growth',
    '{symbol} CEO Announces Share Buyback Program',
    '{symbol} Secures Record Government Contract',
  ],
  negative: [
    '{symbol} Misses Q3 Earnings Expectations Amid Headwinds',
    '{symbol} Faces Regulatory Scrutiny Over Business Practices',
    '{symbol} Lowers Guidance for FY2025',
    '{symbol} Stock Falls as Competition Intensifies',
    '{symbol} CEO Resignation Sparks Market Uncertainty',
  ],
  neutral: [
    '{symbol} Schedules Q4 Earnings Call for Next Month',
    '{symbol}: What Analysts Are Watching This Quarter',
    '{symbol} Holds Annual Shareholder Meeting',
    '{symbol} Updates Corporate Strategy Presentation',
    '{symbol} Files Annual Report with Regulatory Authority',
  ],
};

export function generateMockNews(symbols: string[]): NewsItem[] {
  const allNews: NewsItem[] = [];
  const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Financial Times', 'Economic Times', 'Moneycontrol', 'Livemint', 'Business Standard'];
  const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'positive', 'negative', 'neutral', 'neutral'];

  symbols.slice(0, 20).forEach((symbol, si) => {
    const r = rng(symbol + 'news');
    const count = 2 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      const sentiment = sentiments[Math.floor(r() * sentiments.length)];
      const titles = newsTitles[sentiment];
      const title = titles[Math.floor(r() * titles.length)].replace('{symbol}', symbol);
      const hoursAgo = Math.floor(r() * 48);

      allNews.push({
        id: `${symbol}-${si}-${i}`,
        title,
        summary: `Analysis of recent developments at ${symbol} shows ${sentiment} trends in the market. Investors are closely watching key metrics and industry dynamics.`,
        url: '#',
        source: sources[Math.floor(r() * sources.length)],
        publishedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        sentiment,
        sentimentScore: sentiment === 'positive' ? 0.3 + r() * 0.7 : sentiment === 'negative' ? -(0.3 + r() * 0.7) : (r() - 0.5) * 0.4,
        relatedSymbols: [symbol],
        imageUrl: undefined,
      });
    }
  });

  return allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function generateMockRatings(symbol: string): RatingsSummary {
  const r = rng(symbol + 'rat');
  const total = 5 + Math.floor(r() * 30);
  const strongBuy = Math.floor(r() * total * 0.35);
  const buy = Math.floor(r() * (total - strongBuy) * 0.4);
  const sell = Math.floor(r() * total * 0.1);
  const strongSell = Math.floor(r() * total * 0.05);
  const hold = total - strongBuy - buy - sell - strongSell;

  const score = (strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1) / total;
  const consensus = score >= 4.5 ? 'Strong Buy' : score >= 3.5 ? 'Buy' : score >= 2.5 ? 'Hold' : score >= 1.5 ? 'Sell' : 'Strong Sell';

  return {
    strongBuy, buy, hold: Math.max(0, hold), sell, strongSell, total,
    averageScore: parseFloat(score.toFixed(2)),
    consensusRating: consensus,
    averagePriceTarget: undefined,
  };
}

export function generateMockAnalystRatings(symbol: string): AnalystRating[] {
  const r = rng(symbol + 'analysts');
  const firms = ['Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Bank of America', 'Citigroup', 'UBS', 'Deutsche Bank', 'Barclays', 'ICICI Securities', 'Kotak Securities', 'HDFC Securities', 'Motilal Oswal'];
  const ratings: AnalystRating['rating'][] = ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'];
  const count = 3 + Math.floor(r() * 8);
  const results: AnalystRating[] = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(r() * 90);
    results.push({
      symbol,
      firm: firms[Math.floor(r() * firms.length)],
      rating: ratings[Math.floor(r() * ratings.length)],
      priceTarget: parseFloat((50 + r() * 4000).toFixed(2)),
      date: format(subDays(new Date(), daysAgo), 'yyyy-MM-dd'),
    });
  }
  return results;
}

export function generateMarketSummary(market: 'india' | 'global', quotes: StockQuote[]): MarketSummary {
  const advancers = quotes.filter(q => q.change > 0).length;
  const decliners = quotes.filter(q => q.change < 0).length;
  const r = rng(market);

  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);

  return {
    market,
    indexName: market === 'india' ? 'NIFTY 50' : 'S&P 500',
    indexValue: market === 'india' ? 20000 + r() * 4000 : 4500 + r() * 1500,
    indexChange: (r() - 0.45) * 300,
    indexChangePercent: parseFloat(((r() - 0.45) * 2).toFixed(2)),
    advancers,
    decliners,
    unchanged: quotes.length - advancers - decliners,
    totalVolume: quotes.reduce((s, q) => s + q.volume, 0),
    topGainers: sorted.slice(0, 5),
    topLosers: sorted.slice(-5).reverse(),
    timestamp: Date.now(),
  };
}
