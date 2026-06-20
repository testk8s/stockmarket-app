interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', padding = 'md', hoverable, onClick }: CardProps) {
  const padClass = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }[padding];
  const hoverClass = hoverable ? 'cursor-pointer hover:bg-slate-700/30 transition-colors' : '';
  return (
    <div
      className={`bg-[#1e2130] border border-[#2a2d3e] rounded-xl ${padClass} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
