import { clsx } from 'clsx';
import type { BranchType } from '../../types';

interface BranchOption {
  value: BranchType;
  label: string;
  icon: string;
  description: string;
  color: string;
  bg: string;
}

const BRANCHES: BranchOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    icon: '🚗',
    description: 'RC, tous risques, vol, bris de glace',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  },
  {
    value: 'mrh',
    label: 'Habitation',
    icon: '🏠',
    description: 'Incendie, dégâts des eaux, vol, RC locataire',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  },
  {
    value: 'sante',
    label: 'Santé',
    icon: '🏥',
    description: 'Hospitalisation, ambulatoire, maternité',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
  },
  {
    value: 'vie',
    label: 'Vie',
    icon: '❤️',
    description: 'Décès toutes causes, invalidité, épargne',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200 hover:border-rose-400',
  },
  {
    value: 'autre',
    label: 'Autre',
    icon: '📋',
    description: 'Transport, RC professionnelle, agricole…',
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200 hover:border-gray-400',
  },
];

interface BranchSelectorProps {
  value: BranchType | '';
  onChange: (v: BranchType) => void;
}

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BRANCHES.map(b => {
        const selected = value === b.value;
        return (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.value)}
            className={clsx(
              'flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all',
              selected
                ? 'border-[#00C875] bg-[#00C875]/8 shadow-sm'
                : `border ${b.bg}`,
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-2xl">{b.icon}</span>
              {selected && (
                <div className="w-5 h-5 rounded-full bg-[#00C875] flex items-center justify-center">
                  <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className={clsx('font-semibold text-sm', selected ? 'text-[#00A35E]' : b.color)}>
                {b.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{b.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
