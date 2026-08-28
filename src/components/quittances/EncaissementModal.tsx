import { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, CheckCircle2 } from 'lucide-react';
import { encaisserQuittance } from '../../lib/quittances.service';
import { formatCurrency, formatDate } from '../../lib/supabase';
import type { Quittance } from '../../types';
import { Button } from '../ui';
import { clsx } from 'clsx';

const MODES = [
  {
    value: 'mobile_money' as const,
    label: 'Mobile Money',
    icon: <Smartphone size={20} />,
    placeholder: 'N° transaction Airtel/Moov Money',
    color: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300',
    selectedColor: 'border-orange-400 bg-orange-100 dark:border-orange-400 dark:bg-orange-500/25',
  },
  {
    value: 'especes' as const,
    label: 'Espèces',
    icon: <Banknote size={20} />,
    placeholder: 'Référence reçu caisse',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
    selectedColor: 'border-emerald-400 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-500/25',
  },
  {
    value: 'virement' as const,
    label: 'Virement',
    icon: <CreditCard size={20} />,
    placeholder: 'Référence virement bancaire',
    color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300',
    selectedColor: 'border-blue-400 bg-blue-100 dark:border-blue-400 dark:bg-blue-500/25',
  },
  {
    value: 'cheque' as const,
    label: 'Chèque',
    icon: <span className="text-lg">📄</span>,
    placeholder: 'N° de chèque',
    color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300',
    selectedColor: 'border-purple-400 bg-purple-100 dark:border-purple-400 dark:bg-purple-500/25',
  },
  {
    value: 'carte' as const,
    label: 'Carte bancaire',
    icon: <CreditCard size={20} />,
    placeholder: 'Référence TPE',
    color: 'border-border bg-surface-3 text-ink',
    selectedColor: 'border-border-strong bg-surface-3',
  },
];

interface EncaissementModalProps {
  quittance: Quittance & { client_nom?: string; contrat_numero?: string };
  onClose: () => void;
  onSuccess: (updatedQuittance: Quittance) => void;
}

type Step = 'mode' | 'details' | 'success';

export function EncaissementModal({ quittance, onClose, onSuccess }: EncaissementModalProps) {
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<typeof MODES[number]['value'] | ''>('');
  const [reference, setReference] = useState('');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const selectedMode = MODES.find(m => m.value === mode);

  const handleEncaisser = async () => {
    if (!mode) return;
    setLoading(true);
    setError('');
    try {
      const res = await encaisserQuittance({
        quittance_id: quittance.id,
        mode_paiement: mode,
        reference: reference || undefined,
        date_paiement: datePaiement,
      });
      setResult(res);
      setStep('success');
      onSuccess(res.quittance);
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'encaissement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="encaissement-title"
    >
      <div className="bg-surface-2 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 id="encaissement-title" className="text-base font-semibold text-ink">
              {step === 'success' ? '✅ Encaissement confirmé' : 'Encaisser une quittance'}
            </h2>
            <p className="text-xs text-ink-subtle mt-0.5">{quittance.numero}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {step !== 'success' && (
          <div className="mx-6 mt-4 p-4 bg-navy rounded-xl text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-white/50">Quittance</p>
                <p className="font-mono text-sm font-medium">{quittance.numero}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Montant</p>
                <p className="text-xl font-bold text-[#00C875]">{formatCurrency(quittance.montant)}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-white/50">
              <span>Période : {formatDate(quittance.periode_debut)} → {formatDate(quittance.periode_fin)}</span>
            </div>
          </div>
        )}

        {step === 'mode' && (
          <div className="p-6 space-y-4">
            <p className="text-sm font-medium text-ink">Mode de paiement</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                    mode === m.value
                      ? m.selectedColor + ' border-2'
                      : 'border-border hover:border-border-strong text-ink-muted'
                  )}
                >
                  <span className={mode === m.value ? '' : 'text-ink-subtle'} aria-hidden>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <Button className="w-full mt-2" disabled={!mode} onClick={() => setStep('details')}>
              Continuer →
            </Button>
          </div>
        )}

        {step === 'details' && selectedMode && (
          <div className="p-6 space-y-4">
            <div className={clsx('flex items-center gap-3 p-3 rounded-lg border', selectedMode.color)}>
              <span aria-hidden>{selectedMode.icon}</span>
              <span className="text-sm font-medium">{selectedMode.label}</span>
              <button
                type="button"
                onClick={() => setStep('mode')}
                className="ml-auto text-xs underline opacity-60"
              >
                Changer
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="ref-paiement" className="block text-sm font-medium text-ink">
                Référence {mode !== 'especes' ? '*' : '(optionnelle)'}
              </label>
              <input
                id="ref-paiement"
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder={selectedMode.placeholder}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="date-paiement" className="block text-sm font-medium text-ink">Date de paiement</label>
              <input
                id="date-paiement"
                type="date"
                value={datePaiement}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setDatePaiement(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg" role="alert">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('mode')}>
                ← Retour
              </Button>
              <Button
                className="flex-1"
                loading={loading}
                disabled={mode !== 'especes' && !reference}
                onClick={handleEncaisser}
              >
                Encaisser {formatCurrency(quittance.montant)}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && result && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-brand" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-ink">Paiement enregistré !</p>
              <p className="text-sm text-ink-muted mt-1">
                {formatCurrency(quittance.montant)} encaissés le {formatDate(datePaiement)}
              </p>
            </div>
            <div className="bg-surface-3 rounded-xl p-4 text-left space-y-2">
              {[
                ['Quittance',  quittance.numero],
                ['Mode',       selectedMode?.label ?? mode],
                ['Référence',  reference || '—'],
                ['Date',       formatDate(datePaiement)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-ink-subtle">{label}</span>
                  <span className="font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
            {result.toutes_payees && (
              <div className="bg-brand-soft border border-brand/30 rounded-lg p-3 text-sm text-brand-dark font-medium">
                🎉 Toutes les quittances de ce contrat sont réglées !
              </div>
            )}
            <Button className="w-full" onClick={onClose}>Fermer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
