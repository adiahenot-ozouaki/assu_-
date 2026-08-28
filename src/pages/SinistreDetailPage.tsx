import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, RefreshCw, FileText, MapPin, Calendar, User } from 'lucide-react';
import {
  getSinistreById, changerStatutSinistre,
  listerDocuments, updateSinistre
} from '../lib/sinistres.service';
import type { SinistreComplet, SinistreDocument } from '../types/sinistres';
import { WorkflowTimeline, StatusChip } from '../components/sinistres/WorkflowTimeline';
import { PhotoUploader } from '../components/sinistres/PhotoUploader';
import { PdfButton } from '../components/pdf/PdfButton';
import { Button, Card, Spinner } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/supabase';

const BRANCH_ICONS: Record<string, string> = {
  auto: '🚗', mrh: '🏠', sante: '🏥', vie: '❤️', autre: '📋',
};

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand';

export default function SinistreDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [sinistre, setSinistre]   = useState<SinistreComplet | null>(null);
  const [documents, setDocuments] = useState<SinistreDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [editFields, setEditFields] = useState({
    montant_expertisé: 0,
    montant_indemnise: 0,
    expert_nom: '',
    notes: '',
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, docs] = await Promise.all([
        getSinistreById(id),
        listerDocuments(id),
      ]);
      setSinistre(s);
      setDocuments(docs);
      setEditFields({
        montant_expertisé: s.montant_expertisé ?? 0,
        montant_indemnise: s.montant_indemnise ?? 0,
        expert_nom:        s.expert_nom ?? '',
        notes:             s.notes ?? '',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (newStatus: string, commentaire: string) => {
    if (!sinistre) return;
    setUpdatingStatus(true);
    try {
      await changerStatutSinistre(sinistre.id, newStatus as any, commentaire || undefined);
      await load();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!sinistre) return;
    await updateSinistre(sinistre.id, editFields as any);
    await load();
    setEditMode(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" role="status">
      <Spinner className="w-8 h-8 text-brand" />
    </div>
  );

  if (!sinistre) return (
    <div className="p-6 text-center text-ink-muted">Sinistre introuvable.</div>
  );

  const isClosed = ['réglé', 'rejeté', 'sans_suite'].includes(sinistre.status);
  const clientNom = sinistre.est_personne_morale
    ? sinistre.raison_sociale
    : `${sinistre.client_prenom ?? ''} ${sinistre.client_nom}`.trim();

  const heroBg =
    sinistre.status === 'réglé' ? 'bg-emerald-50 dark:bg-emerald-500/15' :
    sinistre.status === 'rejeté' ? 'bg-red-50 dark:bg-red-500/15' :
    sinistre.status === 'en_instruction' ? 'bg-amber-50 dark:bg-amber-500/15' : 'bg-blue-50 dark:bg-blue-500/15';

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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={14} aria-hidden /> Actualiser
          </Button>
          <PdfButton type="sinistre" id={sinistre.id} ref={sinistre.numero} size="sm" />
          {!isClosed && (
            <Button variant="secondary" onClick={() => setEditMode(!editMode)}>
              <Edit2 size={14} aria-hidden /> {editMode ? 'Annuler édition' : 'Modifier'}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4 sm:gap-5 flex-wrap">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${heroBg}`} aria-hidden>
            {BRANCH_ICONS[sinistre.branche] ?? '📋'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-lg sm:text-xl font-bold text-ink font-display">{sinistre.nature}</h1>
              <StatusChip status={sinistre.status} />
            </div>
            <p className="text-sm font-mono text-ink-subtle">{sinistre.numero}</p>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-ink-subtle" aria-hidden />
                <span className="font-medium text-brand-dark">{clientNom}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-ink-subtle" aria-hidden />
                <Link to={`/contrats/${sinistre.contrat_id}`}
                  className="font-mono text-xs text-ink-muted hover:text-brand-dark">
                  {sinistre.contrat_numero}
                </Link>
              </span>
              {sinistre.lieu && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-ink-subtle" aria-hidden /> {sinistre.lieu}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink-subtle">
              <span className="flex items-center gap-1">
                <Calendar size={11} aria-hidden /> Sinistre : <strong className="text-ink-muted">{formatDate(sinistre.date_sinistre)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} aria-hidden /> Déclaration : <strong className="text-ink-muted">{formatDate(sinistre.date_declaration)}</strong>
              </span>
              {sinistre.date_cloture && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} aria-hidden /> Clôture : <strong className="text-ink-muted">{formatDate(sinistre.date_cloture)}</strong>
                </span>
              )}
              <span className="text-ink-subtle/80">
                {sinistre.jours_depuis_declaration}j depuis déclaration
              </span>
            </div>
          </div>

          <div className="bg-navy rounded-2xl p-4 min-w-[160px] sm:min-w-[180px] shrink-0 space-y-3 w-full sm:w-auto">
            <MontantBlock label="Déclaré" value={sinistre.montant_declare} />
            <div className="h-px bg-white/10" />
            <MontantBlock label="Expertisé" value={sinistre.montant_expertisé} dim />
            <MontantBlock label="Indemnisé" value={sinistre.montant_indemnise} green />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5">
          {sinistre.description && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink mb-2">Description des faits</h2>
              <p className="text-sm text-ink-muted leading-relaxed">{sinistre.description}</p>
            </Card>
          )}

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Instruction</h2>
              {editMode && (
                <Button size="sm" onClick={handleSaveEdit}>Sauvegarder</Button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-ink-subtle mb-1">Expert désigné</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editFields.expert_nom}
                    onChange={e => setEditFields(f => ({ ...f, expert_nom: e.target.value }))}
                    placeholder="Nom de l'expert…"
                    className={inputClass}
                  />
                ) : (
                  <p className="font-medium text-ink">{sinistre.expert_nom || '—'}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-ink-subtle mb-1">Montant expertisé (FCFA)</p>
                {editMode ? (
                  <input type="number" min={0} step={1000}
                    value={editFields.montant_expertisé || ''}
                    onChange={e => setEditFields(f => ({ ...f, montant_expertisé: Number(e.target.value) }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="font-medium text-ink">
                    {sinistre.montant_expertisé ? formatCurrency(sinistre.montant_expertisé) : '—'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-ink-subtle mb-1">Montant indemnisé (FCFA)</p>
                {editMode ? (
                  <input type="number" min={0} step={1000}
                    value={editFields.montant_indemnise || ''}
                    onChange={e => setEditFields(f => ({ ...f, montant_indemnise: Number(e.target.value) }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="font-semibold text-brand-dark">
                    {sinistre.montant_indemnise ? formatCurrency(sinistre.montant_indemnise) : '—'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-ink-subtle mb-1">Notes internes</p>
                {editMode ? (
                  <textarea rows={3}
                    value={editFields.notes}
                    onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))}
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <p className="text-ink-muted">{sinistre.notes || '—'}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Suivi du dossier</h2>
            <WorkflowTimeline
              status={sinistre.status}
              historique={sinistre.historique ?? []}
              onChangeStatus={handleStatusChange}
              loading={updatingStatus}
            />
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">
                Documents ({documents.length})
              </h2>
            </div>
            <PhotoUploader
              sinistre_id={sinistre.id}
              existingDocs={documents}
              onDocumentAdded={doc => setDocuments(prev => [...prev, doc])}
              onDocumentRemoved={docId => setDocuments(prev => prev.filter(d => d.id !== docId))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function MontantBlock({ label, value, dim, green }: {
  label: string; value?: number; dim?: boolean; green?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className={`text-sm font-bold ${green ? 'text-[#00C875]' : dim ? 'text-white/60' : 'text-white'}`}>
        {value ? formatCurrency(value) : '—'}
      </p>
    </div>
  );
}
