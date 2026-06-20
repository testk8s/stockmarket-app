import { useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { AlgoSignal } from '@/types';
import { useAlgoStore } from '@/store/algoStore';
import { Badge } from '@/components/ui/Badge';
import { timeAgo } from '@/utils/format';

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{value}%</span>
    </div>
  );
}

function SignalCard({ signal }: { signal: AlgoSignal }) {
  const { actOnSignal, dismissSignal } = useAlgoStore();
  const isNew = signal.status === 'new';
  const isBuy = signal.side === 'buy';
  const sym = signal.currency === 'INR' ? '₹' : '$';

  return (
    <div className={`bg-[#1e2130] border rounded-xl p-4 transition-all ${
      !isNew ? 'opacity-50' : isBuy ? 'border-green-500/30' : 'border-red-500/30'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isBuy
            ? <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0"><TrendingUp size={15} className="text-green-400"/></div>
            : <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0"><TrendingDown size={15} className="text-red-400"/></div>
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-black text-slate-200">{signal.symbol.replace('.NS','').replace('.L','')}</span>
              <Badge variant={isBuy ? 'green' : 'red'}>{isBuy ? 'BUY' : 'SELL'}</Badge>
              <Badge variant="gray">{signal.exchange}</Badge>
              {signal.status === 'acted' && <Badge variant="blue">Executed</Badge>}
              {signal.status === 'dismissed' && <Badge variant="gray">Dismissed</Badge>}
            </div>
            <p className="text-xs text-slate-500 truncate">{signal.name}</p>
            <p className="text-xs text-blue-400 mt-0.5">{signal.strategyName}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-black text-slate-200 tabular-nums">{sym}{signal.price.toFixed(2)}</p>
          <div className="flex items-center gap-1 justify-end mt-0.5 text-slate-500 text-xs">
            <Clock size={9} /> {timeAgo(new Date(signal.generatedAt).toISOString())}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Confidence</span>
          <ConfidenceMeter value={signal.confidence} />
        </div>
        <p className="text-xs text-slate-400 bg-[#0f1117]/50 rounded-lg px-2.5 py-1.5">{signal.reason}</p>
        {/* Indicator values */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {Object.entries(signal.indicators).slice(0, 5).map(([k, v]) => (
            <span key={k} className="text-xs px-1.5 py-0.5 bg-[#2a2d3e] rounded text-slate-400">
              {k}: <span className="text-slate-200 font-mono">{typeof v === 'number' ? v.toFixed(2) : v}</span>
            </span>
          ))}
        </div>
      </div>

      {isNew && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => actOnSignal(signal.id)}
            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <CheckCircle size={12} /> Execute (Paper)
          </button>
          <button
            onClick={() => dismissSignal(signal.id)}
            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-[#2a2d3e] hover:bg-[#3a3d4e] text-slate-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <XCircle size={12} /> Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export function LiveSignalsPanel() {
  const { signals, loading, scanSignals, strategies, clearOldSignals } = useAlgoStore();
  const running = strategies.filter(s => s.status === 'running');

  useEffect(() => {
    clearOldSignals();
  }, []);

  const newSignals      = signals.filter(s => s.status === 'new');
  const actedSignals    = signals.filter(s => s.status === 'acted');

  if (running.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
        <TrendingUp size={32} className="mb-3 text-slate-700" />
        <p className="text-sm font-medium">No strategies running</p>
        <p className="text-xs mt-1">Go to Strategies tab, configure a strategy, and click "Go Live (Paper)" to start receiving signals</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Live Signals</h2>
          <p className="text-xs text-slate-500">
            {running.length} strategies active · {newSignals.length} new signals
          </p>
        </div>
        <button
          onClick={scanSignals}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>

      {/* Active strategies strip */}
      <div className="flex flex-wrap gap-2">
        {running.map(s => (
          <span key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {s.name} ({s.symbols.length} symbols)
          </span>
        ))}
      </div>

      {/* New signals */}
      {newSignals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">New Signals ({newSignals.length})</p>
          <div className="space-y-3">
            {newSignals.map(sig => <SignalCard key={sig.id} signal={sig} />)}
          </div>
        </div>
      )}

      {/* Recently acted */}
      {actedSignals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">Executed ({actedSignals.length})</p>
          <div className="space-y-2">
            {actedSignals.slice(0, 5).map(sig => <SignalCard key={sig.id} signal={sig} />)}
          </div>
        </div>
      )}

      {signals.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw size={24} className="mx-auto mb-2 text-slate-700" />
          <p className="text-sm text-slate-500">No signals yet</p>
          <p className="text-xs text-slate-600 mt-1">Click "Scan Now" to check current market conditions</p>
        </div>
      )}
    </div>
  );
}
