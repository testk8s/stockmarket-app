import { useAlgoStore } from '@/store/algoStore';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { timeAgo } from '@/utils/format';

export function OrderBook() {
  const { orders, positions, closePosition } = useAlgoStore();
  const sym = (currency: string) => currency === 'INR' ? '₹' : '$';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Open Positions */}
      <Card>
        <CardHeader title="Open Positions" subtitle={`${positions.length} active`} />
        {positions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No open positions</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2a2d3e]">
                  {['Symbol', 'Strategy', 'Qty', 'Entry', 'Current', 'P&L', 'SL', 'TP', ''].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const pnlPct = ((p.currentPrice - p.entryPrice) / p.entryPrice * 100);
                  const s = sym(p.currency);
                  return (
                    <tr key={p.symbol} className="border-b border-[#2a2d3e]/40 hover:bg-[#252840]/30">
                      <td className="px-2 py-2 font-bold text-slate-200">{p.symbol.replace('.NS','')}</td>
                      <td className="px-2 py-2 text-slate-500 max-w-[120px] truncate">{p.strategyName}</td>
                      <td className="px-2 py-2 text-slate-300 tabular-nums">{p.quantity}</td>
                      <td className="px-2 py-2 text-slate-300 tabular-nums">{s}{p.entryPrice.toFixed(2)}</td>
                      <td className="px-2 py-2 text-slate-200 tabular-nums">{s}{p.currentPrice.toFixed(2)}</td>
                      <td className={`px-2 py-2 font-bold tabular-nums ${pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </td>
                      <td className="px-2 py-2 text-red-400 tabular-nums">{s}{p.stopLoss.toFixed(2)}</td>
                      <td className="px-2 py-2 text-green-400 tabular-nums">{s}{p.takeProfit.toFixed(2)}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => closePosition(p.symbol)}
                          className="px-2 py-0.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs rounded transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader title="Order History" subtitle={`${orders.length} total orders`} />
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No orders yet</p>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2a2d3e]">
                  {['Time', 'Symbol', 'Strategy', 'Side', 'Qty', 'Price', 'Fill', 'P&L', 'Status'].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 100).map(o => {
                  const s = sym(o.currency);
                  return (
                    <tr key={o.id} className="border-b border-[#2a2d3e]/40 hover:bg-[#252840]/30">
                      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">
                        {timeAgo(new Date(o.createdAt).toISOString())}
                      </td>
                      <td className="px-2 py-1.5 font-bold text-slate-200">{o.symbol.replace('.NS','')}</td>
                      <td className="px-2 py-1.5 text-slate-500 max-w-[100px] truncate">{o.strategyName}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant={o.side === 'buy' ? 'green' : 'red'}>{o.side.toUpperCase()}</Badge>
                      </td>
                      <td className="px-2 py-1.5 text-slate-300 tabular-nums">{o.quantity}</td>
                      <td className="px-2 py-1.5 text-slate-300 tabular-nums">{s}{o.price.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-slate-300 tabular-nums">{o.filledPrice ? `${s}${o.filledPrice.toFixed(2)}` : '—'}</td>
                      <td className={`px-2 py-1.5 tabular-nums font-medium ${!o.pnl ? 'text-slate-500' : o.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {o.pnl !== undefined ? `${o.pnl >= 0 ? '+' : ''}${o.pnlPercent?.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge variant={o.status === 'filled' ? 'green' : o.status === 'cancelled' ? 'red' : 'gray'}>
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
