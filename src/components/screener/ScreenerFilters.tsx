import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { ScreenerCriteria } from '@/types';
import { useScreenerStore } from '@/store/screenerStore';

const SECTORS = ['Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Staples',
  'Consumer Discretionary', 'Materials', 'Industrials', 'Utilities', 'Communication'];

function NumberInput({
  label, value, onChange, placeholder, min, max, step = 1
}: {
  label: string; value?: number; onChange: (v: number | undefined) => void;
  placeholder?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        min={min} max={max} step={step}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
      />
    </div>
  );
}

function SelectInput({
  label, value, options, onChange
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
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

export function ScreenerFilters() {
  const { criteria, setCriteria, resetCriteria, runScreener, loading } = useScreenerStore();

  const toggleSector = (sector: string) => {
    const current = criteria.sectors ?? [];
    const next = current.includes(sector)
      ? current.filter(s => s !== sector)
      : [...current, sector];
    setCriteria({ sectors: next.length === 0 ? undefined : next });
  };

  return (
    <div className="bg-[#1a1d26] border-b border-[#2a2d3e] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Screener Filters</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetCriteria}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            <RotateCcw size={11} /> Reset
          </button>
          <button
            onClick={runScreener}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Running…' : 'Run Screener'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Price range */}
        <NumberInput label="Min Price" value={criteria.minPrice} onChange={v => setCriteria({ minPrice: v })} placeholder="0" min={0} />
        <NumberInput label="Max Price" value={criteria.maxPrice} onChange={v => setCriteria({ maxPrice: v })} placeholder="Any" min={0} />

        {/* Change % */}
        <NumberInput label="Min Change %" value={criteria.minChangePercent} onChange={v => setCriteria({ minChangePercent: v })} placeholder="-100" step={0.1} />
        <NumberInput label="Max Change %" value={criteria.maxChangePercent} onChange={v => setCriteria({ maxChangePercent: v })} placeholder="100" step={0.1} />

        {/* P/E range */}
        <NumberInput label="Min P/E" value={criteria.minPE} onChange={v => setCriteria({ minPE: v })} placeholder="0" min={0} />
        <NumberInput label="Max P/E" value={criteria.maxPE} onChange={v => setCriteria({ maxPE: v })} placeholder="Any" min={0} />

        {/* RSI range */}
        <NumberInput label="Min RSI" value={criteria.minRSI} onChange={v => setCriteria({ minRSI: v })} placeholder="0" min={0} max={100} />
        <NumberInput label="Max RSI" value={criteria.maxRSI} onChange={v => setCriteria({ maxRSI: v })} placeholder="100" min={0} max={100} />

        {/* ROE / Revenue Growth / D/E */}
        <NumberInput label="Min ROE %" value={criteria.minROE} onChange={v => setCriteria({ minROE: v })} placeholder="0" />
        <NumberInput label="Min Rev Growth %" value={criteria.minRevenueGrowth} onChange={v => setCriteria({ minRevenueGrowth: v })} placeholder="0" />
        <NumberInput label="Max D/E Ratio" value={criteria.maxDebtEquity} onChange={v => setCriteria({ maxDebtEquity: v })} placeholder="Any" min={0} step={0.1} />

        {/* Prediction direction */}
        <SelectInput
          label="Prediction Direction"
          value={criteria.predictionDirection ?? 'all'}
          options={[
            { value: 'all', label: 'All Directions' },
            { value: 'bullish', label: '📈 Bullish' },
            { value: 'bearish', label: '📉 Bearish' },
          ]}
          onChange={v => setCriteria({ predictionDirection: v as ScreenerCriteria['predictionDirection'] })}
        />

        {/* Min confidence */}
        <NumberInput label="Min Confidence %" value={criteria.minConfidence} onChange={v => setCriteria({ minConfidence: v })} placeholder="0" min={0} max={100} />
      </div>

      {/* Sector chips */}
      <div className="mt-3">
        <p className="text-xs text-slate-500 mb-2">Sectors (click to filter)</p>
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.map(sector => {
            const active = criteria.sectors?.includes(sector);
            return (
              <button
                key={sector}
                onClick={() => toggleSector(sector)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${
                  active
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'border-[#2a2d3e] text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                {sector}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
