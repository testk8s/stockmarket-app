interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' | 'cyan';
  size?: 'sm' | 'md';
}

const variants = {
  green: 'bg-green-500/15 text-green-400 border border-green-500/20',
  red: 'bg-red-500/15 text-red-400 border border-red-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  gray: 'bg-slate-700/50 text-slate-400 border border-slate-600/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
};

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${variants[variant]}`}>
      {children}
    </span>
  );
}
