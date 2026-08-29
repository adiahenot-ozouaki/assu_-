import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  creerAvenant, getTransitionsAutorisees,
  AVENANT_CFG, type TypeAvenant, type CreateAvenantPayload,
} from '../../lib/avenants.service';
import { formatCurrency } from '../../lib/supabase';
import { Button, Input } from '../ui';
import { clsx } from 'clsx';

interface AvenantModalProps {
  contratId:      string;
  contratNumero:  string;
  contratStatus:  string;
  primeActuelle:  number;
  devise?:        string;
  onClose:        () => void;
  onSuccess:      (avenant: any) => void;
}

export function AvenantModal({
  contratId, contratNumero, contratStatus,
  primeActuelle, devise = 'FCFA', onClose, onSuccess,
}: AvenantModalProps) {
  const transitions = getTransitionsAutorisees(contratStatus);

  const [step, setStep]           = useState<'choix' | 'details' | 'confirm' | 'done'>('choix');
  const [type, setType]           = useState<TypeAvenant | null>(null);
  const [dateEffet, setDateEffet] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDesc]    = useState('');
  const [motif, setMotif]         = useState('');
  const [nouvellePrime, setNvPrime] = useState<string>('');
  const [deltaPrime, setDeltaPrime] = useState<string>('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<any>(null);

  const cfg = type ? AVENANT_CFG[type] : null;

  const handleSubmit = async () => {
    if (!type) return;
    setLoading(true); setError('');
    try {
      const payload: CreateAvenantPayload = {
        contrat_id:   contratId,
        type_avenant: type,
        date_effet:   dateEffet,
        description:  description || undefined,
        motif:        motif || undefined,
        nouvelle_prime: nouvellePrime ? Number(nouvellePrime) : undefined,
        delta_prime:  deltaPrime ? Number(deltaPrime) : undefined,
      };
      const avenant = await creerAvenant(payload);
      setResult(avenant);
      setStep('done');
      onSuccess(avenant);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création de l\'avenant');
    } finally {
      setLoading(false);
    }
  };

  const nouviPrimeNum = nouvellePrime ? Number(nouvellePrime) : null;
  const deltaNum      = deltaPrime    ? Number(deltaPrime)    : null;
  const primeFinale   = nouviPrimeNum ?? (deltaNum != null ? primeActuelle + deltaNum : primeActuelle);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-2 rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="avenant-title">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 id="avenant-title" className="text-base font-semibold text-ink">
              {step === 'done' ? '✅ Avenant créé' : 'Nouvel avenant'}
            </h2>
            <p className="text-xs text-ink-subtle mt-0.5">Contrat {contratNumero}</p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-subtle hover:text-ink transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {step === 'choix' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-ink-muted">
              Statut actuel : <span className="font-semibold text-ink capitalize">{contratStatus}</span>.
              Sélectionnez le type d'avenant à créer.
            </p>
            <div className="space-y-2">
              {transitions.map(t => {
                const c = AVENANT_CFG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setStep('details'); }}
                    className={clsx(
                      'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      'border-border hover:border-brand/40 hover:bg-brand-soft'
                    )}
                  >
                    <span className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', c.bg)} aria-hidden>
                      {c.icon}
                    </span>
                    <div>
                      <p className={clsx('font-semibold text-sm', c.color)}>{c.label}</p>
                      <p className="text-xs text-ink-subtle mt-0.5">
                        {t === 'suspension'          && 'Mettre temporairement en pause la couverture'}
                        {t === 'remise_en_vigueur'   && 'Réactiver un contrat suspendu'}
                        {t === 'modification_prime'  && 'Ajuster la prime annuelle ou mensuelle'}
                        {t === 'resiliation'         && 'Mettre fin définitivement au contrat'}
                        {t === 'modification_objet'  && 'Modifier les caractéristiques du bien assuré'}
                        {t === 'autre'               && 'Tout autre type de modification contractuelle'}
                      </p>
                    </div>
                    <span className="ml-auto text-ink-subtle text-lg" aria-hidden>→</span>
                  </button>
                );
              })}
            </div>
            {transitions.length === 0 && (
              <div className="text-center py-6 text-ink-subtle">
                <AlertTriangle size={24} className="mx-auto mb-2 text-ink-subtle" aria-hidden />
                <p className="text-sm">Aucun avenant possible sur un contrat {contratStatus}.</p>
              </div>
            )}
          </div>
        )}

        {step === 'details' && cfg && type && (
          <div className="p-6 space-y-4">
            <div className={clsx('flex items-center gap-3 p-3 rounded-xl', cfg.bg)}>
              <span className="text-2xl" aria-hidden>{cfg.icon}</span>
              <div>
                <p className={clsx('font-semibold text-sm', cfg.color)}>{cfg.label}</p>
                {cfg.targetStatus && (
                  <p className="text-xs text-ink-muted">
                    Le contrat passera en statut <strong>{cfg.targetStatus}</strong>
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setStep('choix')} className="ml-auto text-xs text-ink-subtle hover:text-ink-muted underline">
                Changer
              </button>
            </div>

            {type === 'resiliation' && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-3 flex gap-2" role="alert">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" aria-hidden />
                <p className="text-xs text-red-600 dark:text-red-300">
                  La résiliation est <strong>irréversible</strong>. Toutes les quittances futures non payées seront annulées.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Input
                label="Date d'effet *"
                type="date"
                value={dateEffet}
                onChange={e => setDateEffet(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />

              {cfg.requiresPrime && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg text-sm">
                    <span className="text-ink-muted">Prime actuelle :</span>
                    <span className="font-bold text-ink">{formatCurrency(primeActuelle, devise)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-ink">
                        Nouvelle prime ({devise})
                      </label>
                      <input
                        type="number"
                        placeholder={String(primeActuelle)}
                        value={nouvellePrime}
                        onChange={e => { setNvPrime(e.target.value); setDeltaPrime(''); }}
                        className="w-full rounded-lg border border-border bg-surface-2 text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-ink">
                        Ou variation ({devise})
                      </label>
                      <input
                        type="number"
                        placeholder="Ex : +10000 ou -5000"
                        value={deltaPrime}
                        onChange={e => { setDeltaPrime(e.target.value); setNvPrime(''); }}
                        className="w-full rounded-lg border border-border bg-surface-2 text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                  {(nouvellePrime || deltaPrime) && (
                    <div className="flex items-center gap-2 p-2.5 bg-brand-soft rounded-lg text-sm">
                      <span className="text-ink-muted">Prime finale :</span>
                      <span className="font-bold text-brand-dark">{formatCurrency(primeFinale, devise)}</span>
                    </div>
                  )}
                </div>
              )}

              {cfg.requiresMotif && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-ink">
                    Motif * <span className="text-ink-subtle font-normal">(obligatoire)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder="Précisez la raison de cette opération..."
                    className="w-full text-sm border border-border bg-surface-2 text-ink rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink">Description (optionnel)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Informations complémentaires..."
                  className="w-full text-sm border border-border bg-surface-2 text-ink rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg" role="alert">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => setStep('choix')} className="flex-1">
                ← Retour
              </Button>
              <Button
                onClick={handleSubmit}
                loading={loading}
                className="flex-1"
                disabled={cfg.requiresMotif && !motif}
              >
                Créer l'avenant
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && result && cfg && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-brand" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-ink">Avenant N°{result.numero} créé</p>
              <p className="text-sm text-ink-muted mt-1">{cfg.label} · Effet au {dateEffet}</p>
            </div>
            <div className="bg-surface-3 rounded-xl p-4 text-left space-y-2">
              {[
                ['Type',           cfg.label],
                ['Date d\'effet',  dateEffet],
                ['Statut contrat', result.nouveau_status ?? '—'],
                ...(primeFinale !== primeActuelle
                  ? [['Nouvelle prime', formatCurrency(primeFinale, devise)]]
                  : []),
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-ink-subtle">{l}</span>
                  <span className="font-medium text-ink capitalize">{v}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={onClose}>Fermer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
