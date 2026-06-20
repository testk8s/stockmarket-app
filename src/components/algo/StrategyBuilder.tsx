import { useState } from 'react';
import { Plus, Play, Pause, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { AlgoStrategy, AlgoStrategyType, AlgoStrategyParam } from '@/types';
import { useAlgoStore } from '@/store/algoStore';
import { STRATEGY_TEMPLATES } from '@/services/algoEngine';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { Badge } from '@/components/ui/Badge';


const STRATEGY_ICONS: Record<AlgoStrategyType, string> = {
  sma_crossover: '📊', ema_crossover: '📈', rsi_mean_reversion: '🔄',
  macd_signal: '⚡', bollinger_breakout: '🚀', momentum: '💨',
  dual_momentum: '🔝', vwap_reversion: '↩️', custom: '🛠️',
};

const STATUS_COLORS: Record<AlgoStrategy['status'], string> = {
  idle: 'gray', running: 'green', paused: 'yellow', stopped: 'red',
};

function ParamField({ param, onChange }: { param: AlgoStrategyParam; onChange: (v: number | string | boolean) => void }) {
  if (param.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1.5">
        <div>
          <p className="text-xs text-slate-300">{param.label}</p>
          <p className="text-xs text-slate-500">{param.description}</p>
        </div>
        <button
          onClick={() => onChange(!param.value)}
          className={`w-10 h-5 rounded-full transition-colors relative ${param.value ? 'bg-blue-500' : 'bg-[#2a2d3e]'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${param.value ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
    );
  }
  if (param.type === 'select') {
    return (
      <div className="py-1.5">
        <p className="text-xs text-slate-300 mb-1">{param.label}</p>
        <select
          value={String(param.value)}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/60"
        >
          {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="py-1.5">
      <div className="flex justify-between mb-1">
        <p className="text-xs text-slate-300">{param.label}</p>
        <span className="text-xs text-blue-400 font-mono">{param.value}</span>
      </div>
      <input
        type="range"
        min={param.min ?? 1} max={param.max ?? 100} step={param.step ?? 1}
        value={Number(param.value)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer"
      />
      <p className="text-xs text-slate-600 mt-0.5">{param.description}</p>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: AlgoStrategy }) {
  const { updateStrategy, deleteStrategy, toggleRunning, setActiveStrategy, activeStrategyId, runBacktestAction, setActiveTab } = useAlgoStore();
  const [expanded, setExpanded] = useState(false);
  const isActive = activeStrategyId === strategy.id;

  const handleParamChange = (key: string, value: number | string | boolean) => {
    updateStrategy(strategy.id, {
      params: strategy.params.map(p => p.key === key ? { ...p, value } : p),
    });
  };

  const addSymbol = (sym: string) => {
    if (!strategy.symbols.includes(sym) && strategy.symbols.length < 20) {
      updateStrategy(strategy.id, { symbols: [...strategy.symbols, sym] });
    }
  };

  const removeSymbol = (sym: string) => {
    updateStrategy(strategy.id, { symbols: strategy.symbols.filter(s => s !== sym) });
  };

  const allStocks = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];
  const [symSearch, setSymSearch] = useState('');
  const available = allStocks.filter(s =>
    !strategy.symbols.includes(s.symbol) &&
    (s.symbol.toLowerCase().includes(symSearch.toLowerCase()) || s.name.toLowerCase().includes(symSearch.toLowerCase()))
  ).slice(0, 8);

  return (
    <div className={`bg-[#1e2130] border rounded-xl transition-all ${isActive ? 'border-blue-500/40' : 'border-[#2a2d3e]'}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => { setActiveStrategy(isActive ? null : strategy.id); setExpanded(!expanded || !isActive); }}
      >
        <span className="text-xl">{STRATEGY_ICONS[strategy.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-200">{strategy.name}</p>
            <Badge variant={STATUS_COLORS[strategy.status] as any}>{strategy.status.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-slate-500 truncate">{strategy.description}</p>
          <p className="text-xs text-slate-600 mt-0.5">{strategy.symbols.length} symbols · SL {strategy.stopLossPercent}% · TP {strategy.takeProfitPercent}%</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); toggleRunning(strategy.id); }}
            className={`p-2 rounded-lg transition-colors ${strategy.status === 'running' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#2a2d3e] text-slate-400 hover:text-slate-200'}`}
          >
            {strategy.status === 'running' ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); deleteStrategy(strategy.id); }}
            className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2a2d3e] p-4 space-y-4">
          {/* Risk params */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Position Size %', key: 'positionSize', val: strategy.positionSize, min: 1, max: 100 },
              { label: 'Stop Loss %',     key: 'stopLossPercent', val: strategy.stopLossPercent, min: 0.5, max: 20 },
              { label: 'Take Profit %',   key: 'takeProfitPercent', val: strategy.takeProfitPercent, min: 1, max: 50 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between mb-1"><p className="text-xs text-slate-400">{f.label}</p><span className="text-xs text-blue-400 font-mono">{f.val}</span></div>
                <input type="range" min={f.min} max={f.max} step={0.5} value={f.val}
                  onChange={e => updateStrategy(strategy.id, { [f.key]: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full accent-blue-500" />
              </div>
            ))}
          </div>

          {/* Strategy params */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Strategy Parameters</p>
            <div className="space-y-1 divide-y divide-[#2a2d3e]/50">
              {strategy.params.map(p => (
                <ParamField key={p.key} param={p} onChange={v => handleParamChange(p.key, v)} />
              ))}
            </div>
          </div>

          {/* Symbol management */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Symbols ({strategy.symbols.length}/20)</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {strategy.symbols.map(sym => (
                <span key={sym} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs rounded-full">
                  {sym.replace('.NS','')}
                  <button onClick={() => removeSymbol(sym)} className="text-blue-400/60 hover:text-red-400"><span>×</span></button>
                </span>
              ))}
            </div>
            <input
              type="text" placeholder="Search to add symbol…" value={symSearch}
              onChange={e => setSymSearch(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 mb-1"
            />
            {symSearch && (
              <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {available.map(s => (
                  <div key={s.symbol} onClick={() => { addSymbol(s.symbol); setSymSearch(''); }}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#1e2130] cursor-pointer">
                    <span className="text-xs font-medium text-slate-200">{s.symbol}</span>
                    <span className="text-xs text-slate-500">{s.name}</span>
                    <Plus size={10} className="text-blue-400 ml-auto" />
                  </div>
                ))}
                {!available.length && <p className="text-xs text-slate-500 p-3">No matches</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { runBacktestAction(strategy.id, strategy.symbols[0] ?? 'RELIANCE.NS'); setActiveTab('backtest'); }}
              className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 text-xs font-semibold rounded-lg transition-colors"
            >
              Run Backtest
            </button>
            <button
              onClick={() => { updateStrategy(strategy.id, { status: 'running' }); setActiveTab('signals'); }}
              className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors"
            >
              Go Live (Paper)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StrategyBuilder() {
  const { strategies, createStrategy } = useAlgoStore();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Strategy Builder</h2>
          <p className="text-xs text-slate-500">{strategies.length} strategies · click to expand & configure</p>
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <Plus size={13} /> New Strategy
        </button>
      </div>

      {/* Strategy type picker */}
      {showPicker && (
        <div className="bg-[#1a1d26] border border-[#2a2d3e] rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">Choose strategy template:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(Object.keys(STRATEGY_TEMPLATES) as AlgoStrategyType[]).map(type => {
              const t = STRATEGY_TEMPLATES[type];
              return (
                <button
                  key={type}
                  onClick={() => { createStrategy(type); setShowPicker(false); }}
                  className="flex items-start gap-2 p-3 bg-[#0f1117] border border-[#2a2d3e] rounded-lg hover:border-blue-500/40 hover:bg-[#1e2130] transition-all text-left"
                >
                  <span className="text-lg flex-shrink-0">{STRATEGY_ICONS[type]}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{t.name}</p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5">{t.description.slice(0, 55)}…</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Strategy list */}
      {strategies.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Settings size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm font-medium">No strategies yet</p>
          <p className="text-xs mt-1">Click "New Strategy" to create your first algo</p>
        </div>
      ) : (
        strategies.map(s => <StrategyCard key={s.id} strategy={s} />)
      )}
    </div>
  );
}
