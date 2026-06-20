import { SlidersHorizontal, RotateCcw, Play } from 'lucide-react';
import type { SwingSetupType, SwingMarketSource } from '@/types';
import { useSwingStore } from '@/store/swingStore';

const SETUP_TYPES: { value: SwingSetupType | 'all'; label: string }[] = [
  { value: 'all',              label: 'All Setups'          },
  { value: 'breakout',         label: '🚀 Breakout'          },
  { value: 'pullback',         label: '↩️ Pullback'           },
  { value: 'reversal',         label: '🔄 Reversal'           },
  { value: 'momentum',         label: '⚡ Momentum'           },
  { value: 'volume_surge',     label: '📊 Volume Surge'       },
  { value: 'oversold_bounce',  label: '🎯 Oversold Bounce'    },
  { value: 'trend_continuation',label: '📈 Trend Continuation'},
];

const MARKETS: { value: SwingMarketSource | 'all'; label: string }[] = [
  { value: 'all',     label: '🌐 All Markets' },
  { value: 'india',   label: '🇮🇳 India (NSE)'  },
  { value: 'usa',     label: '🇺🇸 USA'          },
  { value: 'uk',      label: '🇬🇧 UK (LSE)'     },
  { value: 'japan',   label: '🇯🇵 Japan'         },
  { value: 'germany', label: '🇩🇪 Germany'       },
  { value: 'china',   label: '🇨🇳 China (HKEX)'  },
];

function Select({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/60"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 0.1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/60"
      />
    </div>
  );
}

export function SwingFilters() {
  const { filter, setFilter, resetFilter, runScan, loading, setups, lastScan, progress } = useSwingStore();

  return (
    <div className="bg-[#1a1d26] border-b border-[#2a2d3e] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-yellow-400" />
          <span className="text-sm font-semibold text-slate-200">Swing Scan Filters</span>
          {lastScan && !loading && (
            <span className="text-xs text-slate-600">
              · {setups.length} setups · last {new Date(lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            <RotateCcw size={11} /> Reset
          </button>
          <button
            onClick={runScan}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black text-xs font-bold rounded-lg transition-colors"
          >
            <Play size={11} />
            {loading ? `Scanning… ${progress}%` : 'Run Scan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Select label="Market" value={filter.market} options={MARKETS}
          onChange={v => setFilter({ market: v as SwingMarketSource | 'all' })} />
        <Select label="Setup Type" value={filter.setupType} options={SETUP_TYPES}
          onChange={v => setFilter({ setupType: v as SwingSetupType | 'all' })} />
        <Select label="Direction" value={filter.direction}
          options={[{ value: 'all', label: 'Long & Short' }, { value: 'long', label: '▲ Long Only' }, { value: 'short', label: '▼ Short Only' }]}
          onChange={v => setFilter({ direction: v as 'long' | 'short' | 'all' })} />
        <NumberInput label="Min Score" value={filter.minScore} min={0} max={100} step={5}
          onChange={v => setFilter({ minScore: v })} />
        <NumberInput label="Min R:R" value={filter.minRR} min={0.5} max={10} step={0.5}
          onChange={v => setFilter({ minRR: v })} />
        <NumberInput label="Max Risk %" value={filter.maxRisk} min={0.5} max={20} step={0.5}
          onChange={v => setFilter({ maxRisk: v })} />
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="mt-3">
          <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
