import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, AlertTriangle, CreditCard,
  FileText, Shield, CheckCircle2, XCircle, Clock, RefreshCw
} from 'lucide-react';
import { getContratById, updateContrat } from '../lib/contrats.service';
import { genererQuittances } from '../lib/quittances.service';
import { PdfButton } from '../components/pdf/PdfButton';
import type { Contrat, ContratStatus, BranchType, PaiementStatus, SinistreStatus } from '../types';
import {
  ContratStatusBadge, BranchBadge,
  Button, Card, Spinner, Badge
} from '../components/ui';
import { formatDate, formatCurrency } from '../lib/supabase';

// ── Branch info map ──────────────────────────────────────────
const BRANCH_INFO: Record<BranchType, { icon: string; color: string }> = {
  auto:  { icon: '🚗', color: 'bg-blue-50'   },
  mrh:   { icon: '🏠', color: 'bg-amber-50'  },
  sante: { icon: '🏥', color: 'bg-emerald-50'},
  vie:   { icon: '❤️', color: 'bg-rose-50'   },
  autre: { icon: '📋', color: 'bg-gray-50'   },
};

// ── Paiement badge ───────────────────────────────────────────
const PAIE_CFG: Record<PaiementStatus, { label: string; icon: React.ReactNode; variant: any }> = {
  payé:        { label: 'Payée',      icon: <CheckCircle2 size={12}/>, variant: 'green' },
  en_attente:  { label: 'En attente', icon: <Clock size={12}/>,        variant: 'amber' },
  en_retard:   { label: 'En retard',  icon: <XCircle size={12}/>,      variant: 'red'   },
  annulé:      { label: 'Annulée',    icon: <XCircle size={12}/>,      variant: 'gray'  },
};

const SINISTRE_CFG: Record<SinistreStatus, { label: string; variant: any }> = {
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

  useEffect(() => {
    if (!id) return;
    getContratById(id).then(setContrat).finally(() => setLoading(false));
  }, [id]);

  const handleRegenerate = async () => {
    if (!contrat) return;
    setRegenerating(true);
    setRegenMsg('');
    try {
      const res = await genererQuittances(contrat.id);
      setRegenMsg(`✅ ${res.nb_quittances} quittances régénérées`);
      // Reload contrat to refresh quittances list
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
    <div className="flex items-center justify-center h-full">
      <Spinner className="w-8 h-8 text-[#00C875]" />
    </div>
  );

  if (!contrat) return (
    <div className="p-6 text-center text-gray-500">Contrat introuvable.</div>
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

  // Progress: days elapsed / total
  const today    = new Date();
  const start    = new Date(contrat.date_effet);
  const end      = new Date(contrat.date_echeance);
  const total    = end.getTime() - start.getTime();
  const elapsed  = Math.min(today.getTime() - start.getTime(), total);
  const progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex gap-2">
          {contrat.status === 'brouillon' && (
            <Button onClick={handleActivate} loading={activating}>
              <CheckCircle2 size={14} /> Activer le contrat
            </Button>
          )}
          {contrat.status === 'actif' && (
            <Button variant="secondary" onClick={handleRegenerate} loading={regenerating}>
              <RefreshCw size={14} /> Régénérer quittances
            </Button>
          )}
          {contrat.status === 'actif' && (
            <PdfButton type="attestation" id={contrat.id} ref={contrat.numero} size="sm" />
          )}
          <Button variant="secondary" onClick={() => navigate(`/contrats/${id}/modifier`)}>
            <Edit size={14} /> Modifier
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/sinistres/nouveau?contrat=${id}`)}>
            <AlertTriangle size={14} /> Déclarer sinistre
          </Button>
        </div>
      </div>

      {regenMsg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
          regenMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          {regenMsg}
        </div>
      )}

      {/* Hero */}
      <Card className="p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Branch icon */}
          <div className={`w-16 h-16 rounded-2xl ${brInfo.color} flex items-center justify-center text-3xl shrink-0`}>
            {brInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{contrat.produit?.nom ?? 'Contrat'}</h1>
              <ContratStatusBadge status={contrat.status as ContratStatus} />
              {branche && <BranchBadge branche={branche} />}
            </div>
            <p className="text-sm font-mono text-gray-400">{contrat.numero}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400">Souscripteur</span>
                <Link to={`/clients/${contrat.client_id}`} className="font-medium text-[#00A35E] hover:underline">
                  {clientNom}
                </Link>
              </span>
              {contrat.agent && (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">Agent</span>
                  <span className="font-medium">{contrat.agent.prenom} {contrat.agent.nom}</span>
                </span>
              )}
            </div>

            {/* Period progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{formatDate(contrat.date_effet)}</span>
                <span className="font-medium text-gray-600">{daysLeft > 0 ? `${daysLeft} j restants` : 'Expiré'}</span>
                <span>{formatDate(contrat.date_echeance)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${daysLeft < 30 ? 'bg-amber-400' : 'bg-[#00C875]'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Prime block */}
          <div className="shrink-0 text-right bg-[#0A1628] rounded-2xl p-4 min-w-[160px]">
            <p className="text-xs text-white/50 mb-1">Prime annuelle</p>
            <p className="text-xl font-bold text-white">{formatCurrency(contrat.prime_annuelle)}</p>
            <p className="text-xs text-white/40 mt-1">{formatCurrency(contrat.prime_mensuelle)} / mois</p>
            {contrat.franchise ? (
              <p className="text-xs text-amber-300 mt-2">Franchise : {formatCurrency(contrat.franchise)}</p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="space-y-4">
          {/* Objet assuré */}
          {objet && Object.keys(objet).length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield size={14} className="text-[#00C875]" /> Objet assuré
              </h2>
              <dl className="space-y-2">
                {buildObjetLines(branche, objet).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2 text-sm">
                    <dt className="text-gray-400 shrink-0">{label}</dt>
                    <dd className="font-medium text-gray-700 text-right capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* Garanties */}
          {activeGaranties.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield size={14} className="text-[#00C875]" /> Garanties actives
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {activeGaranties.map(g => (
                  <span key={g}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00C875]/10 text-[#00A35E] text-xs font-medium capitalize">
                    ✓ {g.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Conditions */}
          {contrat.conditions && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText size={14} className="text-gray-400" /> Conditions particulières
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">{contrat.conditions}</p>
            </Card>
          )}
        </div>

        {/* Right col — quittances + sinistres */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quittances */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={14} className="text-[#00C875]" />
                Quittances ({contrat.quittances?.length ?? 0})
              </h2>
            </div>
            {!contrat.quittances?.length ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Aucune quittance générée.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    {['N°', 'Période', 'Montant', 'Échéance', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contrat.quittances.map(q => {
                    const cfg = PAIE_CFG[q.status as PaiementStatus] ?? { label: q.status, icon: null, variant: 'gray' };
                    return (
                      <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.numero}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatDate(q.periode_debut)} → {formatDate(q.periode_fin)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(q.montant)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(q.date_echeance)}</td>
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
            )}
          </Card>

          {/* Sinistres */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Sinistres ({contrat.sinistres?.length ?? 0})
              </h2>
              <Button size="sm" variant="secondary"
                onClick={() => navigate(`/sinistres/nouveau?contrat=${id}`)}>
                + Déclarer
              </Button>
            </div>
            {!contrat.sinistres?.length ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Aucun sinistre déclaré sur ce contrat.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    {['N°', 'Nature', 'Date', 'Montant déclaré', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contrat.sinistres.map(s => {
                    const cfg = SINISTRE_CFG[s.status as SinistreStatus] ?? { label: s.status, variant: 'gray' };
                    return (
                      <tr key={s.id}
                        onClick={() => navigate(`/sinistres/${s.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.numero}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{s.nature}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.date_sinistre)}</td>
                        <td className="px-4 py-3 text-gray-700">
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
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Objet display lines by branch ────────────────────────────
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
