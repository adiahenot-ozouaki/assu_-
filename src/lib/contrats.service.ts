import { supabase } from './supabase';
import type { Contrat, ContratInsert, FilterParams, PaginatedResult } from '../types';

const TABLE = 'contrats';
const SELECT_FULL = `
  *,
  client:clients(id, code_client, nom, prenom, raison_sociale, est_personne_morale, telephone),
  produit:produits(*),
  agent:profiles!agent_id(id, nom, prenom)
`;

// ── Lister ───────────────────────────────────────────────────
export async function getContrats(params: FilterParams = {}): Promise<PaginatedResult<Contrat>> {
  const { search, status, branche, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(TABLE)
    .select(SELECT_FULL, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`numero.ilike.%${search}%`);
  }
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw error;

  // Filtre branche côté client (via produit)
  let filtered = (data as Contrat[]);
  if (branche) filtered = filtered.filter(c => c.produit?.branche === branche);

  return { data: filtered, count: count ?? 0, page, pageSize };
}

// ── Détail avec quittances + sinistres ───────────────────────
export async function getContratById(id: string): Promise<Contrat> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`${SELECT_FULL}, quittances(*), sinistres(*)`)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Contrat;
}

// ── Créer ────────────────────────────────────────────────────
export async function createContrat(payload: ContratInsert): Promise<Contrat> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(SELECT_FULL)
    .single();

  if (error) throw error;
  return data as Contrat;
}

// ── Mettre à jour ────────────────────────────────────────────
export async function updateContrat(id: string, payload: Partial<ContratInsert>): Promise<Contrat> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select(SELECT_FULL)
    .single();

  if (error) throw error;
  return data as Contrat;
}

// ── Stats dashboard ──────────────────────────────────────────
export async function getContratStats() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('status, prime_annuelle, produit:produits(branche)');

  if (error) throw error;

  const actifs = data.filter(c => c.status === 'actif');
  const primeTotal = actifs.reduce((sum, c) => sum + (c.prime_annuelle || 0), 0);
  const parBranche = data.reduce((acc: Record<string, number>, c) => {
    const branche = (c.produit as any)?.branche ?? 'autre';
    acc[branche] = (acc[branche] || 0) + 1;
    return acc;
  }, {});

  return {
    total: data.length,
    actifs: actifs.length,
    primeTotal,
    parBranche,
  };
}
