import { clsx } from 'clsx';
import type { ClientStatus, ContratStatus, BranchType } from '../../types';

export { Stepper } from './Stepper';
export type { Step } from './Stepper';

// ── Badge générique ───────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple';
  dot?: boolean;
}

export function Badge({ children, variant = 'gray', dot = false }: BadgeProps) {
  const variants = {
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber:  'bg-amber-50 text-amber-700 ring-amber-600/20',
    red:    'bg-red-50 text-red-700 ring-red-600/20',
    blue:   'bg-blue-50 text-blue-700 ring-blue-600/20',
    gray:   'bg-gray-50 text-gray-600 ring-gray-500/20',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  };
  const dotColors = {
    green: 'bg-emerald-500', amber: 'bg-amber-500',
    red: 'bg-red-500', blue: 'bg-blue-500', gray: 'bg-gray-400', purple: 'bg-purple-500',
  };
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      variants[variant]
    )}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

// ── Badge statut client ───────────────────────────────────────
const CLIENT_STATUS: Record<ClientStatus, { label: string; variant: BadgeProps['variant'] }> = {
  actif:    { label: 'Actif',    variant: 'green' },
  prospect: { label: 'Prospect', variant: 'blue'  },
  suspendu: { label: 'Suspendu', variant: 'amber' },
  'resilié':{ label: 'Résilié', variant: 'red'   },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const cfg = CLIENT_STATUS[status] ?? { label: status, variant: 'gray' };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}

// ── Badge statut contrat ──────────────────────────────────────
const CONTRAT_STATUS: Record<ContratStatus, { label: string; variant: BadgeProps['variant'] }> = {
  actif:      { label: 'Actif',      variant: 'green'  },
  brouillon:  { label: 'Brouillon',  variant: 'gray'   },
  suspendu:   { label: 'Suspendu',   variant: 'amber'  },
  'expiré':   { label: 'Expiré',     variant: 'red'    },
  'résilié':  { label: 'Résilié',    variant: 'red'    },
};

export function ContratStatusBadge({ status }: { status: ContratStatus }) {
  const cfg = CONTRAT_STATUS[status] ?? { label: status, variant: 'gray' };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}

// ── Badge branche ─────────────────────────────────────────────
const BRANCH_CFG: Record<BranchType, { label: string; icon: string; variant: BadgeProps['variant'] }> = {
  auto:   { label: 'Auto',     icon: '🚗', variant: 'blue'   },
  sante:  { label: 'Santé',    icon: '🏥', variant: 'green'  },
  vie:    { label: 'Vie',      icon: '❤️', variant: 'purple' },
  mrh:    { label: 'Habitation', icon: '🏠', variant: 'amber'},
  autre:  { label: 'Autre',    icon: '📋', variant: 'gray'   },
};

export function BranchBadge({ branche }: { branche: BranchType }) {
  const cfg = BRANCH_CFG[branche] ?? { label: branche, icon: '📋', variant: 'gray' };
  return (
    <Badge variant={cfg.variant}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-[#00C875] text-white hover:bg-[#00A35E] focus:ring-[#00C875]',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-100', className)}>
      {children}
    </div>
  );
}

// ── Stat card dashboard ───────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  color?: 'green' | 'blue' | 'amber' | 'purple';
}

export function StatCard({ label, value, icon, trend, color = 'green' }: StatCardProps) {
  const colors = {
    green:  'bg-emerald-50 text-emerald-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-gray-400">{trend}</p>}
        </div>
        <div className={clsx('p-2.5 rounded-lg text-xl', colors[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, name, ...props }: InputProps) {
  // Auto-generate id from name or label so label[for] always matches input[id]
  const fieldId = id ?? name ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        name={name ?? fieldId}
        className={clsx(
          'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent',
          'disabled:bg-gray-50 disabled:text-gray-400',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, name, ...props }: SelectProps) {
  const fieldId = id ?? name ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={fieldId}
        name={name ?? fieldId}
        className={clsx(
          'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent',
          error && 'border-red-400',
          className
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
