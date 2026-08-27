import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';

import type { BranchType, Client, Produit } from '../types';
import { getClients } from '../lib/clients.service';
import { getProduits } from '../lib/produits.service';
import { createContrat } from '../lib/contrats.service';
import { useAuth } from '../hooks/useAuth';

import { Stepper, type Step } from '../components/ui/Stepper';
import { BranchSelector } from '../components/contrats/BranchSelector';
import { AutoObjetForm, AutoGaranties } from '../components/contrats/AutoForm';
import {
  MRHObjetForm, MRHGaranties,
  SanteObjetForm, SanteGaranties,
  VieObjetForm, VieGaranties,
  AutreObjetForm,
} from '../components/contrats/BranchForms';
import { ContratRecap } from '../components/contrats/ContratRecap';
import { Button, Card, Input, Select, Spinner } from '../components/ui';

// ── Steps ─────────────────────────────────────────────────────
const STEPS: Step[] = [
  { id: 0, label: 'Branche',    icon: '📂' },
  { id: 1, label: 'Client',     icon: '👤' },
  { id: 2, label: 'Objet',      icon: '🔍' },
  { id: 3, label: 'Garanties',  icon: '🛡️' },
  { id: 4, label: 'Conditions', icon: '💰' },
];

// ── Default garanties per branch ──────────────────────────────
const DEFAULT_GARANTIES: Record<BranchType, Record<string, boolean>> = {
  auto:  { rc: true  },
  mrh:   { incendie: true },
  sante: { hospitalisation: true },
  vie:   { deces: true },
  autre: {},
};

// ── Form type ─────────────────────────────────────────────────
interface FormData {
  client_id: string;
  produit_id: string;
  date_effet: string;
  date_echeance: string;
  prime_annuelle: number;
  franchise: number;
  devise: string;
  conditions: string;
  notes: string;
  objet_assure: Record<string, any>;
}

export default function NewContratPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();

  // State
  const [step, setStep]             = useState(0);
  const [branche, setBranche]       = useState<BranchType | ''>('');
  const [garanties, setGaranties]   = useState<Record<string, boolean>>({});
  const [clients, setClients]       = useState<Client[]>([]);
  const [produits, setProduits]     = useState<Produit[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [saving, setSaving]         = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register, handleSubmit, watch, setValue, getValues,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      client_id: searchParams.get('client') ?? '',
      devise: 'FCFA',
      franchise: 0,
    },
  });

  const watchedValues = watch();

  // Load clients on search
  useEffect(() => {
    getClients({ search: clientSearch, pageSize: 20 })
      .then(r => setClients(r.data));
  }, [clientSearch]);

  // Load produits when branch selected
  useEffect(() => {
    if (branche) {
      getProduits(branche).then(setProduits);
      setGaranties(DEFAULT_GARANTIES[branche] ?? {});
    }
  }, [branche]);

  // Pre-select client from URL param
  useEffect(() => {
    const cid = searchParams.get('client');
    if (cid) {
      getClients({ search: cid, pageSize: 5 })
        .then(r => { if (r.data[0]) setSelectedClient(r.data[0]); });
    }
  }, [searchParams]);

  // Auto-set echeance = effet + 1 year
  const dateEffet = watch('date_effet');
  useEffect(() => {
    if (dateEffet) {
      const d = new Date(dateEffet);
      d.setFullYear(d.getFullYear() + 1);
      setValue('date_echeance', d.toISOString().slice(0, 10));
    }
  }, [dateEffet, setValue]);

  // ── Navigation ──────────────────────────────────────────────
  const canNext = useCallback(() => {
    if (step === 0) return !!branche;
    if (step === 1) return !!watch('client_id') && !!watch('produit_id');
    return true;
  }, [step, branche, watch]);

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  // ── Submit ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setServerError('');
    try {
      const contrat = await createContrat({
        ...data,
        agent_id: profile?.role === 'agent' ? profile.id : undefined,
        status: 'brouillon',
        objet_assure: data.objet_assure,
        garanties,
        prime_annuelle: Number(data.prime_annuelle),
        franchise: Number(data.franchise ?? 0),
      });
      navigate(`/contrats/${contrat.id}`);
    } catch (err: any) {
      setServerError(err.message ?? 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // ── Recap data ──────────────────────────────────────────────
  const recapData = {
    branche: branche || undefined,
    produit_nom: selectedProduit?.nom,
    client_nom: selectedClient
      ? (selectedClient.est_personne_morale
          ? selectedClient.raison_sociale
          : `${selectedClient.prenom ?? ''} ${selectedClient.nom}`.trim())
      : undefined,
    date_effet: watchedValues.date_effet,
    date_echeance: watchedValues.date_echeance,
    prime_annuelle: Number(watchedValues.prime_annuelle) || undefined,
    devise: watchedValues.devise,
    garanties,
    objet_assure: watchedValues.objet_assure,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nouveau contrat</h1>
          <p className="text-sm text-gray-500">Étape {step + 1} sur {STEPS.length}</p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="p-5 mb-6">
        <Stepper steps={STEPS} current={step} />
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-6 items-start">
          {/* ── Main panel ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* STEP 0 — Branche */}
            {step === 0 && (
              <Card className="p-6 space-y-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Choisissez la branche d'assurance
                </h2>
                <BranchSelector
                  value={branche}
                  onChange={b => { setBranche(b); setValue('produit_id', ''); setSelectedProduit(null); }}
                />
              </Card>
            )}

            {/* STEP 1 — Client + Produit */}
            {step === 1 && (
              <Card className="p-6 space-y-5">
                <h2 className="text-base font-semibold text-gray-900">Client & Produit</h2>

                {/* Client search */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Souscripteur *</label>
                  {selectedClient ? (
                    <div className="flex items-center justify-between p-3 bg-[#00C875]/8 border border-[#00C875] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00C875]/20 flex items-center justify-center text-xs font-bold text-[#00A35E]">
                          {selectedClient.est_personne_morale
                            ? '🏢'
                            : `${selectedClient.prenom?.[0] ?? ''}${selectedClient.nom[0]}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedClient.est_personne_morale
                              ? selectedClient.raison_sociale
                              : `${selectedClient.prenom ?? ''} ${selectedClient.nom}`.trim()}
                          </p>
                          <p className="text-xs text-gray-500">{selectedClient.code_client}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedClient(null); setValue('client_id', ''); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Changer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Rechercher un client…"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                      />
                      {clients.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          {clients.slice(0, 6).map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedClient(c);
                                setValue('client_id', c.id);
                                setClientSearch('');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                {c.est_personne_morale ? '🏢' : `${c.prenom?.[0] ?? ''}${c.nom[0]}`}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {c.est_personne_morale ? c.raison_sociale : `${c.prenom ?? ''} ${c.nom}`.trim()}
                                </p>
                                <p className="text-xs text-gray-400">{c.code_client}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {errors.client_id && <p className="text-xs text-red-500">Requis</p>}
                </div>

                {/* Produit */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Produit *</label>
                  {produits.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucun produit disponible pour cette branche.</p>
                  ) : (
                    <div className="space-y-2">
                      {produits.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            watch('produit_id') === p.id
                              ? 'border-[#00C875] bg-[#00C875]/8'
                              : 'border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            value={p.id}
                            {...register('produit_id', { required: true })}
                            onChange={() => { setValue('produit_id', p.id); setSelectedProduit(p); }}
                            className="mt-0.5 accent-[#00C875]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900">{p.nom}</p>
                              {(p.prime_min || p.prime_max) && (
                                <span className="text-xs text-gray-400">
                                  {p.prime_min?.toLocaleString()} – {p.prime_max?.toLocaleString()} FCFA/an
                                </span>
                              )}
                            </div>
                            {p.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* STEP 2 — Objet assuré (dynamic by branch) */}
            {step === 2 && (
              <Card className="p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">Objet assuré</h2>
                {branche === 'auto'  && <AutoObjetForm  register={register} errors={errors} />}
                {branche === 'mrh'   && <MRHObjetForm   register={register} errors={errors} />}
                {branche === 'sante' && <SanteObjetForm register={register} errors={errors} />}
                {branche === 'vie'   && <VieObjetForm   register={register} errors={errors} />}
                {branche === 'autre' && <AutreObjetForm register={register} />}
              </Card>
            )}

            {/* STEP 3 — Garanties */}
            {step === 3 && (
              <Card className="p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">Garanties</h2>
                {branche === 'auto'  && <AutoGaranties  values={garanties} onChange={(k, v) => setGaranties(g => ({ ...g, [k]: v }))} />}
                {branche === 'mrh'   && <MRHGaranties   values={garanties} onChange={(k, v) => setGaranties(g => ({ ...g, [k]: v }))} />}
                {branche === 'sante' && <SanteGaranties values={garanties} onChange={(k, v) => setGaranties(g => ({ ...g, [k]: v }))} />}
                {branche === 'vie'   && <VieGaranties   values={garanties} onChange={(k, v) => setGaranties(g => ({ ...g, [k]: v }))} />}
                {branche === 'autre' && (
                  <p className="text-sm text-gray-500 italic">Les garanties seront précisées dans les conditions particulières.</p>
                )}
              </Card>
            )}

            {/* STEP 4 — Conditions financières */}
            {step === 4 && (
              <Card className="p-6 space-y-5">
                <h2 className="text-base font-semibold text-gray-900">Conditions du contrat</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date d'effet *"
                    type="date"
                    {...register('date_effet', { required: 'Requis' })}
                    error={errors.date_effet?.message}
                  />
                  <Input
                    label="Date d'échéance *"
                    type="date"
                    {...register('date_echeance', { required: 'Requis' })}
                    error={errors.date_echeance?.message}
                  />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Prime annuelle (FCFA) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1000"
                        min={0}
                        placeholder="Ex : 95 000"
                        {...register('prime_annuelle', {
                          required: 'Requis',
                          min: { value: 1, message: 'Doit être > 0' },
                        })}
                        className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">FCFA</span>
                    </div>
                    {errors.prime_annuelle && <p className="text-xs text-red-500">{errors.prime_annuelle.message}</p>}
                    {watchedValues.prime_annuelle > 0 && (
                      <p className="text-xs text-gray-400">
                        ≈ {Math.round(Number(watchedValues.prime_annuelle) / 12).toLocaleString()} FCFA / mois
                      </p>
                    )}
                  </div>
                  <Input
                    label="Franchise (FCFA)"
                    type="number"
                    step="1000"
                    min={0}
                    placeholder="0"
                    {...register('franchise', { min: 0 })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Conditions particulières</label>
                  <textarea
                    rows={3}
                    placeholder="Clauses spéciales, exclusions, remarques…"
                    {...register('conditions')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Notes internes</label>
                  <textarea
                    rows={2}
                    placeholder="Notes visibles uniquement par les agents…"
                    {...register('notes')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent resize-none"
                  />
                </div>

                {serverError && (
                  <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{serverError}</p>
                )}
              </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pb-8">
              <Button
                type="button"
                variant="secondary"
                onClick={step === 0 ? () => navigate(-1) : prev}
              >
                <ArrowLeft size={15} /> {step === 0 ? 'Annuler' : 'Précédent'}
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} disabled={!canNext()}>
                  Suivant <ArrowRight size={15} />
                </Button>
              ) : (
                <Button type="submit" loading={saving}>
                  <Save size={15} /> Enregistrer le contrat
                </Button>
              )}
            </div>
          </div>

          {/* ── Sidebar recap ── */}
          <div className="w-72 shrink-0 hidden lg:block">
            <Card className="p-5 sticky top-6">
              <ContratRecap data={recapData} />
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
