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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'done' ? '✅ Avenant créé' : 'Nouvel avenant'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Contrat {contratNumero}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── ÉTAPE 1 : Choix du type ── */}
        {step === 'choix' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Statut actuel : <span className="font-semibold text-gray-900 capitalize">{contratStatus}</span>.
              Sélectionnez le type d'avenant à créer.
            </p>
            <div className="space-y-2">
              {transitions.map(t => {
                const c = AVENANT_CFG[t];
                return (
                  <button
                    key={t}
                    onClick={() => { setType(t); setStep('details'); }}
                    className={clsx(
                      'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      'border-gray-100 hover:border-[#00C875]/40 hover:bg-[#00C875]/5'
                    )}
                  >
                    <span className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', c.bg)}>
                      {c.icon}
                    </span>
                    <div>
                      <p className={clsx('font-semibold text-sm', c.color)}>{c.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t === 'suspension'          && 'Mettre temporairement en pause la couverture'}
                        {t === 'remise_en_vigueur'   && 'Réactiver un contrat suspendu'}
                        {t === 'modification_prime'  && 'Ajuster la prime annuelle ou mensuelle'}
                        {t === 'resiliation'         && 'Mettre fin définitivement au contrat'}
                        {t === 'modification_objet'  && 'Modifier les caractéristiques du bien assuré'}
                        {t === 'autre'               && 'Tout autre type de modification contractuelle'}
                      </p>
                    </div>
                    <span className="ml-auto text-gray-300 text-lg">→</span>
                  </button>
                );
              })}
            </div>
            {transitions.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <AlertTriangle size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucun avenant possible sur un contrat {contratStatus}.</p>
              </div>
            )}
          </div>
        )}

        {/* ── ÉTAPE 2 : Détails ── */}
        {step === 'details' && cfg && type && (
          <div className="p-6 space-y-4">
            {/* Type recap */}
            <div className={clsx('flex items-center gap-3 p-3 rounded-xl', cfg.bg)}>
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <p className={clsx('font-semibold text-sm', cfg.color)}>{cfg.label}</p>
                {cfg.targetStatus && (
                  <p className="text-xs text-gray-500">
                    Le contrat passera en statut <strong>{cfg.targetStatus}</strong>
                  </p>
                )}
              </div>
              <button onClick={() => setStep('choix')} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                Changer
              </button>
            </div>

            {/* Alerte résiliation */}
            {type === 'resiliation' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">
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

              {/* Prime fields */}
              {cfg.requiresPrime && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-500">Prime actuelle :</span>
                    <span className="font-bold text-gray-900">{formatCurrency(primeActuelle, devise)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Nouvelle prime ({devise})
                      </label>
                      <input
                        type="number"
                        placeholder={String(primeActuelle)}
                        value={nouvellePrime}
                        onChange={e => { setNvPrime(e.target.value); setDeltaPrime(''); }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Ou variation ({devise})
                      </label>
                      <input
                        type="number"
                        placeholder="Ex : +10000 ou -5000"
                        value={deltaPrime}
                        onChange={e => { setDeltaPrime(e.target.value); setNvPrime(''); }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                      />
                    </div>
                  </div>
                  {(nouvellePrime || deltaPrime) && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#00C875]/10 rounded-lg text-sm">
                      <span className="text-gray-500">Prime finale :</span>
                      <span className="font-bold text-[#00A35E]">{formatCurrency(primeFinale, devise)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Motif */}
              {cfg.requiresMotif && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Motif * <span className="text-gray-400 font-normal">(obligatoire)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder="Précisez la raison de cette opération..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Informations complémentaires..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
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

        {/* ── ÉTAPE 3 : Succès ── */}
        {step === 'done' && result && cfg && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-[#00C875]/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-[#00C875]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Avenant N°{result.numero} créé</p>
              <p className="text-sm text-gray-500 mt-1">{cfg.label} · Effet au {dateEffet}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
              {[
                ['Type',           cfg.label],
                ['Date d\'effet',  dateEffet],
                ['Statut contrat', result.nouveau_status ?? '—'],
                ...(primeFinale !== primeActuelle
                  ? [['Nouvelle prime', formatCurrency(primeFinale, devise)]]
                  : []),
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-400">{l}</span>
                  <span className="font-medium text-gray-800 capitalize">{v}</span>
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
