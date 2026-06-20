import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { useAlgoStore } from '@/store/algoStore';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { format, parseISO } from 'date-fns';

function MetricCard({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean | null }) {
  const color = good === null || good === undefined ? 'text-slate-200' : good ? 'text-green-400' : 'text-red-400';
  return (
    <div className="bg-[#0f1117]/60 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}</p>
      ))}
    </div>
  );
}

export function BacktestPanel() {
  const { strategies, activeStrategyId, backtestResult, backtestLoading, backtestSymbol, setBacktestSymbol, runBacktestAction, error } = useAlgoStore();
  const [showTrades, setShowTrades] = useState(false);

  const strategy = strategies.find(s => s.id === activeStrategyId) ?? strategies[0];
  const allStocks = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];
  const result = backtestResult;

  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <p className="text-sm font-medium">No strategy selected</p>
          <p className="text-xs mt-1">Go to Strategies tab and create one first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Config */}
      <Card>
        <CardHeader title={`Backtest: ${strategy.name}`} subtitle="Replay historical data through strategy logic" />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-500 mb-1 block">Symbol</label>
            <select
              value={backtestSymbol}
              onChange={e => setBacktestSymbol(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/60"
            >
              {allStocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
            </select>
          </div>
          <div className="pt-4">
            <button
              onClick={() => runBacktestAction(strategy.id, backtestSymbol)}
              disabled={backtestLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {backtestLoading ? '⏳ Running…' : '▶ Run Backtest'}
            </button>
          </div>
        </div>
      </Card>

      {backtestLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <div className="grid grid-cols-4 gap-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-16"/>)}</div>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">{error}</div>}

      {result && !backtestLoading && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MetricCard label="Total Return" value={`${result.totalReturnPercent > 0 ? '+' : ''}${result.totalReturnPercent.toFixed(2)}%`} good={result.totalReturnPercent > 0} />
            <MetricCard label="Annualised" value={`${result.annualizedReturn > 0 ? '+' : ''}${result.annualizedReturn.toFixed(1)}%`} good={result.annualizedReturn > 8} />
            <MetricCard label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} sub="risk-adj return" good={result.sharpeRatio > 1} />
            <MetricCard label="Max Drawdown" value={`-${result.maxDrawdownPercent.toFixed(1)}%`} good={result.maxDrawdownPercent < 15} />
            <MetricCard label="Win Rate" value={`${result.winRate.toFixed(0)}%`} sub={`${result.winningTrades}W / ${result.losingTrades}L`} good={result.winRate > 50} />
            <MetricCard label="Profit Factor" value={result.profitFactor.toFixed(2)} sub="gross profit/loss" good={result.profitFactor > 1.5} />
            <MetricCard label="Avg Win" value={`+${result.avgWin.toFixed(1)}%`} good={true} />
            <MetricCard label="Avg Loss" value={`-${result.avgLoss.toFixed(1)}%`} good={false} />
          </div>

          {/* Capital summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3">
              <p className="text-xs text-slate-500">Initial Capital</p>
              <p className="text-lg font-bold text-slate-300 tabular-nums">₹{result.initialCapital.toLocaleString()}</p>
            </div>
            <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3">
              <p className="text-xs text-slate-500">Final Capital</p>
              <p className={`text-lg font-bold tabular-nums ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{result.finalCapital.toLocaleString()}</p>
            </div>
            <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3">
              <p className="text-xs text-slate-500">Net P&L</p>
              <p className={`text-lg font-bold tabular-nums ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {result.totalReturn >= 0 ? '+' : ''}₹{result.totalReturn.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Equity curve */}
          <Card>
            <CardHeader title="Equity Curve" subtitle={`${result.startDate} → ${result.endDate}`} />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={result.equityCurve.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd"
                  tickFormatter={d => { try { return format(parseISO(d), 'MMM yy'); } catch { return d; } }} />
                <YAxis orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} width={52} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={result.initialCapital} stroke="#475569" strokeDasharray="4 2" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="equity" stroke={result.totalReturn >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2} fill={result.totalReturn >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'} dot={false} name="Portfolio Value" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Drawdown chart */}
          <Card>
            <CardHeader title="Drawdown" subtitle="% decline from peak equity" />
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={result.equityCurve.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd"
                  tickFormatter={d => { try { return format(parseISO(d), 'MMM yy'); } catch { return d; } }} />
                <YAxis orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={40}
                  tickFormatter={v => `-${v.toFixed(0)}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="rgba(239,68,68,0.1)" dot={false} name="Drawdown %" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Trade PnL distribution */}
          {result.trades.filter(t => t.side === 'sell').length > 0 && (
            <Card>
              <CardHeader title="Trade P&L Distribution" subtitle="Individual trade outcomes (%)" />
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={result.trades.filter(t => t.side === 'sell')} margin={{ top: 4, right: 16, bottom: 12, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#64748b' }} tickLine={false} axisLine={false}
                    tickFormatter={d => { try { return format(parseISO(d), 'MM/dd'); } catch { return d; } }} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="pnlPercent" name="P&L %">
                    {result.trades.filter(t => t.side === 'sell').map((t, i) => (
                      <Cell key={i} fill={t.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Trade log */}
          <Card>
            <CardHeader
              title={`Trade Log (${result.trades.filter(t => t.side === 'sell').length} completed trades)`}
              action={
                <button onClick={() => setShowTrades(!showTrades)} className="text-xs text-blue-400 hover:text-blue-300">
                  {showTrades ? 'Hide' : 'Show'}
                </button>
              }
            />
            {showTrades && (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2a2d3e]">
                      {['Date', 'Side', 'Price', 'Qty', 'P&L', 'Hold (d)', 'Reason'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} className="border-b border-[#2a2d3e]/40 hover:bg-[#252840]/30">
                        <td className="px-2 py-1.5 text-slate-400">{t.date}</td>
                        <td className="px-2 py-1.5">
                          <Badge variant={t.side === 'buy' ? 'green' : 'red'}>{t.side.toUpperCase()}</Badge>
                        </td>
                        <td className="px-2 py-1.5 text-slate-300 tabular-nums">{t.price.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-slate-400 tabular-nums">{t.quantity}</td>
                        <td className={`px-2 py-1.5 tabular-nums font-medium ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnlPercent.toFixed(1)}%
                        </td>
                        <td className="px-2 py-1.5 text-slate-500">{t.holdingDays}</td>
                        <td className="px-2 py-1.5 text-slate-500 max-w-[160px] truncate">{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
