import { useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Activity, Zap } from 'lucide-react';
import type { Market, StockQuote } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { formatVolume } from '@/utils/format';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StockCard } from '@/components/stock/StockRow';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardViewProps {
  market: Market;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Financials: '#22c55e',
  Healthcare: '#f59e0b',
  Energy: '#ef4444',
  'Consumer Staples': '#a855f7',
  'Consumer Discretionary': '#06b6d4',
  Materials: '#84cc16',
  Industrials: '#f97316',
  Utilities: '#64748b',
  Communication: '#ec4899',
};

export function DashboardView({ market }: DashboardViewProps) {
  const { indiaWatchlist, globalWatchlist, quotes, marketSummary, setSelectedSymbol } = useMarketStore();

  const watchlist = market === 'india' ? indiaWatchlist : globalWatchlist;
  const allStocks = market === 'india' ? INDIAN_STOCKS : GLOBAL_STOCKS;
  const summary = marketSummary[market];

  const quoteList = useMemo(() =>
    watchlist.map(w => quotes[w.symbol]).filter((q): q is StockQuote => Boolean(q)),
    [watchlist, quotes]
  );

  const topGainers = useMemo(() =>
    [...quoteList].sort((a, b) => b.changePercent - a.changePercent).slice(0, 6),
    [quoteList]
  );

  const topLosers = useMemo(() =>
    [...quoteList].sort((a, b) => a.changePercent - b.changePercent).slice(0, 6),
    [quoteList]
  );

  const highVolume = useMemo(() =>
    [...quoteList].sort((a, b) => b.volume - a.volume).slice(0, 6),
    [quoteList]
  );

  const sectorBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    watchlist.forEach(w => {
      const meta = allStocks.find(s => s.symbol === w.symbol);
      const sector = meta?.sector || 'Other';
      const q = quotes[w.symbol];
      if (!map[sector]) map[sector] = { count: 0, value: 0 };
      map[sector].count++;
      if (q?.marketCap) map[sector].value += q.marketCap;
    });
    return Object.entries(map)
      .map(([name, { count, value }]) => ({ name, count, value }))
      .sort((a, b) => b.count - a.count);
  }, [watchlist, allStocks, quotes]);

  const performanceData = useMemo(() => {
    return quoteList
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 12)
      .map(q => ({
        symbol: q.symbol.replace('.NS', '').replace('.L', '').slice(0, 6),
        change: q.changePercent,
        fill: q.changePercent >= 0 ? '#22c55e' : '#ef4444',
      }));
  }, [quoteList]);

  const stats = useMemo(() => {
    const gainers = quoteList.filter(q => q.changePercent > 0).length;
    const losers = quoteList.filter(q => q.changePercent < 0).length;
    const totalValue = quoteList.reduce((s, q) => s + (q.marketCap || 0), 0);
    const avgChange = quoteList.length > 0
      ? quoteList.reduce((s, q) => s + q.changePercent, 0) / quoteList.length
      : 0;
    return { gainers, losers, totalValue, avgChange };
  }, [quoteList]);

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const isIndia = market === 'india';
  const indexName = summary?.indexName || (isIndia ? 'NIFTY 50' : 'S&P 500');

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Market overview row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: indexName,
            value: summary ? summary.indexValue.toFixed(0) : '—',
            sub: summary ? <ChangeIndicator value={summary.indexChangePercent} isPercent showIcon size="sm" /> : null,
            icon: <Activity size={16} />,
            color: 'blue',
          },
          {
            label: 'Gainers',
            value: stats.gainers.toString(),
            sub: <span className="text-xs text-slate-500">in watchlist</span>,
            icon: <TrendingUp size={16} />,
            color: 'green',
          },
          {
            label: 'Losers',
            value: stats.losers.toString(),
            sub: <span className="text-xs text-slate-500">in watchlist</span>,
            icon: <TrendingDown size={16} />,
            color: 'red',
          },
          {
            label: 'Avg Change',
            value: `${stats.avgChange > 0 ? '+' : ''}${stats.avgChange.toFixed(2)}%`,
            sub: <span className="text-xs text-slate-500">{quoteList.length} stocks</span>,
            icon: <BarChart2 size={16} />,
            color: stats.avgChange >= 0 ? 'green' : 'red',
          },
        ].map(item => (
          <Card key={item.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${
                  item.color === 'green' ? 'text-green-400' :
                  item.color === 'red' ? 'text-red-400' :
                  item.color === 'blue' ? 'text-blue-400' : 'text-slate-200'
                }`}>{item.value}</p>
                <div className="mt-1">{item.sub}</div>
              </div>
              <div className={`p-2 rounded-lg ${
                item.color === 'green' ? 'bg-green-500/15 text-green-400' :
                item.color === 'red' ? 'bg-red-500/15 text-red-400' :
                'bg-blue-500/15 text-blue-400'
              }`}>
                {item.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance bar chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Today's Movers" subtitle="Top movers by absolute % change" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={performanceData} margin={{ top: 0, right: 0, bottom: 12, left: 0 }}>
                <XAxis dataKey="symbol" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} width={36} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Change']}
                  contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                  {performanceData.map((d, i) => (
                    <Cell key={i} fill={d.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Sector breakdown pie */}
        <Card>
          <CardHeader title="Sector Mix" subtitle="Watchlist by sector" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={sectorBreakdown.slice(0, 8)}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {sectorBreakdown.slice(0, 8).map((entry, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[entry.name] || '#475569'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v} stocks`, n]}
                contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {sectorBreakdown.slice(0, 6).map(s => (
              <div key={s.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s.name] || '#475569' }} />
                <span className="text-xs text-slate-500 truncate max-w-[70px]">{s.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Gainers / Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Top Gainers"
            action={<Badge variant="green">Today</Badge>}
          />
          <div className="grid grid-cols-2 gap-2">
            {topGainers.map(q => (
              <StockCard key={q.symbol} quote={q} onSelect={handleSelectStock} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Top Losers"
            action={<Badge variant="red">Today</Badge>}
          />
          <div className="grid grid-cols-2 gap-2">
            {topLosers.map(q => (
              <StockCard key={q.symbol} quote={q} onSelect={handleSelectStock} />
            ))}
          </div>
        </Card>
      </div>

      {/* High volume */}
      <Card>
        <CardHeader
          title="High Volume Stocks"
          subtitle="Unusual activity today"
          action={<Badge variant="yellow"><Zap size={10} className="mr-1 inline" />Active</Badge>}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {highVolume.map(q => (
            <div
              key={q.symbol}
              onClick={() => handleSelectStock(q.symbol)}
              className="bg-[#0f1117] rounded-lg p-2.5 cursor-pointer hover:bg-[#1a1d26] transition-colors border border-[#2a2d3e]/50"
            >
              <p className="text-xs font-bold text-slate-200 mb-0.5">{q.symbol.replace('.NS', '').replace('.L', '')}</p>
              <p className="text-xs text-slate-400 tabular-nums">{formatVolume(q.volume)}</p>
              <ChangeIndicator value={q.changePercent} isPercent showIcon={false} size="sm" />
            </div>
          ))}
        </div>
      </Card>

      {/* Sector performance table */}
      <Card>
        <CardHeader title="Sector Performance" />
        <div className="space-y-2">
          {sectorBreakdown.map(({ name, count }) => {
            const sectorStocks = watchlist
              .map(w => ({ entry: w, meta: allStocks.find(s => s.symbol === w.symbol), quote: quotes[w.symbol] }))
              .filter(r => r.meta?.sector === name && r.quote);
            const avgChange = sectorStocks.length > 0
              ? sectorStocks.reduce((s, r) => s + (r.quote?.changePercent || 0), 0) / sectorStocks.length
              : 0;
            const color = SECTOR_COLORS[name] || '#475569';
            const isUp = avgChange >= 0;

            return (
              <div key={name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-400 w-36 truncate">{name}</span>
                <div className="flex-1 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.abs(avgChange) * 10)}%`,
                      backgroundColor: isUp ? '#22c55e' : '#ef4444',
                    }}
                  />
                </div>
                <span className={`text-xs font-medium w-14 text-right tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-600 w-12 text-right">{count} stocks</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
