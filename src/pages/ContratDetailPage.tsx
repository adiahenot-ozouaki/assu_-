import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, CreditCard,
  FileText, Shield, CheckCircle2, RefreshCw, GitBranch,
} from 'lucide-react';
import { getContratById, updateContrat } from '../lib/contrats.service';
import { genererQuittances } from '../lib/quittances.service';
import { getAvenantsContrat, getTransitionsAutorisees, type Avenant } from '../lib/avenants.service';
import { PdfButton } from '../components/pdf/PdfButton';
import { AvenantModal } from '../components/contrats/AvenantModal';
import { AvenantTimeline } from '../components/contrats/AvenantTimeline';
import type { Contrat, ContratStatus, BranchType, PaiementStatus, SinistreStatus } from '../types';
import {
  ContratStatusBadge, BranchBadge,
  Button, Card, Spinner, Badge
} from '../components/ui';
import { formatDate, formatCurrency } from '../lib/supabase';

const BRANCH_INFO: Record<BranchType, { icon: string; color: string }> = {
  auto:  { icon: '🚗', color: 'bg-blue-50 dark:bg-blue-500/15'   },
  mrh:   { icon: '🏠', color: 'bg-amber-50 dark:bg-amber-500/15'  },
  sante: { icon: '🏥', color: 'bg-emerald-50 dark:bg-emerald-500/15'},
  vie:   { icon: '❤️', color: 'bg-rose-50 dark:bg-rose-500/15'   },
  autre: { icon: '📋', color: 'bg-surface-3'   },
};

const PAIE_CFG: Record<PaiementStatus, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' }> = {
  payé:        { label: 'Payée',      variant: 'green' },
  en_attente:  { label: 'En attente', variant: 'amber' },
  en_retard:   { label: 'En retard',  variant: 'red'   },
  annulé:      { label: 'Annulée',    variant: 'gray'  },
};

const SINISTRE_CFG: Record<SinistreStatus, { label: string; variant: 'blue' | 'amber' | 'green' | 'red' | 'gray' }> = {
  ouvert:          { label: 'Ouvert',         variant: 'blue'  },
  en_instruction:  { label: 'En instruction', variant: 'amber' },
  'réglé':         { label: 'Réglé',          variant: 'green' },
  'rejeté':        { label: 'Rejeté',         variant: 'red'   },
  sans_suite:      { label: 'Sans suite',      variant: 'gray'  },
};

export default function ContratDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating]     = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg]         = useState('');
  const [avenants, setAvenants]         = useState<Avenant[]>([]);
  const [showAvenantModal, setShowAvenantModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    getContratById(id).then(c => {
      setContrat(c);
      getAvenantsContrat(id).then(setAvenants);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleRegenerate = async () => {
    if (!contrat) return;
    setRegenerating(true);
    setRegenMsg('');
    try {
      const res = await genererQuittances(contrat.id);
      setRegenMsg(`✅ ${res.nb_quittances} quittances régénérées`);
      const updated = await getContratById(contrat.id);
      setContrat(updated);
    } catch (err: any) {
      setRegenMsg(`❌ ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleActivate = async () => {
    if (!contrat) return;
    setActivating(true);
    const updated = await updateContrat(contrat.id, { status: 'actif' });
    setContrat(updated);
    setActivating(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" role="status">
      <Spinner className="w-8 h-8 text-brand" />
    </div>
  );

  if (!contrat) return (
    <div className="p-6 text-center text-ink-muted">Contrat introuvable.</div>
  );

  const branche = contrat.produit?.branche as BranchType | undefined;
  const brInfo  = branche ? BRANCH_INFO[branche] : BRANCH_INFO.autre;
  const objet   = contrat.objet_assure as Record<string, any> | undefined;
  const garanties = contrat.garanties as Record<string, boolean> | undefined;
  const activeGaranties = Object.entries(garanties ?? {}).filter(([, v]) => v).map(([k]) => k);

  const clientNom = contrat.client
    ? contrat.client.est_personne_morale
      ? contrat.client.raison_sociale
      : `${contrat.client.prenom ?? ''} ${contrat.client.nom}`.trim()
    : '—';

  const today    = new Date();
  const start    = new Date(contrat.date_effet);
  const end      = new Date(contrat.date_echeance);
  const total    = end.getTime() - start.getTime();
  const elapsed  = Math.min(today.getTime() - start.getTime(), total);
  const progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors self-start"
        >
          <ArrowLeft size={16} aria-hidden /> Retour
        </button>
        <div className="flex gap-2 flex-wrap">
          {contrat.status === 'brouillon' && (
            <Button onClick={handleActivate} loading={activating}>
              <CheckCircle2 size={14} aria-hidden /> Activer le contrat
            </Button>
          )}
          {contrat.status === 'actif' && (
            <Button variant="secondary" onClick={handleRegenerate} loading={regenerating}>
              <RefreshCw size={14} aria-hidden /> Régénérer quittances
            </Button>
          )}
          {contrat.status === 'actif' && (
            <PdfButton type="attestation" id={contrat.id} ref={contrat.numero} size="sm" />
          )}
          {getTransitionsAutorisees(contrat.status).length > 0 && (
            <Button variant="secondary" onClick={() => setShowAvenantModal(true)}>
              <GitBranch size={14} aria-hidden /> Avenant
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(`/sinistres/nouveau?contrat=${id}`)}>
            <AlertTriangle size={14} aria-hidden /> Déclarer sinistre
          </Button>
        </div>
      </div>

      {regenMsg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
          regenMsg.startsWith('✅')
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
        }`} role="status">
          {regenMsg}
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4 sm:gap-5 flex-wrap">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${brInfo.color} flex items-center justify-center text-3xl shrink-0`} aria-hidden>
            {brInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-lg sm:text-xl font-bold text-ink font-display">{contrat.produit?.nom ?? 'Contrat'}</h1>
              <ContratStatusBadge status={contrat.status as ContratStatus} />
              {branche && <BranchBadge branche={branche} />}
            </div>
            <p className="text-sm font-mono text-ink-subtle">{contrat.numero}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="text-ink-subtle">Souscripteur</span>
                <Link to={`/clients/${contrat.client_id}`} className="font-medium text-brand-dark hover:underline">
                  {clientNom}
                </Link>
              </span>
              {contrat.agent && (
                <span className="flex items-center gap-1.5">
                  <span className="text-ink-subtle">Agent</span>
                  <span className="font-medium text-ink">{contrat.agent.prenom} {contrat.agent.nom}</span>
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-ink-subtle mb-1.5">
                <span>{formatDate(contrat.date_effet)}</span>
                <span className="font-medium text-ink-muted">{daysLeft > 0 ? `${daysLeft} j restants` : 'Expiré'}</span>
                <span>{formatDate(contrat.date_echeance)}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-full rounded-full transition-all ${daysLeft < 30 ? 'bg-amber-400' : 'bg-brand'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right bg-navy rounded-2xl p-4 min-w-[140px] sm:min-w-[160px] w-full sm:w-auto">
            <p className="text-xs text-white/50 mb-1">Prime annuelle</p>
            <p className="text-xl font-bold text-white">{formatCurrency(contrat.prime_annuelle)}</p>
            <p className="text-xs text-white/40 mt-1">{formatCurrency(contrat.prime_mensuelle)} / mois</p>
            {contrat.franchise ? (
              <p className="text-xs text-amber-300 mt-2">Franchise : {formatCurrency(contrat.franchise)}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          {objet && Object.keys(objet).length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Shield size={14} className="text-brand" aria-hidden /> Objet assuré
              </h2>
              <dl className="space-y-2">
                {buildObjetLines(branche, objet).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2 text-sm">
                    <dt className="text-ink-subtle shrink-0">{label}</dt>
                    <dd className="font-medium text-ink text-right capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {activeGaranties.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Shield size={14} className="text-brand" aria-hidden /> Garanties actives
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {activeGaranties.map(g => (
                  <span key={g}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-soft text-brand-dark text-xs font-medium capitalize">
                    ✓ {g.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {contrat.conditions && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
                <FileText size={14} className="text-ink-subtle" aria-hidden /> Conditions particulières
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">{contrat.conditions}</p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <CreditCard size={14} className="text-brand" aria-hidden />
                Quittances ({contrat.quittances?.length ?? 0})
              </h2>
            </div>
            {!contrat.quittances?.length ? (
              <div className="py-10 text-center text-sm text-ink-subtle">
                Aucune quittance générée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-3/60">
                      {['N°', 'Période', 'Montant', 'Échéance', 'Statut', ''].map((h, i) => (
                        <th key={h || `a${i}`} className="px-4 py-2.5 text-left text-xs font-semibold text-ink-subtle uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contrat.quittances.map(q => {
                      const cfg = PAIE_CFG[q.status as PaiementStatus] ?? { label: q.status, variant: 'gray' as const };
                      return (
                        <tr key={q.id} className="hover:bg-surface-3 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">{q.numero}</td>
                          <td className="px-4 py-3 text-ink-muted text-xs whitespace-nowrap">
                            {formatDate(q.periode_debut)} → {formatDate(q.periode_fin)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(q.montant)}</td>
                          <td className="px-4 py-3 text-xs text-ink-subtle">{formatDate(q.date_echeance)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <PdfButton type="quittance" id={q.id} ref={q.numero} variant="icon" mode="both" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" aria-hidden />
                Sinistres ({contrat.sinistres?.length ?? 0})
              </h2>
              <Button size="sm" variant="secondary"
                onClick={() => navigate(`/sinistres/nouveau?contrat=${id}`)}>
                + Déclarer
              </Button>
            </div>
            {!contrat.sinistres?.length ? (
              <div className="py-10 text-center text-sm text-ink-subtle">
                Aucun sinistre déclaré sur ce contrat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-3/60">
                      {['N°', 'Nature', 'Date', 'Montant déclaré', 'Statut'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-ink-subtle uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contrat.sinistres.map(s => {
                      const cfg = SINISTRE_CFG[s.status as SinistreStatus] ?? { label: s.status, variant: 'gray' as const };
                      return (
                        <tr key={s.id}
                          onClick={() => navigate(`/sinistres/${s.id}`)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/sinistres/${s.id}`); } }}
                          tabIndex={0}
                          role="link"
                          className="hover:bg-surface-3 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">{s.numero}</td>
                          <td className="px-4 py-3 font-medium text-ink">{s.nature}</td>
                          <td className="px-4 py-3 text-xs text-ink-subtle">{formatDate(s.date_sinistre)}</td>
                          <td className="px-4 py-3 text-ink-muted">
                            {s.montant_declare ? formatCurrency(s.montant_declare) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <GitBranch size={14} className="text-purple-500" aria-hidden />
                Avenants ({avenants.length})
              </h2>
              {getTransitionsAutorisees(contrat.status).length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setShowAvenantModal(true)}>
                  + Nouvel avenant
                </Button>
              )}
            </div>
            <div className="p-5">
              <AvenantTimeline avenants={avenants} />
            </div>
          </Card>
        </div>
      </div>

      {showAvenantModal && (
        <AvenantModal
          contratId={contrat.id}
          contratNumero={contrat.numero}
          contratStatus={contrat.status}
          primeActuelle={contrat.prime_annuelle}
          devise={contrat.devise}
          onClose={() => setShowAvenantModal(false)}
          onSuccess={async (avenant) => {
            setAvenants(prev => [avenant, ...prev]);
            const updated = await getContratById(contrat.id);
            setContrat(updated);
          }}
        />
      )}
    </div>
  );
}

function buildObjetLines(branche?: BranchType, obj?: Record<string, any>): [string, string][] {
  if (!obj || !branche) return [];
  const add = (acc: [string, string][], label: string, key: string, suffix = '') => {
    if (obj[key] !== undefined && obj[key] !== '') acc.push([label, `${obj[key]}${suffix}`]);
  };
  const lines: [string, string][] = [];
  switch (branche) {
    case 'auto':
      add(lines, 'Marque', 'marque');
      add(lines, 'Modèle', 'modele');
      add(lines, 'Immatriculation', 'immat');
      add(lines, 'Année', 'annee');
      add(lines, 'Carburant', 'carburant');
      add(lines, 'Usage', 'usage');
      add(lines, 'Puissance', 'puissance_cv', ' CV');
      add(lines, 'Couleur', 'couleur');
      if (obj.valeur_venale) lines.push(['Valeur vénale', formatCurrency(obj.valeur_venale)]);
      break;
    case 'mrh':
      add(lines, 'Adresse', 'adresse');
      add(lines, 'Ville', 'ville');
      add(lines, 'Type', 'type_logement');
      add(lines, 'Statut', 'statut_occupant');
      add(lines, 'Surface', 'surface_m2', ' m²');
      add(lines, 'Pièces', 'nb_pieces');
      if (obj.valeur_mobilier)    lines.push(['Capital mobilier',    formatCurrency(obj.valeur_mobilier)]);
      if (obj.valeur_batiment)    lines.push(['Capital bâtiment',    formatCurrency(obj.valeur_batiment)]);
      break;
    case 'sante':
      add(lines, 'Assuré', 'assure_principal');
      add(lines, 'Naissance', 'date_naissance');
      add(lines, 'Formule', 'formule');
      add(lines, 'Régime', 'regime');
      add(lines, 'Bénéficiaires', 'nb_beneficiaires');
      if (obj.plafond_hospi) lines.push(['Plafond hospi.', formatCurrency(obj.plafond_hospi)]);
      if (obj.plafond_ambu)  lines.push(['Plafond ambu.', formatCurrency(obj.plafond_ambu)]);
      break;
    case 'vie':
      add(lines, 'Assuré', 'assure_nom');
      add(lines, 'Type contrat', 'type_contrat');
      if (obj.capital) lines.push(['Capital', formatCurrency(obj.capital)]);
      add(lines, 'Durée', 'duree_annees', ' ans');
      add(lines, 'Bénéficiaire 1', 'beneficiaire_1');
      add(lines, 'Bénéficiaire 2', 'beneficiaire_2');
      add(lines, 'Fumeur', 'fumeur');
      break;
    case 'autre':
      add(lines, 'Nature', 'nature_risque');
      if (obj.valeur) lines.push(['Valeur assurée', formatCurrency(obj.valeur)]);
      add(lines, 'Lieu', 'lieu');
      break;
  }
  return lines;
}
