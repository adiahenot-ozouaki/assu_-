import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export interface Step {
  id: number;
  label: string;
  icon: string;
}

interface StepperProps {
  steps: Step[];
  current: number; // 0-based
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-thin pb-1">
      {steps.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                done    && 'bg-brand text-white',
                active  && 'bg-navy text-white ring-4 ring-brand/20',
                pending && 'bg-surface-3 text-ink-subtle',
              )} aria-current={active ? 'step' : undefined}>
                {done ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <span aria-hidden>{step.icon}</span>}
              </div>
              <span className={clsx(
                'text-xs font-medium whitespace-nowrap',
                active  && 'text-ink',
                done    && 'text-brand-dark',
                pending && 'text-ink-subtle',
              )}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx(
                'h-0.5 flex-1 mx-2 mb-5 rounded-full transition-all min-w-[12px]',
                done ? 'bg-brand' : 'bg-border',
              )} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
