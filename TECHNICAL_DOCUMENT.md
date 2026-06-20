# StockWatch — Technical Documentation
**Version:** 1.0.0 | **Stack:** React 19 + TypeScript + Vite + Zustand + Recharts + Tailwind CSS v4

---

## Table of Contents
1. [Application Overview](#1-application-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Service Layer](#5-service-layer)
6. [State Management](#6-state-management)
7. [Technical Analysis Engine](#7-technical-analysis-engine)
8. [Prediction Model](#8-prediction-model)
9. [Caching Strategy](#9-caching-strategy)
10. [UI Component Architecture](#10-ui-component-architecture)
11. [Real-Time Data Integration Guide](#11-real-time-data-integration-guide)
12. [API Provider Recommendations](#12-api-provider-recommendations)
13. [WebSocket Integration Plan](#13-websocket-integration-plan)
14. [Production Upgrade Checklist](#14-production-upgrade-checklist)
15. [Performance & Scalability Notes](#15-performance--scalability-notes)

---

## 1. Application Overview

StockWatch is a **client-side React application** for tracking and analyzing stocks across two separate market universes:

| Market | Exchanges Covered | Default Watchlist |
|---|---|---|
| Indian Market 🇮🇳 | NSE, BSE | 20 NIFTY-50 + Midcap stocks |
| Global Market 🌍 | NYSE, NASDAQ, LSE, SGX | 20 S&P 500 + International stocks |

### Core Feature Set
- **Dual-market watchlists** (up to 500 stocks per market, persisted to localStorage)
- **Real-time quote polling** with in-memory TTL cache
- **Technical indicators:** SMA (20/50/200), EMA (12/26), RSI (14), MACD (12,26,9), Bollinger Bands (20,2), Stochastic (14,3), ATR (14), OBV
- **Fundamental metrics:** P/E, EPS, P/B, P/S, EV/EBITDA, D/E, ROE, ROA, margins, revenue growth
- **News sentiment analysis** with per-article scoring
- **Analyst ratings** with consensus summary
- **2-week growth prediction model** using 15+ weighted signals
- **Interactive charts:** OHLCV price chart, RSI, MACD, Bollinger, Stochastic with period toggles

---

## 2. Technology Stack

```
Frontend Framework   React 19.2.6 + TypeScript 6.0
Build Tool           Vite 8.0
Styling              Tailwind CSS v4 (@tailwindcss/vite plugin)
State Management     Zustand 5.0 with persist middleware (localStorage)
Charts               Recharts 3.8
Icons                Lucide React 1.21
Date Utilities       date-fns 4.4
HTTP Client          Native fetch (with AbortController timeout wrapper)
Path Resolution      TS paths alias  @/* → src/*
```

### Key Design Decisions
- **No backend server** — all data fetched client-side via public APIs with mock fallback
- **Two screens, never unmounted** — both MarketScreen instances stay mounted, toggled via CSS `hidden`, preserving React state without remounts
- **Deterministic mock data** — seeded RNG keyed by symbol ensures mocks are stable per session, preventing layout shifts on fallback
- **TTL cache in memory** — avoids redundant API calls within a session; watchlist state in localStorage survives refreshes

---

## 3. Project Structure

```
src/
├── App.tsx                          # Root — mounts Navbar + dual MarketScreen
├── main.tsx                         # React DOM entry point
├── index.css                        # Tailwind v4 import + global CSS vars + animations
│
├── types/
│   └── index.ts                     # All shared TypeScript interfaces
│
├── data/
│   ├── indianStocks.ts              # 50 NSE/BSE stocks (symbol, name, exchange, sector)
│   └── globalStocks.ts              # 50 NYSE/NASDAQ/LSE/SGX stocks
│
├── services/
│   ├── cache.ts                     # In-memory TTL cache (Map-based, max 1000 entries)
│   ├── mockData.ts                  # Seeded-RNG mock generator for all data types
│   ├── technicalAnalysis.ts         # Pure-function indicator engine (SMA/EMA/RSI/MACD/BB/ATR/OBV/Stoch)
│   ├── prediction.ts                # 2-week weighted-signal prediction model
│   └── stockService.ts              # Data fetch orchestrator (Yahoo Finance → mock fallback)
│
├── store/
│   └── marketStore.ts               # Single Zustand store; persisted watchlists
│
├── screens/
│   └── MarketScreen.tsx             # Per-market shell: summary bar + tab router + detail pane
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx               # Brand + market switcher (India / Global)
│   ├── charts/
│   │   ├── PriceChart.tsx           # OHLCV ComposedChart with MA/BB overlays + volume
│   │   └── TechnicalCharts.tsx      # RSIChart, MACDChart, BollingerChart, StochasticChart
│   ├── dashboard/
│   │   ├── DashboardView.tsx        # Summary KPIs, movers bar chart, sector pie, gainers/losers
│   │   └── MarketSummaryBar.tsx     # Index value + A/D ratio + ticker strip
│   ├── stock/
│   │   ├── WatchlistTable.tsx       # Sortable/filterable watchlist with add/remove
│   │   ├── StockRow.tsx             # Table row + compact StockCard + mini SVG sparkline
│   │   ├── StockDetailView.tsx      # 5-tab detail pane (Chart/Technical/Fundamentals/News/Prediction)
│   │   ├── TechnicalPanel.tsx       # Indicator table with Bullish/Bearish/Neutral verdicts
│   │   ├── FundamentalsPanel.tsx    # Metrics with color-coded benchmarks + margin gauges
│   │   ├── NewsPanel.tsx            # Sentiment list with bar scores
│   │   └── PredictionPanel.tsx      # 2-week forecast with confidence gauge + signal breakdown
│   └── ui/
│       ├── Badge.tsx                # Colored pill badges
│       ├── Card.tsx                 # Consistent dark-theme card wrapper
│       ├── ChangeIndicator.tsx      # +/− colored value with trend icon
│       ├── LoadingSkeleton.tsx      # Shimmer skeletons (table row, card, chart)
│       ├── SearchBar.tsx            # Input with clear button
│       └── Tooltip.tsx              # Hover tooltip (position-aware)
│
└── utils/
    └── format.ts                    # formatPrice, formatVolume, formatMarketCap, timeAgo, clsx
```

---

## 4. Data Flow Architecture

```
User Action (refresh / select stock / switch market)
        │
        ▼
  marketStore.ts  (Zustand action)
        │
        ├─── getBatchQuotes()  ──────────────────────────────────────┐
        │         │                                                   │
        │         ├── cacheService.get("quote:SYMBOL")               │
        │         │       │ HIT → return cached StockQuote           │
        │         │       │ MISS ↓                                   │
        │         │   fetchYahooQuote(symbol)                        │
        │         │       │ SUCCESS → cache(TTL=2min) → return       │
        │         │       │ FAIL ↓                                   │
        │         │   generateMockQuote(symbol) → cache → return     │
        │         │                                                   │
        │         └── Update store.quotes{}                          │
        │                                                            │
        ├─── loadStockDetail(symbol)                                  │
        │         │                                                   │
        │         ├── getQuote + getHistorical + getFundamentals      │
        │         │   + getNews + getRatings (parallel Promise.all)   │
        │         │                                                   │
        │         ├── computeIndicators(historical)                  │
        │         │   (pure function, no API call)                   │
        │         │                                                   │
        │         └── generatePrediction(inputs)                     │
        │               (pure function, no API call)                 │
        │                                                            │
        └── React component re-render via Zustand subscription       │
                  │                                                   │
                  └── Recharts / panels read from store.quotes{}     ◄┘
                        & store.stockDetails{}
```

---

## 5. Service Layer

### stockService.ts — Public Interfaces

```typescript
getQuote(symbol, market, name, exchange)  → Promise<StockQuote>
getHistorical(symbol, days?)              → Promise<OHLCVData[]>
getFundamentals(symbol)                   → Promise<FundamentalMetrics>
getNews(symbols[])                        → Promise<NewsItem[]>
getRatings(symbol)                        → Promise<RatingsSummary>
getMarketSummary(market, quotes[])        → Promise<MarketSummary>
getBatchQuotes(stocks[], market)          → Promise<StockQuote[]>
getFullStockData(symbol, market, ...)     → Promise<StockDetailData>
```

### Current Data Sources

| Data Type | Source | Fallback | Cache TTL |
|---|---|---|---|
| Quote (price/vol/change) | Yahoo Finance v7 `/quote` | Mock (seeded RNG) | 2 min |
| OHLCV History | Yahoo Finance v8 `/chart` | Mock (200 bars) | 1 hour |
| Fundamentals | _Mock only_ | Mock | 6 hours |
| News | _Mock only_ | Mock | 15 min |
| Analyst Ratings | _Mock only_ | Mock | 6 hours |
| Market Summary | Derived from watchlist quotes | — | On refresh |

> **⚠️ Current Limitation:** Fundamentals, news, and ratings are **fully mocked**. To show real values, swap the mock calls in `stockService.ts` with authenticated API calls (see Section 12).

---

## 6. State Management

### Zustand Store Shape (`marketStore.ts`)

```typescript
// Persisted to localStorage (survives page refresh)
indiaWatchlist:   WatchlistEntry[]    // up to 500 entries
globalWatchlist:  WatchlistEntry[]
activeMarket:     'india' | 'global'

// In-memory (reset on page load)
quotes:           Record<symbol, StockQuote>
stockDetails:     Record<symbol, StockDetailData>
marketSummary:    Record<Market, MarketSummary | null>
news:             NewsItem[]
loading:          { quotes, detail, summary, news }
error:            string | null
searchQuery:      string
sortField:        keyof StockQuote
sortDir:          'asc' | 'desc'
filterSector:     string
```

### WatchlistEntry Schema
```typescript
interface WatchlistEntry {
  symbol:      string;      // e.g. "RELIANCE.NS"
  market:      Market;
  addedAt:     number;      // epoch ms
  notes?:      string;      // user annotation
  alertPrice?: number;      // price trigger shown as Bell icon
}
```

---

## 7. Technical Analysis Engine

All indicators are implemented as **pure TypeScript functions** in `src/services/technicalAnalysis.ts`. No external TA library is used — this keeps the bundle lean and allows full control.

### Implemented Indicators

| Indicator | Function | Period Default |
|---|---|---|
| Simple Moving Average | `sma(data, period)` | 20, 50, 200 |
| Exponential Moving Average | `ema(data, period)` | 12, 26 |
| Relative Strength Index | `rsi(closes, period)` | 14 |
| MACD | `macd(closes, fast, slow, signal)` | 12, 26, 9 |
| Bollinger Bands | `bollingerBands(closes, period, stdDev)` | 20, 2σ |
| Average True Range | `atr(ohlcv, period)` | 14 |
| On-Balance Volume | `obv(closes, volumes)` | — |
| Stochastic Oscillator | `stochastic(ohlcv, k, d)` | 14, 3 |

### Entry Point Functions
```typescript
// Returns latest scalar value for each indicator (used in TechnicalPanel)
computeIndicators(data: OHLCVData[]): TechnicalIndicators

// Returns full time-series arrays (used in chart components)
computeIndicatorSeries(data: OHLCVData[]): {
  dates, closes, volumes,
  sma20, sma50, sma200, ema12, ema26,
  rsi, macdLine, macdSignal, macdHistogram,
  bbUpper, bbMiddle, bbLower, obv
}
```

### RSI Implementation Note
Uses Wilder's smoothing method (EMA-based rolling average of gains/losses), which matches TradingView and most professional platforms. Seed period = average of first 14 bars.

### MACD Signal Line
Signal is a 9-period EMA of the MACD line. Histogram = MACD − Signal. Values before the slow EMA period (26 + 9 = 35 bars) are `null`.

---

## 8. Prediction Model

**File:** `src/services/prediction.ts`  
**Horizon:** 14 calendar days  
**Output:** estimated % return + confidence score (0–100) + signal list

### Signal Inventory (15 signals, weighted)

| Signal | Weight | Bullish Condition | Bearish Condition |
|---|---|---|---|
| RSI (14) | 1.5 | RSI < 30 (oversold) | RSI > 70 (overbought) |
| MACD Histogram | 1.5 | Histogram > 0 | Histogram < 0 |
| Price vs SMA50 | 1.2 | Price > SMA50 | Price < SMA50 |
| 5/20-Day Momentum | 1.2 | Positive returns | Negative returns |
| Revenue Growth YoY | 1.2 | > 10% growth | < 0% growth |
| Golden/Death Cross | 1.0 | SMA50 > SMA200 | SMA50 < SMA200 |
| P/E Ratio | 1.0 | P/E < 10 (cheap) | P/E > 50 (expensive) |
| Bollinger Position | 1.0 | Near lower band | Near upper band |
| News Sentiment | 1.0 | Avg score > 0.1 | Avg score < -0.1 |
| Analyst Consensus | 1.0 | Score ≥ 4.0 (Buy) | Score ≤ 2.0 (Sell) |
| Volume Trend | 0.8 | Rising vol + price up | Rising vol + price down |
| Stochastic %K | 0.8 | %K < 20 | %K > 80 |
| ROE | 0.8 | ROE > 15% | ROE < 0% |
| Debt/Equity | 0.7 | D/E < 0.5 | D/E > 3.0 |

### Scoring Formula
```
normalizedScore = Σ(signal_score × weight) / Σ(weight)

volatility = ATR14 / currentPrice   (or rolling 20-day σ from returns)
annualizedVol = volatility × √252
periodVol = annualizedVol × √(14/252)

estimatedGrowth% = normalizedScore × periodVol × 2.5 × 100
predictedPrice = currentPrice × (1 + estimatedGrowth/100)

confidence = (avgSignalAccuracy × 0.30
            + signalAgreement   × 0.50
            + dataQuality       × 0.20) × 100
```

### Confidence Interpretation
| Score | Meaning |
|---|---|
| 70–100% | High — strong multi-signal agreement with sufficient history |
| 50–69% | Medium — mixed signals or limited data |
| 10–49% | Low — conflicting signals; treat as speculative |

> **Disclaimer:** This is a statistical scoring model for educational purposes. It does not constitute financial advice and does not guarantee future performance.

---

## 9. Caching Strategy

### In-Memory Cache (`src/services/cache.ts`)
- **Structure:** `Map<string, {data, timestamp, ttl}>` — O(1) get/set
- **Max entries:** 1,000 (LRU-style eviction of oldest key when full)
- **Invalidation:** TTL-based (checked on every `get()`)
- **Lifetime:** Session only (cleared on page reload)

### Cache Key Conventions
```
quote:{SYMBOL}                  → StockQuote       TTL: 2 min
hist:{SYMBOL}:{DAYS}            → OHLCVData[]      TTL: 1 hour
fund:{SYMBOL}                   → FundamentalMetrics TTL: 6 hours
news:{SYM1},{SYM2},...          → NewsItem[]       TTL: 15 min
ratings:{SYMBOL}                → RatingsSummary   TTL: 6 hours
```

### Persistent State (localStorage via Zustand `persist`)
```
Key: stockmarket-app-storage
Fields: indiaWatchlist, globalWatchlist, activeMarket
```

---

## 10. UI Component Architecture

### Component Hierarchy
```
App
└── Navbar                        (market switcher, refresh button)
└── MarketScreen (×2, India/Global)
    ├── MarketSummaryBar          (index, A/D, volume, top movers ticker)
    ├── Tab bar [Dashboard | Watchlist | News]
    ├── DashboardView
    │   ├── Stat cards (index / gainers / losers / avg change)
    │   ├── BarChart (top movers)
    │   ├── PieChart (sector mix)
    │   ├── StockCard grid (top gainers, top losers, high volume)
    │   └── Sector performance table
    ├── WatchlistTable
    │   ├── SearchBar + sector filter + refresh + add-stock panel
    │   └── StockRow × N (symbol, price, change, vol, mktcap, sparkline)
    ├── NewsPanel (sentiment list)
    └── StockDetailView (slide-in pane, expandable)
        ├── Header (symbol, name, exchange badge, price, OHLV stats)
        ├── Tabs [Chart | Technical | Fundamentals | News | Prediction]
        ├── PriceChart (OHLCV + overlays + volume)
        ├── RSIChart / MACDChart / BollingerChart / StochasticChart
        ├── TechnicalPanel (indicator table with signal verdicts)
        ├── FundamentalsPanel (valuation, growth, profitability, balance sheet)
        ├── NewsPanel (filtered to selected symbol)
        └── PredictionPanel (2-week forecast + confidence gauge + signal list)
```

### Theming (CSS Custom Properties)
```css
--bg-primary:    #0f1117    /* page background */
--bg-secondary:  #1a1d26    /* navbar, tab bars */
--bg-card:       #1e2130    /* card surfaces */
--bg-hover:      #252840    /* hover states */
--border:        #2a2d3e    /* all borders */
--text-primary:  #e2e8f0
--text-secondary:#94a3b8
--text-muted:    #64748b
--accent-green:  #22c55e    /* positive change */
--accent-red:    #ef4444    /* negative change */
--india-orange:  #ff6b35    /* India market accent */
--global-blue:   #2563eb    /* Global market accent */
```

---

## 11. Real-Time Data Integration Guide

### Current State vs. Real-Time Gap

| Capability | Current | Real-Time Target |
|---|---|---|
| Quote refresh | Manual button / on mount | WebSocket push (< 1s latency) |
| Quote frequency | 2-min cache | 250ms–1s streaming ticks |
| Fundamentals | Mock data | Scheduled batch (daily) API pull |
| News | Mock data | Webhook / polling every 5 min |
| Analyst ratings | Mock data | Daily batch update |
| Index values | Derived from watchlist avg | Dedicated index WebSocket feed |
| Pre/Post market | Not supported | Extended hours flag on quotes |

### Integration Points in `stockService.ts`

Three functions need to be replaced for real-time quotes:

```typescript
// ① Replace fetchYahooQuote() for live REST polling
async function fetchYahooQuote(symbol: string): Promise<StockQuote | null>
// → Swap with your live API call (Finnhub, Polygon, Upstox, etc.)

// ② Replace fetchYahooHistorical() for OHLCV bars
async function fetchYahooHistorical(symbol, days): Promise<OHLCVData[] | null>
// → Swap with your OHLCV historical endpoint

// ③ Add a new WebSocket manager (see Section 13)
// → Push updates directly into marketStore.quotes{}
```

For fundamentals, news, ratings — replace the `generateMock*` calls in:
- `getFundamentals()` → live API
- `getNews()` → live API
- `getRatings()` → live API

---

## 12. API Provider Recommendations

### Indian Market (NSE / BSE)

#### Option A — Upstox API ⭐ Recommended
- **Coverage:** NSE + BSE + F&O + options chain
- **Real-time:** WebSocket feed (QUOTE, FULL mode)
- **Free tier:** Paper trading account, limited symbols
- **Paid:** Upstox Developer API subscription
- **Endpoints used:**
  ```
  GET  /v2/market-quote/quotes?symbol={exchange}|{symbol}
  GET  /v2/historical-candle/{symbol}/{interval}/{to}/{from}
  WSS  /v3/feeds
  ```
- **Auth:** OAuth 2.0 access token (15-min TTL, refresh token flow)
- **Docs:** `upstox.com/developer/api-documentation`

#### Option B — Zerodha Kite Connect
- **Coverage:** Full NSE + BSE, streaming WebSocket
- **Free tier:** None (₹2,000/month)
- **Strengths:** Very stable, widely used in India, excellent docs
- **WebSocket:** Binary protocol (LTP, Quote, Full mode) up to 3,000 instruments
- **Docs:** `kite.trade/docs/connect/v3`

#### Option C — Angel One SmartAPI (Free)
- **Coverage:** NSE + BSE + MCX
- **Free tier:** Yes, after Angel One demat account
- **Real-time:** WebSocket streaming
- **Docs:** `smartapi.angelbroking.com/docs`

#### Option D — NSE India (Unofficial Scraping)
- **URL:** `https://www.nseindia.com/api/quote-equity?symbol={SYMBOL}`
- **Auth:** Session cookie from `nseindia.com` (cookie rotation required)
- **Rate limit:** ~1 req/sec per IP, block risk
- **Recommendation:** Use only for bootstrapping/testing, not production

#### Option E — Alpha Vantage (for Indian stocks)
- **Symbols:** Use `NSE:SYMBOL` format (e.g. `NSE:RELIANCE`)
- **Free tier:** 25 req/day (insufficient for 500 stocks)
- **Paid:** $50/month (120 req/min)
- **Docs:** `alphavantage.co/documentation`

---

### Global Market (NYSE / NASDAQ / LSE / SGX)

#### Option A — Finnhub ⭐ Recommended for WebSocket
- **Coverage:** US, EU, Asia markets + crypto
- **Free tier:** 60 API calls/min, 1 WebSocket connection, 50 symbols
- **Paid:** $50/month (300 calls/min, unlimited symbols)
- **Real-time WebSocket:**
  ```
  wss://ws.finnhub.io?token={API_KEY}
  // Subscribe:  {"type":"subscribe","symbol":"AAPL"}
  // Tick event: {"type":"trade","data":[{"p":150.5,"s":"AAPL","t":1700000,"v":100}]}
  ```
- **REST endpoints:**
  ```
  GET /api/v1/quote?symbol={SYMBOL}&token={KEY}
  GET /api/v1/stock/candle?symbol={SYMBOL}&resolution=D&from={}&to={}
  GET /api/v1/company-news?symbol={SYMBOL}&from={}&&to={}
  GET /api/v1/stock/recommendation?symbol={SYMBOL}
  ```
- **Docs:** `finnhub.io/docs/en`

#### Option B — Polygon.io ⭐ Recommended for US stocks
- **Coverage:** US equities, forex, crypto; LSE available on higher tiers
- **Free tier:** Unlimited historical (15-min delayed), no WebSocket
- **Paid:** $29/month (real-time, unlimited API calls)
- **WebSocket:**
  ```
  wss://socket.polygon.io/stocks
  // Subscribe: {"action":"subscribe","params":"T.AAPL"}   (T = trades)
  // Tick:      {"ev":"T","sym":"AAPL","p":150.5,"s":100,"t":1700000}
  ```
- **Docs:** `polygon.io/docs/stocks`

#### Option C — Yahoo Finance (current — no auth)
- **Coverage:** Global (200+ exchanges)
- **Limitations:** No WebSocket, undocumented API, CORS-blocked in browser (needs proxy), rate-limited
- **Status:** Works for historical OHLCV + delayed quotes but unreliable for production

#### Option D — IEX Cloud
- **Coverage:** US equities only
- **Free tier:** 500,000 message units/month
- **Paid:** $9/month (5M units)
- **SSE streaming:** `https://cloud-sse.iexapis.com/stable/stocksUSNoUTP?token={KEY}&symbols=AAPL`
- **Docs:** `iexcloud.io/documentation`

#### Option E — Alpha Vantage Global
- **Coverage:** NYSE, NASDAQ, LSE, TSX, Euronext
- **Free tier:** 25 req/day
- **Paid:** $50/month (120 req/min)

#### Option F — Twelve Data
- **Coverage:** 70+ exchanges including LSE, SGX
- **Free tier:** 800 req/day, 8 req/min WebSocket
- **WebSocket:**
  ```
  wss://ws.twelvedata.com/v1/quotes/price?apikey={KEY}
  // Subscribe: {"action":"subscribe","params":{"symbols":"AAPL,GOOGL"}}
  ```
- **Docs:** `twelvedata.com/docs`

---

### Provider Comparison Matrix

| Provider | Market | Free Tier | WebSocket | Fundamentals | News | Cost |
|---|---|---|---|---|---|---|
| **Upstox** | NSE/BSE | Limited | Yes | Yes | No | ~₹999/mo |
| **Zerodha Kite** | NSE/BSE | No | Yes | Partial | No | ₹2,000/mo |
| **Angel SmartAPI** | NSE/BSE | Yes | Yes | Partial | No | Free |
| **Finnhub** | Global | 60/min | Yes | Yes | Yes | $0–$50/mo |
| **Polygon.io** | US | Free/delayed | Yes (paid) | No | No | $0–$29/mo |
| **IEX Cloud** | US | 500K units | SSE | Yes | Yes | $0–$9/mo |
| **Twelve Data** | Global | 800/day | Yes | Yes | No | $0–$29/mo |
| **Alpha Vantage** | Global+NSE | 25/day | No | Yes | No | $0–$50/mo |
| **Yahoo Finance** | Global | Unlimited* | No | Partial | No | Free* |

\* Yahoo Finance is unofficial and unreliable for production.

---

## 13. WebSocket Integration Plan

### Architecture for Real-Time Streaming

The current polling architecture needs to be extended with a **WebSocket manager** that pushes ticks directly into the Zustand store.

#### Step 1 — Create `src/services/websocketService.ts`

```typescript
// Pattern: singleton WebSocket manager per market
type TickCallback = (symbol: string, price: number, change: number, volume: number) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<TickCallback>>();
  private reconnectDelay = 1000;
  private apiKey: string;
  private endpoint: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  connect(onTick: TickCallback) {
    this.ws = new WebSocket(`${this.endpoint}?token=${this.apiKey}`);

    this.ws.onopen = () => {
      // Resubscribe all tracked symbols
      this.subscribers.forEach((_, symbol) => this.subscribe(symbol));
      this.reconnectDelay = 1000; // reset backoff
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // --- Finnhub format ---
      if (msg.type === 'trade') {
        msg.data.forEach((tick: any) => {
          onTick(tick.s, tick.p, 0, tick.v); // symbol, price, change, volume
        });
      }
      // --- Polygon format ---
      if (Array.isArray(msg)) {
        msg.filter(m => m.ev === 'T').forEach((tick: any) => {
          onTick(tick.sym, tick.p, 0, tick.s);
        });
      }
    };

    this.ws.onclose = () => {
      // Exponential backoff reconnect
      setTimeout(() => this.connect(onTick), this.reconnectDelay);
      this.reconnectDelay = Math.min(30000, this.reconnectDelay * 2);
    };

    this.ws.onerror = () => this.ws?.close();
  }

  subscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Finnhub format:
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  unsubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
    this.subscribers.delete(symbol);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton instances
export const globalWsManager = new WebSocketManager(
  'wss://ws.finnhub.io', import.meta.env.VITE_FINNHUB_KEY
);
// For Indian market, use Upstox WebSocket per their docs
```

#### Step 2 — Wire into Zustand store (`marketStore.ts`)

Add a new action `connectWebSocket(market)`:

```typescript
connectWebSocket: (market) => {
  const manager = market === 'global' ? globalWsManager : indiaWsManager;
  const watchlist = market === 'india' ? get().indiaWatchlist : get().globalWatchlist;

  manager.connect((symbol, price, _change, volume) => {
    set(state => {
      const existing = state.quotes[symbol];
      if (!existing) return state;
      const change = price - existing.previousClose;
      return {
        quotes: {
          ...state.quotes,
          [symbol]: {
            ...existing,
            price,
            change,
            changePercent: (change / existing.previousClose) * 100,
            volume,
            timestamp: Date.now(),
          }
        }
      };
    });
  });

  // Subscribe all watchlist symbols
  watchlist.forEach(w => manager.subscribe(w.symbol));
},
```

#### Step 3 — Environment Variables (`.env.local`)

```bash
VITE_FINNHUB_KEY=your_finnhub_api_key
VITE_UPSTOX_ACCESS_TOKEN=your_upstox_access_token
VITE_POLYGON_KEY=your_polygon_api_key
VITE_ALPHA_VANTAGE_KEY=your_alpha_vantage_key
VITE_TWELVE_DATA_KEY=your_twelve_data_key
```

> **Security note:** Environment variables prefixed with `VITE_` are embedded in the client bundle. For production, proxy all API calls through your own backend or a Vercel/Cloudflare Edge Function to hide API keys.

#### Step 4 — Update `MarketScreen.tsx` to call `connectWebSocket`

```typescript
useEffect(() => {
  refreshQuotes(market);
  refreshNews(market);
  connectWebSocket(market);    // ← add this
  return () => disconnectWebSocket(market);  // cleanup on unmount
}, [market]);
```

---

## 14. Production Upgrade Checklist

### Data Layer
- [ ] Replace `fetchYahooQuote` with authenticated Finnhub/Polygon REST call
- [ ] Replace `fetchYahooHistorical` with authenticated historical OHLCV endpoint
- [ ] Replace `generateMockFundamentals` with Finnhub `/stock/profile2` + `/financials` endpoints
- [ ] Replace `generateMockNews` with Finnhub `/company-news` or NewsAPI
- [ ] Replace `generateMockRatings` with Finnhub `/stock/recommendation`
- [ ] Add Indian market live quotes via Upstox/Angel SmartAPI
- [ ] Add Indian market historical OHLCV via Upstox
- [ ] Implement WebSocket streaming for real-time ticks (see Section 13)
- [ ] Add proxy backend (Node/Cloudflare) to hide API keys

### Caching Upgrades
- [ ] Persist quote cache to `sessionStorage` (survives soft navigation)
- [ ] Add Redis or Cloudflare KV for server-side response caching
- [ ] Implement batch Yahoo/Finnhub symbol fetching (fewer HTTP round-trips)

### App Features
- [ ] Add price alert notifications (Web Notifications API)
- [ ] Add portfolio P&L tracking (cost basis + holdings)
- [ ] Add intraday 1-min/5-min candlestick chart view
- [ ] Add options chain viewer (NSE F&O + US options)
- [ ] Add screener / filter by custom criteria (e.g. RSI < 30 AND P/E < 15)
- [ ] Add comparison view (overlay multiple stock price series)
- [ ] Add export to CSV / Excel

### Reliability
- [ ] Add error boundary components around charts and panels
- [ ] Add retry logic with exponential backoff on API failures
- [ ] Add WebSocket reconnection with symbol re-subscription
- [ ] Add market hours detection (skip polling when NSE/NYSE is closed)
- [ ] Add rate-limit tracking to prevent API key suspension

### Security
- [ ] Move all API keys to a backend proxy (never expose in client bundle)
- [ ] Add CSP (Content Security Policy) headers
- [ ] Sanitize any user-supplied input (notes / alert prices)

---

## 15. Performance & Scalability Notes

### Current Bottlenecks

**1. Batch quote fetching**
- `getBatchQuotes()` fetches 10 symbols at a time sequentially in a for-loop
- For 500 symbols: 50 batches × ~300ms/batch = ~15 seconds cold load
- **Fix:** Parallelise batches with a concurrency limiter (e.g. p-limit) or switch to WebSocket streaming

**2. `computeIndicators()` on every `loadStockDetail()`**
- Called synchronously on the main thread with up to 200 bars
- For 200 bars: ~2ms per symbol → negligible for single stocks
- **Fix if needed:** Move to a Web Worker for bulk pre-computation

**3. Chart re-renders**
- `PriceChart` recomputes `computeIndicatorSeries()` inside `useMemo` — already memoised by `data` reference
- No issue for ≤ 200 bars; if extended to 1,000+ bars, use canvas-based chart (ECharts/TradingView Lightweight Charts)

**4. Zustand quote store updates**
- On WebSocket ticks (one per symbol per second × 500 symbols): 500 `set()` calls/sec
- Zustand batches React renders via microtask scheduling, so this will not cause 500 re-renders/sec
- **Recommendation:** Debounce quote updates to max 1Hz per symbol in the WebSocket callback

### Recommended Quote Update Rate by Data Type

| Data | Suggested Refresh | Mechanism |
|---|---|---|
| Live quote (price/vol) | Real-time push (< 1s) | WebSocket |
| Quote (non-WS fallback) | 15-second poll | setInterval |
| Index values (NIFTY/S&P) | 5-second push | WebSocket |
| OHLCV history | Once on detail open | REST, 1-hour cache |
| Fundamentals | Once per session | REST, 6-hour cache |
| News | Every 5 minutes | REST poll |
| Analyst ratings | Once per session | REST, 6-hour cache |
| Prediction | On each data refresh | Client-side compute |

### Scaling to 500 Stocks

| Concern | Mitigation |
|---|---|
| Finnhub free tier limits to 50 WS symbols | Use paid tier ($50/mo) or batch REST every 15s |
| Upstox WS supports 3,000 instruments | Sufficient for 500 Indian stocks |
| localStorage limit (~5MB) | Watchlists are symbol strings only — ~50KB for 500 entries |
| Memory for 500 StockQuote objects | ~500 × 400 bytes = ~200KB — negligible |
| Recharts DOM nodes for 50-row table | Use virtualised list (react-window) if > 200 visible rows |

---

*Document generated for StockWatch v1.0.0 — React 19 + TypeScript + Vite*  
*Last updated: June 2026*
