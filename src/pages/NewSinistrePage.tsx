import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save, AlertTriangle } from 'lucide-react';
import { creerSinistre, uploadDocument } from '../lib/sinistres.service';
import { getContrats } from '../lib/contrats.service';
import { useAuth } from '../hooks/useAuth';
import type { Contrat, BranchType } from '../types';
import type { NouveauSinistreForm, SinistreDocument } from '../types/sinistres';
import { Stepper } from '../components/ui/Stepper';
import { PhotoUploader } from '../components/sinistres/PhotoUploader';
import { Button, Card, Input, Spinner } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/supabase';
import { clsx } from 'clsx';

const STEPS = [
  { id: 0, label: 'Contrat',      icon: '📋' },
  { id: 1, label: 'Déclaration',  icon: '📝' },
  { id: 2, label: 'Documents',    icon: '📷' },
  { id: 3, label: 'Confirmation', icon: '✅' },
];

const NATURE_OPTIONS: Record<string, string[]> = {
  auto:  ['Collision / Accrochage', 'Vol du véhicule', 'Tentative de vol', 'Bris de glace', 'Incendie', 'Catastrophe naturelle', 'Vandalisme', 'Autre'],
  mrh:   ['Incendie', 'Dégâts des eaux', 'Vol / Cambriolage', 'Bris de glace', 'Catastrophe naturelle', 'Dommages électriques', 'Autre'],
  sante: ['Hospitalisation', 'Accident corporel', 'Maladie grave', 'Maternité', 'Soins dentaires', 'Évacuation sanitaire', 'Autre'],
  vie:   ['Décès', 'Invalidité permanente', 'Invalidité partielle', 'Autre'],
  autre: ['Sinistre matériel', 'Sinistre corporel', 'Responsabilité civile', 'Autre'],
};

const BRANCH_ICONS: Record<string, string> = {
  auto: '🚗', mrh: '🏠', sante: '🏥', vie: '❤️', autre: '📋',
};

export default function NewSinistrePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();

  const [step, setStep]               = useState(0);
  const [contrats, setContrats]       = useState<Contrat[]>([]);
  const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null);
  const [contratSearch, setContratSearch] = useState('');
  const [uploadedDocs, setUploadedDocs]   = useState<SinistreDocument[]>([]);
  const [createdId, setCreatedId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<NouveauSinistreForm>({
    defaultValues: {
      date_sinistre: new Date().toISOString().slice(0, 10),
    },
  });

  // Pre-select contrat from URL
  useEffect(() => {
    const cid = searchParams.get('contrat');
    if (cid) {
      getContrats({ pageSize: 100 }).then(r => {
        const c = r.data.find(x => x.id === cid);
        if (c) { setSelectedContrat(c); setValue('contrat_id', c.id); }
        setContrats(r.data.filter(x => x.status === 'actif'));
      });
    } else {
      getContrats({ status: 'actif', pageSize: 100 }).then(r => setContrats(r.data));
    }
  }, [searchParams, setValue]);

  // Filter contrats by search
  const filteredContrats = contrats.filter(c => {
    const nom = c.client?.est_personne_morale
      ? c.client.raison_sociale ?? ''
      : `${c.client?.prenom ?? ''} ${c.client?.nom ?? ''}`.trim();
    const search = contratSearch.toLowerCase();
    return !search || c.numero.toLowerCase().includes(search) || nom.toLowerCase().includes(search);
  });

  const branche = selectedContrat?.produit?.branche as BranchType | undefined;
  const natureOptions = NATURE_OPTIONS[branche ?? 'autre'] ?? NATURE_OPTIONS.autre;

  const canNext = () => {
    if (step === 0) return !!selectedContrat;
    if (step === 1) return !!watch('nature') && !!watch('date_sinistre');
    return true;
  };

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  // Submit : crée le sinistre puis attache les documents
  const onSubmit = async (data: NouveauSinistreForm) => {
    setSaving(true);
    setServerError('');
    try {
      const sinistre = await creerSinistre({
        ...data,
        contrat_id: selectedContrat!.id,
        agent_id: profile?.role === 'agent' ? profile.id : undefined,
        montant_declare: data.montant_declare ? Number(data.montant_declare) : undefined,
      });
      setCreatedId(sinistre.id);
      setStep(2); // Go to upload step with the real sinistre_id
    } catch (err: any) {
      setServerError(err.message ?? 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    if (createdId) navigate(`/sinistres/${createdId}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Déclarer un sinistre</h1>
          <p className="text-sm text-gray-500">Étape {step + 1} sur {STEPS.length}</p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="p-5 mb-6">
        <Stepper steps={STEPS} current={step} />
      </Card>

      {/* ── STEP 0 : Sélection contrat ── */}
      {step === 0 && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Contrat concerné</h2>
              <p className="text-sm text-gray-500">Sélectionnez le contrat sur lequel déclarer le sinistre</p>
            </div>
          </div>

          {selectedContrat ? (
            <SelectedContratCard
              contrat={selectedContrat}
              onClear={() => { setSelectedContrat(null); setValue('contrat_id', ''); }}
            />
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Rechercher par n° contrat ou nom client…"
                value={contratSearch}
                onChange={e => setContratSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875]"
              />
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredContrats.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun contrat actif trouvé.</p>
                )}
                {filteredContrats.map(c => (
                  <ContratOption
                    key={c.id}
                    contrat={c}
                    onSelect={() => { setSelectedContrat(c); setValue('contrat_id', c.id); }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={next} disabled={!canNext()}>
              Suivant <ArrowRight size={15} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1 : Déclaration ── */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Informations du sinistre</h2>

            {/* Nature */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nature du sinistre *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {natureOptions.map(n => {
                  const selected = watch('nature') === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue('nature', n)}
                      className={clsx(
                        'text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                        selected
                          ? 'border-[#00C875] bg-[#00C875]/10 text-[#00A35E]'
                          : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {errors.nature && <p className="text-xs text-red-500">Requis</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date du sinistre *"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register('date_sinistre', { required: 'Requis' })}
                error={errors.date_sinistre?.message}
              />
              <Input
                label="Lieu du sinistre"
                placeholder="Ex : Rond-point de la Démocratie, Libreville"
                {...register('lieu')}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Description des faits *</label>
              <textarea
                rows={4}
                placeholder="Décrivez précisément les circonstances du sinistre : date, heure, lieu, circonstances, tiers impliqués…"
                {...register('description', { required: 'Requis' })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none placeholder:text-gray-400"
              />
              {errors.description && <p className="text-xs text-red-500">Requis</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Montant des dommages estimé (FCFA)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Ex : 500 000"
                    {...register('montant_declare', { min: 0 })}
                    className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent placeholder:text-gray-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">FCFA</span>
                </div>
              </div>
              <Input
                label="Expert désigné (si connu)"
                placeholder="Nom de l'expert"
                {...register('expert_nom')}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Notes internes</label>
              <textarea
                rows={2}
                placeholder="Informations complémentaires pour les gestionnaires…"
                {...register('notes')}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none placeholder:text-gray-400"
              />
            </div>

            {serverError && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{serverError}</p>
            )}

            <div className="flex justify-between pt-1">
              <Button type="button" variant="secondary" onClick={prev}>
                <ArrowLeft size={15} /> Précédent
              </Button>
              <Button type="submit" loading={saving}>
                <Save size={15} /> Enregistrer et continuer
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ── STEP 2 : Upload documents ── */}
      {step === 2 && createdId && (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Pièces justificatives</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ajoutez photos, constats, factures et tout document utile à l'instruction du dossier.
            </p>
          </div>

          <PhotoUploader
            sinistre_id={createdId}
            existingDocs={uploadedDocs}
            onDocumentAdded={doc => setUploadedDocs(prev => [...prev, doc])}
            onDocumentRemoved={id => setUploadedDocs(prev => prev.filter(d => d.id !== id))}
          />

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Passer cette étape
            </Button>
            <Button onClick={() => setStep(3)}>
              Continuer <ArrowRight size={15} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2 sans sinistre créé (ne devrait pas arriver) ── */}
      {step === 2 && !createdId && (
        <Card className="p-6 text-center text-gray-500">
          <p>Une erreur est survenue. Veuillez recommencer.</p>
          <Button className="mt-4" onClick={() => setStep(1)}>Retour</Button>
        </Card>
      )}

      {/* ── STEP 3 : Confirmation ── */}
      {step === 3 && (
        <Card className="p-8 text-center space-y-5">
          <div className="w-20 h-20 bg-[#00C875]/15 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">✅</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sinistre déclaré avec succès</h2>
            <p className="text-sm text-gray-500 mt-2">
              Le dossier a été ouvert et est en attente d'instruction.
            </p>
          </div>

          {/* Recap */}
          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 max-w-sm mx-auto">
            {selectedContrat && (
              <>
                <RecapLine label="Client" value={
                  selectedContrat.client?.est_personne_morale
                    ? selectedContrat.client.raison_sociale ?? '—'
                    : `${selectedContrat.client?.prenom ?? ''} ${selectedContrat.client?.nom ?? ''}`.trim()
                } />
                <RecapLine label="Contrat"  value={selectedContrat.numero} />
                <RecapLine label="Branche"  value={`${BRANCH_ICONS[branche ?? 'autre']} ${branche ?? '—'}`} />
              </>
            )}
            <RecapLine label="Nature"      value={watch('nature')} />
            <RecapLine label="Date"        value={formatDate(watch('date_sinistre'))} />
            {watch('montant_declare') && (
              <RecapLine label="Montant estimé" value={formatCurrency(Number(watch('montant_declare')))} />
            )}
            <RecapLine label="Documents"   value={`${uploadedDocs.length} fichier(s) joint(s)`} />
            <RecapLine label="Statut"      value="🟡 Ouvert" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/sinistres')}>
              Voir tous les sinistres
            </Button>
            <Button onClick={handleFinish}>
              Ouvrir le dossier →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function SelectedContratCard({ contrat, onClear }: { contrat: Contrat; onClear: () => void }) {
  const branche = contrat.produit?.branche as BranchType | undefined;
  const clientNom = contrat.client?.est_personne_morale
    ? contrat.client.raison_sociale
    : `${contrat.client?.prenom ?? ''} ${contrat.client?.nom ?? ''}`.trim();

  return (
    <div className="flex items-center justify-between p-4 bg-[#00C875]/8 border-2 border-[#00C875] rounded-xl">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{BRANCH_ICONS[branche ?? 'autre']}</span>
        <div>
          <p className="font-semibold text-gray-900">{clientNom}</p>
          <p className="text-sm text-gray-500">{contrat.numero} · {contrat.produit?.nom}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Prime : {formatCurrency(contrat.prime_annuelle)} · Échéance : {formatDate(contrat.date_echeance)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
      >
        Changer
      </button>
    </div>
  );
}

function ContratOption({ contrat, onSelect }: { contrat: Contrat; onSelect: () => void }) {
  const branche = contrat.produit?.branche as BranchType | undefined;
  const clientNom = contrat.client?.est_personne_morale
    ? contrat.client.raison_sociale
    : `${contrat.client?.prenom ?? ''} ${contrat.client?.nom ?? ''}`.trim();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-[#00C875]/40 hover:bg-[#00C875]/5 transition-all text-left"
    >
      <span className="text-xl shrink-0">{BRANCH_ICONS[branche ?? 'autre']}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{clientNom}</p>
        <p className="text-xs text-gray-400">{contrat.numero} · {contrat.produit?.nom}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-gray-700">{formatCurrency(contrat.prime_annuelle)}</p>
        <p className="text-xs text-gray-400">/an</p>
      </div>
    </button>
  );
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}
