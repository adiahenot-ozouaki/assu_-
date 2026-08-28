import { supabase } from './supabase';

export interface KpisDirection {
  total_clients: number;
  clients_actifs: number;
  nouveaux_ce_mois: number;
  total_contrats: number;
  contrats_actifs: number;
  masse_prime_annuelle: number;
  encaisse_ce_mois: number;
  encaisse_ytd: number;
  en_attente_total: number;
  nb_retards: number;
  total_sinistres: number;
  sinistres_ouverts: number;
  total_indemnise: number;
}

export interface PrimeMois {
  mois: string;
  mois_label: string;
  nb_quittances: number;
  total_encaisse: number;
  branche: string;
}

export interface PrimeMoisGrouped {
  mois: string;
  mois_label: string;
  total: number;
  auto: number;
  mrh: number;
  sante: number;
  vie: number;
  autre: number;
}

export interface PortefeuilleBranche {
  branche: string;
  nb_contrats: number;
  prime_totale: number;
  contrats_actifs: number;
  prime_moyenne: number;
}

export interface Sinistralite {
  contrats_actifs: number;
  branche: string;
  nb_sinistres: number;
  montant_declare_total: number;
  montant_indemnise_total: number;
  prime_totale_branche: number;
  taux_sinistralite: number;
  sinistres_ouverts: number;
}

export interface ModePaiement {
  mode: string;
  count: number;
  montant: number;
}

// ── KPIs direction ────────────────────────────────────────────
export async function getKpisDirection(): Promise<KpisDirection> {
  const { data, error } = await supabase
    .from('v_kpis_direction')
    .select('*')
    .single();
  if (error) throw error;
  return data as KpisDirection;
}

// ── Primes par mois groupées ──────────────────────────────────
export async function getPrimesParMois(): Promise<PrimeMoisGrouped[]> {
  const { data, error } = await supabase
    .from('v_primes_par_mois')
    .select('*');
  if (error) throw error;

  // Grouper par mois, sommer par branche
  const map = new Map<string, PrimeMoisGrouped>();
  for (const row of (data as PrimeMois[])) {
    if (!map.has(row.mois)) {
      map.set(row.mois, {
        mois: row.mois,
        mois_label: row.mois_label,
        total: 0, auto: 0, mrh: 0, sante: 0, vie: 0, autre: 0,
      });
    }
    const entry = map.get(row.mois)!;
    const val = Number(row.total_encaisse) || 0;
    entry.total += val;
    if (row.branche === 'auto')  entry.auto  += val;
    if (row.branche === 'mrh')   entry.mrh   += val;
    if (row.branche === 'sante') entry.sante += val;
    if (row.branche === 'vie')   entry.vie   += val;
    if (row.branche === 'autre') entry.autre += val;
  }

  return Array.from(map.values()).sort((a, b) => a.mois.localeCompare(b.mois));
}

// ── Portefeuille par branche ──────────────────────────────────
export async function getPortefeuilleBranches(): Promise<PortefeuilleBranche[]> {
  const { data, error } = await supabase
    .from('v_portefeuille_branches')
    .select('*');
  if (error) throw error;
  return data as PortefeuilleBranche[];
}

// ── Sinistralité par branche ──────────────────────────────────
export async function getSinistralite(): Promise<Sinistralite[]> {
  const { data, error } = await supabase
    .from('v_sinistralite')
    .select('*');
  if (error) throw error;
  return data as Sinistralite[];
}

// ── Modes de paiement ─────────────────────────────────────────
export async function getModesPaiement(): Promise<ModePaiement[]> {
  const { data, error } = await supabase
    .from('quittances')
    .select('mode_paiement, montant')
    .eq('status', 'payé')
    .not('mode_paiement', 'is', null);
  if (error) throw error;

  const map = new Map<string, { count: number; montant: number }>();
  for (const q of data) {
    const m = q.mode_paiement as string;
    if (!map.has(m)) map.set(m, { count: 0, montant: 0 });
    map.get(m)!.count++;
    map.get(m)!.montant += Number(q.montant) || 0;
  }

  return Array.from(map.entries())
    .map(([mode, v]) => ({ mode, ...v }))
    .sort((a, b) => b.count - a.count);
}

// ── Top clients par prime ─────────────────────────────────────
export async function getTopClients(limit = 5): Promise<any[]> {
  const { data, error } = await supabase
    .from('contrats')
    .select(`
      prime_annuelle,
      client:clients(nom, prenom, raison_sociale, est_personne_morale, code_client)
    `)
    .eq('status', 'actif')
    .order('prime_annuelle', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ── Taux de recouvrement global ───────────────────────────────
export async function getTauxRecouvrement(): Promise<{
  taux: number; payees: number; total: number; montant_recouvre: number; montant_total: number;
}> {
  const { data, error } = await supabase
    .from('quittances')
    .select('status, montant')
    .in('status', ['payé', 'en_attente', 'en_retard']);
  if (error) throw error;

  let payees = 0, total = 0, recouvre = 0, totalM = 0;
  for (const q of data) {
    total++;
    totalM += Number(q.montant) || 0;
    if (q.status === 'payé') { payees++; recouvre += Number(q.montant) || 0; }
  }

  return {
    taux: total > 0 ? Math.round((payees / total) * 100) : 0,
    payees, total,
    montant_recouvre: recouvre,
    montant_total:    totalM,
  };
}
