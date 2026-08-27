import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, RefreshCw, FileText, MapPin, Calendar, User } from 'lucide-react';
import {
  getSinistreById, changerStatutSinistre,
  listerDocuments, supprimerDocument, updateSinistre
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

export default function SinistreDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [sinistre, setSinistre]   = useState<SinistreComplet | null>(null);
  const [documents, setDocuments] = useState<SinistreDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Editable fields
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
    <div className="flex items-center justify-center h-full">
      <Spinner className="w-8 h-8 text-[#00C875]" />
    </div>
  );

  if (!sinistre) return (
    <div className="p-6 text-center text-gray-500">Sinistre introuvable.</div>
  );

  const isClosed = ['réglé', 'rejeté', 'sans_suite'].includes(sinistre.status);
  const clientNom = sinistre.est_personne_morale
    ? sinistre.raison_sociale
    : `${sinistre.client_prenom ?? ''} ${sinistre.client_nom}`.trim();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={14} /> Actualiser
          </Button>
          <PdfButton type="sinistre" id={sinistre.id} ref={sinistre.numero} size="sm" />
          {!isClosed && (
            <Button variant="secondary" onClick={() => setEditMode(!editMode)}>
              <Edit2 size={14} /> {editMode ? 'Annuler édition' : 'Modifier'}
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <Card className="p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
            sinistre.status === 'réglé' ? 'bg-emerald-50' :
            sinistre.status === 'rejeté' ? 'bg-red-50' :
            sinistre.status === 'en_instruction' ? 'bg-amber-50' : 'bg-blue-50'
          }`}>
            {BRANCH_ICONS[sinistre.branche] ?? '📋'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{sinistre.nature}</h1>
              <StatusChip status={sinistre.status} />
            </div>
            <p className="text-sm font-mono text-gray-400">{sinistre.numero}</p>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-gray-400" />
                <Link to={`/clients/${sinistre.code_client}`}
                  className="font-medium text-[#00A35E] hover:underline">
                  {clientNom}
                </Link>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-gray-400" />
                <Link to={`/contrats/${sinistre.contrat_id}`}
                  className="font-mono text-xs text-gray-500 hover:text-[#00A35E]">
                  {sinistre.contrat_numero}
                </Link>
              </span>
              {sinistre.lieu && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400" /> {sinistre.lieu}
                </span>
              )}
            </div>

            {/* Dates row */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Sinistre : <strong className="text-gray-600">{formatDate(sinistre.date_sinistre)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Déclaration : <strong className="text-gray-600">{formatDate(sinistre.date_declaration)}</strong>
              </span>
              {sinistre.date_cloture && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> Clôture : <strong className="text-gray-600">{formatDate(sinistre.date_cloture)}</strong>
                </span>
              )}
              <span className="text-gray-300">
                {sinistre.jours_depuis_declaration}j depuis déclaration
              </span>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-[#0A1628] rounded-2xl p-4 min-w-[180px] shrink-0 space-y-3">
            <MontantBlock label="Déclaré" value={sinistre.montant_declare} />
            <div className="h-px bg-white/10" />
            <MontantBlock label="Expertisé" value={sinistre.montant_expertisé} dim />
            <MontantBlock label="Indemnisé" value={sinistre.montant_indemnise} green />
          </div>
        </div>
      </Card>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="space-y-5">

          {/* Description */}
          {sinistre.description && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Description des faits</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{sinistre.description}</p>
            </Card>
          )}

          {/* Instruction (éditable) */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Instruction</h2>
              {editMode && (
                <Button size="sm" onClick={handleSaveEdit}>Sauvegarder</Button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {/* Expert */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Expert désigné</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editFields.expert_nom}
                    onChange={e => setEditFields(f => ({ ...f, expert_nom: e.target.value }))}
                    placeholder="Nom de l'expert…"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                  />
                ) : (
                  <p className="font-medium text-gray-800">{sinistre.expert_nom || '—'}</p>
                )}
              </div>

              {/* Montant expertisé */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Montant expertisé (FCFA)</p>
                {editMode ? (
                  <input type="number" min={0} step={1000}
                    value={editFields.montant_expertisé || ''}
                    onChange={e => setEditFields(f => ({ ...f, montant_expertisé: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                  />
                ) : (
                  <p className="font-medium text-gray-800">
                    {sinistre.montant_expertisé ? formatCurrency(sinistre.montant_expertisé) : '—'}
                  </p>
                )}
              </div>

              {/* Montant indemnisé */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Montant indemnisé (FCFA)</p>
                {editMode ? (
                  <input type="number" min={0} step={1000}
                    value={editFields.montant_indemnise || ''}
                    onChange={e => setEditFields(f => ({ ...f, montant_indemnise: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875]"
                  />
                ) : (
                  <p className="font-semibold text-[#00A35E]">
                    {sinistre.montant_indemnise ? formatCurrency(sinistre.montant_indemnise) : '—'}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Notes internes</p>
                {editMode ? (
                  <textarea rows={3}
                    value={editFields.notes}
                    onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none"
                  />
                ) : (
                  <p className="text-gray-600">{sinistre.notes || '—'}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-5">
          {/* Workflow */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Suivi du dossier</h2>
            <WorkflowTimeline
              status={sinistre.status}
              historique={sinistre.historique ?? []}
              onChangeStatus={handleStatusChange}
              loading={updatingStatus}
            />
          </Card>

          {/* Documents */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
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
