import type { SwingSetupType, SwingTimeframe } from '@/types';

const SETUP_META: Record<SwingSetupType, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  breakout:            { label: 'Breakout',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  emoji: '🚀' },
  pullback:            { label: 'Pullback Entry',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', emoji: '↩️' },
  reversal:            { label: 'Reversal',           color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', emoji: '🔄' },
  momentum:            { label: 'Momentum',           color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', emoji: '⚡' },
  volume_surge:        { label: 'Volume Surge',       color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)',  emoji: '📊' },
  oversold_bounce:     { label: 'Oversold Bounce',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', emoji: '🎯' },
  trend_continuation:  { label: 'Trend Continuation',color: '#64748b', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.3)',emoji: '📈' },
};

const TF_LABEL: Record<SwingTimeframe, string> = {
  '1d': '1 Day', '3d': '3 Days', '1w': '1 Week', '2w': '2 Weeks',
};

export function SwingSetupBadge({ setupType, size = 'sm' }: { setupType: SwingSetupType; size?: 'sm' | 'md' }) {
  const m = SETUP_META[setupType];
  const pad = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${pad}`}
      style={{ color: m.color, backgroundColor: m.bg, borderColor: m.border }}>
      {m.emoji} {m.label}
    </span>
  );
}

export function TimeframeBadge({ timeframe }: { timeframe: SwingTimeframe }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30">
      ⏱ {TF_LABEL[timeframe]}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: 'long' | 'short' }) {
  return direction === 'long'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25">▲ LONG</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">▼ SHORT</span>;
}
