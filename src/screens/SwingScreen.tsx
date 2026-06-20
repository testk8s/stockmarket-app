import { useMemo } from 'react';
import { Zap, TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react';
import { useSwingStore } from '@/store/swingStore';
import type { SwingTrade, SwingSetupType } from '@/types';
import { SwingFilters } from '@/components/swing/SwingFilters';
import { SwingTable } from '@/components/swing/SwingTable';
import { SwingDetailPanel } from '@/components/swing/SwingDetailPanel';
import { SwingSetupBadge } from '@/components/swing/SwingSetupBadge';
import { Card } from '@/components/ui/Card';

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}

function SetupDistBar({ setups }: { setups: SwingTrade[] }) {
  const counts: Partial<Record<SwingSetupType, number>> = {};
  setups.forEach(s => { counts[s.setupType] = (counts[s.setupType] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <Card>
      <p className="text-xs font-semibold text-slate-300 mb-3">Setup Distribution</p>
      <div className="space-y-2">
        {sorted.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-28 flex-shrink-0">
              <SwingSetupBadge setupType={type as SwingSetupType} size="sm" />
            </div>
            <div className="flex-1 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400/70 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SwingScreen() {
  const { setups, filter, selectedSymbol, setSelectedSymbol } = useSwingStore();

  // Apply client-side filter
  const filtered = useMemo(() => setups.filter(s => {
    if (filter.market !== 'all' && s.market !== filter.market) return false;
    if (filter.setupType !== 'all' && s.setupType !== filter.setupType) return false;
    if (filter.direction !== 'all' && s.direction !== filter.direction) return false;
    if (s.overallScore < filter.minScore) return false;
    if (s.riskRewardRatio < filter.minRR) return false;
    if (s.riskPercent > filter.maxRisk) return false;
    if (filter.sectors.length && !filter.sectors.includes(s.sector)) return false;
    return true;
  }), [setups, filter]);

  const selectedSetup = filtered.find(s => s.symbol === selectedSymbol) ?? setups.find(s => s.symbol === selectedSymbol);
  const longCount  = filtered.filter(s => s.direction === 'long').length;
  const shortCount = filtered.filter(s => s.direction === 'short').length;
  const avgScore   = filtered.length ? Math.round(filtered.reduce((a, s) => a + s.overallScore, 0) / filtered.length) : 0;
  const highQuality = filtered.filter(s => s.overallScore >= 70).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 bg-[#1a1d26] border-b border-[#2a2d3e] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Zap size={15} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-200">Swing Trading Scanner</h1>
            <p className="text-xs text-slate-500">
              Price action · Volume · Technical · News sentiment across all markets
            </p>
          </div>
        </div>
      </div>

      <SwingFilters />

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="flex-shrink-0 p-4 pb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <StatCard label="Total Setups"  value={filtered.length.toString()} sub="after filters"   icon={<Activity size={14} />}      color="#f59e0b" />
            <StatCard label="Long Setups"   value={longCount.toString()}        sub="buy candidates"  icon={<TrendingUp size={14} />}    color="#22c55e" />
            <StatCard label="Short Setups"  value={shortCount.toString()}       sub="sell candidates" icon={<TrendingDown size={14} />}  color="#ef4444" />
            <StatCard label="Avg Score"     value={avgScore.toString()}         sub="/ 100"           icon={<Zap size={14} />}           color="#a855f7" />
            <StatCard label="High Quality"  value={highQuality.toString()}      sub="score ≥ 70"      icon={<BarChart2 size={14} />}     color="#3b82f6" />
            <SetupDistBar setups={filtered} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden mt-3">
        {/* Left: table */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <SwingTable
            setups={filtered}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
        </div>

        {/* Right: detail */}
        {selectedSetup && (
          <>
            <div className="w-px bg-[#2a2d3e] flex-shrink-0" />
            <div className="w-[440px] flex-shrink-0 overflow-hidden border-l border-[#2a2d3e]">
              <SwingDetailPanel
                setup={selectedSetup}
                onClose={() => setSelectedSymbol(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
