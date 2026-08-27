import { supabase } from './supabase';
import type { Client, ClientInsert, FilterParams, PaginatedResult } from '../types';

const TABLE = 'clients';
const SELECT_FULL = `
  *,
  agent:profiles!agent_id(id, nom, prenom, email),
  courtier:profiles!courtier_id(id, nom, prenom, email)
`;

// ── Lister avec filtres + pagination ─────────────────────────
export async function getClients(params: FilterParams = {}): Promise<PaginatedResult<Client>> {
  const { search, status, agent_id, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(TABLE)
    .select(SELECT_FULL, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `nom.ilike.%${search}%,prenom.ilike.%${search}%,code_client.ilike.%${search}%,email.ilike.%${search}%,telephone.ilike.%${search}%`
    );
  }
  if (status) query = query.eq('status', status);
  if (agent_id) query = query.eq('agent_id', agent_id);

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data as Client[], count: count ?? 0, page, pageSize };
}

// ── Récupérer un client avec ses contrats ────────────────────
export async function getClientById(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`${SELECT_FULL}, contrats(*, produit:produits(*))`)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Client;
}

// ── Créer ────────────────────────────────────────────────────
export async function createClient(payload: ClientInsert): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(SELECT_FULL)
    .single();

  if (error) throw error;
  return data as Client;
}

// ── Mettre à jour ────────────────────────────────────────────
export async function updateClient(id: string, payload: Partial<ClientInsert>): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select(SELECT_FULL)
    .single();

  if (error) throw error;
  return data as Client;
}

// ── Changer statut ───────────────────────────────────────────
export async function setClientStatus(id: string, status: Client['status']): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

// ── Stats tableau de bord ────────────────────────────────────
export async function getClientStats() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('status');

  if (error) throw error;

  const total = data.length;
  const actifs = data.filter(c => c.status === 'actif').length;
  const prospects = data.filter(c => c.status === 'prospect').length;
  const resiliés = data.filter(c => c.status === 'resilié').length;

  return { total, actifs, prospects, resiliés };
}
