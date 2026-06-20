import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChangeIndicatorProps {
  value: number;
  isPercent?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ChangeIndicator({ value, isPercent, showIcon = true, size = 'md' }: ChangeIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const colorClass = isNeutral
    ? 'text-slate-400'
    : isPositive
    ? 'text-green-400'
    : 'text-red-400';

  const sizeClass = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];
  const iconSize = { sm: 10, md: 13, lg: 15 }[size];

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? '+' : '';
  const formatted = isPercent ? `${sign}${value.toFixed(2)}%` : `${sign}${value.toFixed(2)}`;

  return (
    <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${colorClass} ${sizeClass}`}>
      {showIcon && <Icon size={iconSize} />}
      {formatted}
    </span>
  );
}
