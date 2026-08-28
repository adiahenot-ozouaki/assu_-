import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save, AlertTriangle } from 'lucide-react';
import { creerSinistre } from '../lib/sinistres.service';
import { getContrats } from '../lib/contrats.service';
import { useAuth } from '../hooks/useAuth';
import type { Contrat, BranchType } from '../types';
import type { NouveauSinistreForm, SinistreDocument } from '../types/sinistres';
import { Stepper } from '../components/ui/Stepper';
import { PhotoUploader } from '../components/sinistres/PhotoUploader';
import { Button, Card, Input } from '../components/ui';
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

const taClass =
  'w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand resize-none placeholder:text-ink-subtle';

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
      setStep(2);
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-ink-subtle hover:text-ink transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink font-display">Déclarer un sinistre</h1>
          <p className="text-sm text-ink-muted">Étape {step + 1} sur {STEPS.length}</p>
        </div>
      </div>

      <Card className="p-5 mb-6">
        <Stepper steps={STEPS} current={step} />
      </Card>

      {step === 0 && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Contrat concerné</h2>
              <p className="text-sm text-ink-muted">Sélectionnez le contrat sur lequel déclarer le sinistre</p>
            </div>
          </div>

          {selectedContrat ? (
            <SelectedContratCard
              contrat={selectedContrat}
              onClear={() => { setSelectedContrat(null); setValue('contrat_id', ''); }}
            />
          ) : (
            <div className="space-y-3">
              <label htmlFor="contrat-search" className="sr-only">Rechercher un contrat</label>
              <input
                id="contrat-search"
                type="search"
                placeholder="Rechercher par n° contrat ou nom client…"
                value={contratSearch}
                onChange={e => setContratSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {filteredContrats.length === 0 && (
                  <p className="text-sm text-ink-subtle text-center py-8">Aucun contrat actif trouvé.</p>
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
              Suivant <ArrowRight size={15} aria-hidden />
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-semibold text-ink">Informations du sinistre</h2>

            <div className="space-y-2">
              <p className="block text-sm font-medium text-ink">Nature du sinistre *</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Nature du sinistre">
                {natureOptions.map(n => {
                  const selected = watch('nature') === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue('nature', n)}
                      aria-pressed={selected}
                      className={clsx(
                        'text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                        selected
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-border text-ink-muted hover:border-border-strong hover:bg-surface-3'
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {errors.nature && <p className="text-xs text-red-500 dark:text-red-400">Requis</p>}
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

            <div className="space-y-1">
              <label htmlFor="desc-sinistre" className="block text-sm font-medium text-ink">Description des faits *</label>
              <textarea
                id="desc-sinistre"
                rows={4}
                placeholder="Décrivez précisément les circonstances du sinistre…"
                {...register('description', { required: 'Requis' })}
                className={taClass}
              />
              {errors.description && <p className="text-xs text-red-500 dark:text-red-400">Requis</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="montant-declare" className="block text-sm font-medium text-ink">Montant des dommages estimé (FCFA)</label>
                <div className="relative">
                  <input
                    id="montant-declare"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Ex : 500 000"
                    {...register('montant_declare', { min: 0 })}
                    className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 pr-16 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-ink-subtle"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">FCFA</span>
                </div>
              </div>
              <Input
                label="Expert désigné (si connu)"
                placeholder="Nom de l'expert"
                {...register('expert_nom')}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="notes-sinistre" className="block text-sm font-medium text-ink">Notes internes</label>
              <textarea
                id="notes-sinistre"
                rows={2}
                placeholder="Informations complémentaires pour les gestionnaires…"
                {...register('notes')}
                className={taClass}
              />
            </div>

            {serverError && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-lg" role="alert">{serverError}</p>
            )}

            <div className="flex justify-between pt-1">
              <Button type="button" variant="secondary" onClick={prev}>
                <ArrowLeft size={15} aria-hidden /> Précédent
              </Button>
              <Button type="submit" loading={saving}>
                <Save size={15} aria-hidden /> Enregistrer et continuer
              </Button>
            </div>
          </Card>
        </form>
      )}

      {step === 2 && createdId && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Pièces justificatives</h2>
            <p className="text-sm text-ink-muted mt-1">
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
              Continuer <ArrowRight size={15} aria-hidden />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && !createdId && (
        <Card className="p-6 text-center text-ink-muted">
          <p>Une erreur est survenue. Veuillez recommencer.</p>
          <Button className="mt-4" onClick={() => setStep(1)}>Retour</Button>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 sm:p-8 text-center space-y-5">
          <div className="w-20 h-20 bg-brand-soft rounded-full flex items-center justify-center mx-auto" aria-hidden>
            <span className="text-4xl">✅</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink font-display">Sinistre déclaré avec succès</h2>
            <p className="text-sm text-ink-muted mt-2">
              Le dossier a été ouvert et est en attente d'instruction.
            </p>
          </div>

          <div className="bg-surface-3 rounded-xl p-5 text-left space-y-3 max-w-sm mx-auto">
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

function SelectedContratCard({ contrat, onClear }: { contrat: Contrat; onClear: () => void }) {
  const branche = contrat.produit?.branche as BranchType | undefined;
  const clientNom = contrat.client?.est_personne_morale
    ? contrat.client.raison_sociale
    : `${contrat.client?.prenom ?? ''} ${contrat.client?.nom ?? ''}`.trim();

  return (
    <div className="flex items-center justify-between p-4 bg-brand-soft border-2 border-brand rounded-xl gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0" aria-hidden>{BRANCH_ICONS[branche ?? 'autre']}</span>
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">{clientNom}</p>
          <p className="text-sm text-ink-muted">{contrat.numero} · {contrat.produit?.nom}</p>
          <p className="text-xs text-ink-subtle mt-0.5">
            Prime : {formatCurrency(contrat.prime_annuelle)} · Échéance : {formatDate(contrat.date_echeance)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-ink-subtle hover:text-red-500 transition-colors underline shrink-0"
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
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-brand/40 hover:bg-brand-soft transition-all text-left"
    >
      <span className="text-xl shrink-0" aria-hidden>{BRANCH_ICONS[branche ?? 'autre']}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{clientNom}</p>
        <p className="text-xs text-ink-subtle">{contrat.numero} · {contrat.produit?.nom}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-ink">{formatCurrency(contrat.prime_annuelle)}</p>
        <p className="text-xs text-ink-subtle">/an</p>
      </div>
    </button>
  );
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-ink-subtle shrink-0">{label}</span>
      <span className="font-medium text-ink text-right">{value || '—'}</span>
    </div>
  );
}
