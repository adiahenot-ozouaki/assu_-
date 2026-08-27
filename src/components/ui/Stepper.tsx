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
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                done    && 'bg-[#00C875] text-white',
                active  && 'bg-[#0A1628] text-white ring-4 ring-[#00C875]/20',
                pending && 'bg-gray-100 text-gray-400',
              )}>
                {done ? <Check size={16} strokeWidth={2.5} /> : step.icon}
              </div>
              <span className={clsx(
                'text-xs font-medium whitespace-nowrap',
                active  && 'text-[#0A1628]',
                done    && 'text-[#00A35E]',
                pending && 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < steps.length - 1 && (
              <div className={clsx(
                'h-0.5 flex-1 mx-2 mb-5 rounded-full transition-all',
                done ? 'bg-[#00C875]' : 'bg-gray-200',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
