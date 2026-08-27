import { supabase } from './supabase';
import type { Quittance, PaiementStatus } from '../types';

// ── Types ─────────────────────────────────────────────────────
export interface QuittanceDashboard extends Quittance {
  contrat_numero: string;
  prime_annuelle: number;
  client_nom: string;
  client_prenom: string | null;
  raison_sociale: string | null;
  est_personne_morale: boolean;
  code_client: string;
  produit_nom: string;
  branche: string;
  jours_retard: number;
  jours_avant_echeance: number | null;
}

export interface EncaissementPayload {
  quittance_id: string;
  mode_paiement: 'mobile_money' | 'virement' | 'especes' | 'cheque' | 'carte';
  reference?: string;
  date_paiement?: string;
}

export interface QuittanceStats {
  total: number;
  payees: number;
  en_attente: number;
  en_retard: number;
  montant_encaisse: number;
  montant_en_attente: number;
  montant_en_retard: number;
}

// ── Liste par contrat ─────────────────────────────────────────
export async function getQuittancesContrat(contrat_id: string): Promise<Quittance[]> {
  const { data, error } = await supabase
    .from('quittances')
    .select('*')
    .eq('contrat_id', contrat_id)
    .order('periode_debut', { ascending: true });

  if (error) throw error;
  return data as Quittance[];
}

// ── Tableau de bord : toutes les quittances via la vue ────────
export async function getQuittancesDashboard(filters: {
  status?: PaiementStatus | '';
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ data: QuittanceDashboard[]; count: number }> {
  const { status, search, page = 1, pageSize = 25 } = filters;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('v_quittances_dashboard')
    .select('*', { count: 'exact' })
    .order('date_echeance', { ascending: true })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(
      `client_nom.ilike.%${search}%,raison_sociale.ilike.%${search}%,contrat_numero.ilike.%${search}%,numero.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as QuittanceDashboard[], count: count ?? 0 };
}

// ── Stats globales ────────────────────────────────────────────
export async function getQuittanceStats(): Promise<QuittanceStats> {
  const { data, error } = await supabase
    .from('quittances')
    .select('status, montant');

  if (error) throw error;

  const stats: QuittanceStats = {
    total: data.length,
    payees: 0, en_attente: 0, en_retard: 0,
    montant_encaisse: 0, montant_en_attente: 0, montant_en_retard: 0,
  };

  for (const q of data) {
    const m = Number(q.montant) || 0;
    if (q.status === 'payé')       { stats.payees++;     stats.montant_encaisse   += m; }
    if (q.status === 'en_attente') { stats.en_attente++; stats.montant_en_attente += m; }
    if (q.status === 'en_retard')  { stats.en_retard++;  stats.montant_en_retard  += m; }
  }

  return stats;
}

// ── Générer les quittances via Edge Function ──────────────────
export async function genererQuittances(contrat_id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generer-quittances`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ contrat_id }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erreur génération');
  return json;
}

// ── Encaisser via Edge Function ───────────────────────────────
export async function encaisserQuittance(payload: EncaissementPayload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encaisser-quittance`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erreur encaissement');
  return json;
}

// ── Annuler une quittance ─────────────────────────────────────
export async function annulerQuittance(id: string): Promise<void> {
  const { error } = await supabase
    .from('quittances')
    .update({ status: 'annulé' })
    .eq('id', id)
    .eq('status', 'en_attente'); // sécurité : seulement si en attente

  if (error) throw error;
}
