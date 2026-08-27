import { supabase } from './supabase';
import type { SinistreStatus } from '../types';
import type {
  SinistreComplet, SinistreDocument,
  SinistreHistorique, NouveauSinistreForm
} from '../types/sinistres';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sinistre-documents`;

// ── Auth helper ───────────────────────────────────────────────
async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Lister sinistres (via vue enrichie) ───────────────────────
export async function getSinistres(filters: {
  search?: string;
  status?: string;
  branche?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ data: SinistreComplet[]; count: number }> {
  const { search, status, branche, page = 1, pageSize = 20 } = filters;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('v_sinistres')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (status)  query = query.eq('status', status);
  if (branche) query = query.eq('branche', branche);
  if (search) {
    query = query.or(
      `numero.ilike.%${search}%,nature.ilike.%${search}%,client_nom.ilike.%${search}%,raison_sociale.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as SinistreComplet[], count: count ?? 0 };
}

// ── Détail sinistre + documents + historique ──────────────────
export async function getSinistreById(id: string): Promise<SinistreComplet> {
  const [{ data: sinistre, error }, { data: docs }, { data: hist }] = await Promise.all([
    supabase.from('v_sinistres').select('*').eq('id', id).single(),
    supabase.from('sinistre_documents').select('*').eq('sinistre_id', id).order('created_at'),
    supabase.from('sinistre_historique')
      .select('*, auteur:profiles!auteur_id(nom, prenom)')
      .eq('sinistre_id', id)
      .order('created_at'),
  ]);

  if (error) throw error;
  return {
    ...sinistre,
    documents: (docs ?? []) as SinistreDocument[],
    historique: (hist ?? []) as SinistreHistorique[],
  } as SinistreComplet;
}

// ── Créer un sinistre ─────────────────────────────────────────
export async function creerSinistre(payload: NouveauSinistreForm & { agent_id?: string }) {
  const { data, error } = await supabase
    .from('sinistres')
    .insert({ ...payload, status: 'ouvert', date_declaration: new Date().toISOString().slice(0, 10) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Mettre à jour un sinistre ─────────────────────────────────
export async function updateSinistre(id: string, payload: Partial<NouveauSinistreForm & {
  montant_expertisé: number;
  montant_indemnise: number;
  expert_nom: string;
}>) {
  const { data, error } = await supabase
    .from('sinistres')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Changer statut via RPC ────────────────────────────────────
export async function changerStatutSinistre(
  sinistre_id: string,
  nouveau_status: SinistreStatus,
  commentaire?: string
) {
  const { data, error } = await supabase.rpc('changer_statut_sinistre', {
    p_sinistre_id:    sinistre_id,
    p_nouveau_status: nouveau_status,
    p_commentaire:    commentaire ?? null,
  });
  if (error) throw error;
  return data;
}

// ── Stats sinistres ───────────────────────────────────────────
export async function getSinistreStats() {
  const { data, error } = await supabase
    .from('sinistres')
    .select('status, montant_declare, montant_indemnise');
  if (error) throw error;

  const stats = {
    total: data.length,
    ouverts: 0, en_instruction: 0, regles: 0, rejetes: 0,
    montant_declare_total: 0, montant_indemnise_total: 0,
  };
  for (const s of data) {
    if (s.status === 'ouvert')         stats.ouverts++;
    if (s.status === 'en_instruction') stats.en_instruction++;
    if (s.status === 'réglé')          stats.regles++;
    if (s.status === 'rejeté')         stats.rejetes++;
    stats.montant_declare_total  += Number(s.montant_declare)  || 0;
    stats.montant_indemnise_total += Number(s.montant_indemnise) || 0;
  }
  return stats;
}

// ── Upload document ───────────────────────────────────────────
export async function uploadDocument(
  sinistre_id: string,
  file: File,
  type_doc: SinistreDocument['type_doc'] = 'photo'
): Promise<SinistreDocument> {
  const headers = await getAuthHeader();

  // 1. Demander URL signée pour upload
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:        'upload_url',
      sinistre_id,
      nom_fichier:   file.name,
      mime_type:     file.type,
      taille_octets: file.size,
      type_doc,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Erreur génération URL');
  }

  const { signed_url, document_id, token } = await res.json();

  // 2. Upload direct vers Supabase Storage via URL signée
  const uploadRes = await fetch(signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Erreur upload: ${uploadRes.statusText}`);
  }

  // 3. Confirmer l'upload pour obtenir l'URL de lecture
  const confirmRes = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'confirm_upload', document_id }),
  });

  const confirmed = await confirmRes.json();
  return confirmed.document as SinistreDocument;
}

// ── Lister documents (avec URLs signées fraîches) ─────────────
export async function listerDocuments(sinistre_id: string): Promise<SinistreDocument[]> {
  const headers = await getAuthHeader();
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', sinistre_id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erreur liste documents');
  return json.documents as SinistreDocument[];
}

// ── Supprimer document ────────────────────────────────────────
export async function supprimerDocument(document_id: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', document_id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erreur suppression');
}
