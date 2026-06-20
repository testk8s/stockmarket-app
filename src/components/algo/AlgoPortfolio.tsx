import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAlgoStore } from '@/store/algoStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

function StatCard({ label, value, sub, color = 'text-slate-200' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AlgoPortfolio() {
  const { portfolioStats, strategies, positions, orders, capitalTotal } = useAlgoStore();
  const stats = portfolioStats();
  const sym = '₹'; // paper account in INR

  // Strategy performance breakdown
  const stratPerf = strategies.map(s => {
    const stratOrders = orders.filter(o => o.strategyId === s.id && o.pnl !== undefined);
    const pnl = stratOrders.reduce((acc, o) => acc + (o.pnl ?? 0), 0);
    const wins = stratOrders.filter(o => (o.pnl ?? 0) > 0).length;
    return { name: s.name, pnl, orders: stratOrders.length, winRate: stratOrders.length ? (wins / stratOrders.length * 100) : 0, status: s.status };
  });

  // Position allocation pie data
  const positionData = positions.map(p => ({
    name: p.symbol.replace('.NS','').replace('.L',''),
    value: p.quantity * p.currentPrice,
  }));
  const cashData = [{ name: 'Cash', value: stats.availableCapital }];
  const pieData = [...positionData, ...cashData];

  // Simulated equity history from orders
  let runningCap = capitalTotal;
  const equityHistory = orders.slice().reverse().map(o => {
    if (o.pnl) runningCap += o.pnl;
    return { date: new Date(o.createdAt).toLocaleDateString(), equity: runningCap };
  }).slice(-30);

  const deployedPct = capitalTotal > 0 ? (stats.deployedCapital / capitalTotal * 100).toFixed(1) : '0';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Capital" value={`${sym}${stats.totalCapital.toLocaleString()}`} sub="paper account" />
        <StatCard
          label="Total P&L"
          value={`${stats.totalPnL >= 0 ? '+' : ''}${sym}${Math.abs(stats.totalPnL).toLocaleString(undefined, {maximumFractionDigits: 0})}`}
          sub={`${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnLPercent.toFixed(2)}%`}
          color={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} sub={`${stats.totalOrders} orders`} color={stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
        <StatCard label="Open Positions" value={stats.openPositions.toString()} sub={`${deployedPct}% deployed`} color="text-blue-400" />
      </div>

      {/* Capital allocation + equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <Card>
          <CardHeader title="Capital Allocation" subtitle={`${sym}${stats.availableCapital.toLocaleString(undefined,{maximumFractionDigits:0})} available`} />
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={i === pieData.length - 1 ? '#2a2d3e' : COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${sym}${Number(v).toLocaleString(undefined,{maximumFractionDigits:0})}`, '']}
                    contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === pieData.length - 1 ? '#2a2d3e' : COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No positions open</p>
          )}
        </Card>

        {/* Equity curve from orders */}
        <Card>
          <CardHeader title="P&L History" subtitle="Cumulative from executed orders" />
          {equityHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={equityHistory} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" strokeOpacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={52}
                  tickFormatter={v => `${sym}${(v/1000).toFixed(0)}K`} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v) => [`${sym}${Number(v).toLocaleString(undefined,{maximumFractionDigits:0})}`, 'Equity']}
                  contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', fontSize: 11 }} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fill="rgba(59,130,246,0.08)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-500 py-12 text-center">Execute some trades to see P&L history</p>
          )}
        </Card>
      </div>

      {/* Strategy performance table */}
      <Card>
        <CardHeader title="Strategy Performance" />
        {stratPerf.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No strategies created yet</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2a2d3e]">
                  {['Strategy', 'Status', 'Orders', 'Win Rate', 'P&L'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stratPerf.map(s => (
                  <tr key={s.name} className="border-b border-[#2a2d3e]/40 hover:bg-[#252840]/30">
                    <td className="px-3 py-2 font-semibold text-slate-200">{s.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant={s.status === 'running' ? 'green' : s.status === 'paused' ? 'yellow' : 'gray'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-400 tabular-nums">{s.orders}</td>
                    <td className={`px-3 py-2 font-semibold tabular-nums ${s.winRate >= 50 ? 'text-green-400' : s.winRate > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {s.orders > 0 ? `${s.winRate.toFixed(0)}%` : '—'}
                    </td>
                    <td className={`px-3 py-2 font-bold tabular-nums ${s.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.orders > 0 ? `${s.pnl >= 0 ? '+' : ''}${sym}${Math.abs(s.pnl).toLocaleString(undefined, {maximumFractionDigits: 0})}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
