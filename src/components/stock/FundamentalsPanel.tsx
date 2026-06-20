import type { FundamentalMetrics, StockQuote } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatNumber, formatPercent, formatMarketCap } from '@/utils/format';
import { Tooltip } from '@/components/ui/Tooltip';

interface FundamentalsPanelProps {
  fundamentals: FundamentalMetrics;
  quote: StockQuote;
}

interface MetricRowProps {
  label: string;
  value: string | number | undefined;
  benchmark?: { low: number; high: number };
  tooltip?: string;
  isPercent?: boolean;
  good?: 'low' | 'high';
}

function getValueColor(value: number, benchmark?: { low: number; high: number }, good?: 'low' | 'high'): string {
  if (!benchmark) return 'text-slate-200';
  const { low, high } = benchmark;
  const isHigh = value > high;
  const isLow = value < low;
  if (good === 'high') {
    return isHigh ? 'text-green-400' : isLow ? 'text-red-400' : 'text-slate-200';
  } else if (good === 'low') {
    return isLow ? 'text-green-400' : isHigh ? 'text-red-400' : 'text-slate-200';
  }
  return 'text-slate-200';
}

function MetricRow({ label, value, benchmark, tooltip, isPercent, good }: MetricRowProps) {
  const numValue = typeof value === 'number' ? value : undefined;
  const colorClass = numValue !== undefined
    ? getValueColor(numValue, benchmark, good)
    : 'text-slate-400';
  const display = value === undefined || value === null ? '—' :
    typeof value === 'number' ? (isPercent ? formatPercent(value) : formatNumber(value)) :
    value;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2d3e]/50">
      {tooltip ? (
        <Tooltip content={tooltip}>
          <span className="text-xs text-slate-400 cursor-help border-b border-dashed border-slate-600">{label}</span>
        </Tooltip>
      ) : (
        <span className="text-xs text-slate-400">{label}</span>
      )}
      <span className={`text-xs font-medium tabular-nums ${colorClass}`}>{display}</span>
    </div>
  );
}

function MiniGauge({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex-1 min-w-[80px]">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="relative h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs font-bold mt-0.5" style={{ color }}>{formatNumber(value)}%</p>
    </div>
  );
}

export function FundamentalsPanel({ fundamentals, quote }: FundamentalsPanelProps) {
  const f = fundamentals;

  const healthScore = [
    f.currentRatio !== undefined && f.currentRatio > 1 ? 1 : 0,
    f.debtEquity !== undefined && f.debtEquity < 1.5 ? 1 : 0,
    f.roe !== undefined && f.roe > 15 ? 1 : 0,
    f.netMargin !== undefined && f.netMargin > 10 ? 1 : 0,
    f.revenueGrowthYoY !== undefined && f.revenueGrowthYoY > 10 ? 1 : 0,
  ].reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      {/* Health summary */}
      <Card>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-slate-500">Financial Health</p>
            <p className={`text-xl font-bold ${healthScore >= 4 ? 'text-green-400' : healthScore >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
              {healthScore >= 4 ? 'Strong' : healthScore >= 2 ? 'Moderate' : 'Weak'}
            </p>
            <p className="text-xs text-slate-600">{healthScore}/5 criteria met</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Market Cap</p>
            <p className="text-sm font-bold text-slate-200">{formatMarketCap(quote.marketCap)}</p>
            <p className="text-xs text-slate-600">{quote.currency}</p>
          </div>
        </div>
        {f.grossMargin !== undefined && f.operatingMargin !== undefined && f.netMargin !== undefined && (
          <div className="flex gap-3 pt-2 border-t border-[#2a2d3e]">
            <MiniGauge value={f.grossMargin} min={0} max={80} label="Gross Margin" />
            <MiniGauge value={f.operatingMargin} min={0} max={40} label="Op. Margin" />
            <MiniGauge value={f.netMargin} min={0} max={30} label="Net Margin" />
          </div>
        )}
      </Card>

      {/* Valuation */}
      <Card>
        <CardHeader title="Valuation" />
        <MetricRow label="P/E Ratio" value={f.peRatio} benchmark={{ low: 10, high: 35 }} good="low" tooltip="Price / Earnings — lower = cheaper relative to earnings" />
        <MetricRow label="P/B Ratio" value={f.pbRatio} benchmark={{ low: 1, high: 5 }} good="low" tooltip="Price / Book value" />
        <MetricRow label="P/S Ratio" value={f.psRatio} benchmark={{ low: 1, high: 10 }} good="low" tooltip="Price / Revenue" />
        <MetricRow label="EV/EBITDA" value={f.evEbitda} benchmark={{ low: 5, high: 20 }} good="low" tooltip="Enterprise Value / EBITDA" />
        <MetricRow label="EPS" value={f.eps} tooltip="Earnings Per Share" />
        <MetricRow label="Dividend Yield" value={f.dividendYield} isPercent tooltip="Annual dividend / price" />
        <MetricRow label="Beta" value={f.beta} benchmark={{ low: 0.5, high: 1.5 }} tooltip="Market sensitivity (1.0 = moves with market)" />
      </Card>

      {/* Growth */}
      <Card>
        <CardHeader title="Growth" />
        <MetricRow label="Revenue Growth YoY" value={f.revenueGrowthYoY} isPercent good="high" benchmark={{ low: 0, high: 20 }} tooltip="Year-over-year revenue growth rate" />
        <MetricRow label="Earnings Growth YoY" value={f.earningsGrowthYoY} isPercent good="high" benchmark={{ low: 0, high: 20 }} tooltip="Year-over-year earnings growth rate" />
        <MetricRow label="Revenue" value={f.revenue !== undefined ? formatMarketCap(f.revenue) : undefined} tooltip="Trailing twelve months revenue" />
        <MetricRow label="EBITDA" value={f.ebitda !== undefined ? formatMarketCap(f.ebitda) : undefined} tooltip="Earnings before interest, taxes, depreciation & amortization" />
        <MetricRow label="Free Cash Flow" value={f.freeCashFlow !== undefined ? formatMarketCap(Math.abs(f.freeCashFlow)) : undefined} tooltip="Operating CF minus capex" />
      </Card>

      {/* Profitability */}
      <Card>
        <CardHeader title="Profitability" />
        <MetricRow label="Gross Margin" value={f.grossMargin} isPercent good="high" benchmark={{ low: 20, high: 60 }} />
        <MetricRow label="Operating Margin" value={f.operatingMargin} isPercent good="high" benchmark={{ low: 10, high: 30 }} />
        <MetricRow label="Net Margin" value={f.netMargin} isPercent good="high" benchmark={{ low: 5, high: 20 }} />
        <MetricRow label="ROE" value={f.roe} isPercent good="high" benchmark={{ low: 10, high: 25 }} tooltip="Return on Equity" />
        <MetricRow label="ROA" value={f.roa} isPercent good="high" benchmark={{ low: 5, high: 15 }} tooltip="Return on Assets" />
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader title="Balance Sheet" />
        <MetricRow label="Debt/Equity" value={f.debtEquity} good="low" benchmark={{ low: 0.5, high: 2 }} tooltip="Total debt / shareholders' equity" />
        <MetricRow label="Current Ratio" value={f.currentRatio} good="high" benchmark={{ low: 1, high: 2 }} tooltip="Current assets / current liabilities (>1 = healthy)" />
        <MetricRow label="Quick Ratio" value={f.quickRatio} good="high" benchmark={{ low: 0.8, high: 1.5 }} tooltip="(Current assets - inventory) / current liabilities" />
        <MetricRow label="Payout Ratio" value={f.payoutRatio} isPercent tooltip="Dividend / EPS — % of earnings paid as dividends" />
        <MetricRow label="Shares Outstanding" value={f.sharesOutstanding !== undefined ? formatMarketCap(f.sharesOutstanding) : undefined} />
      </Card>
    </div>
  );
}
