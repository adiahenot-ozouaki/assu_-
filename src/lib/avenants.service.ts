import { supabase } from './supabase';

export type TypeAvenant =
  | 'suspension'
  | 'remise_en_vigueur'
  | 'modification_prime'
  | 'resiliation'
  | 'modification_objet'
  | 'autre';

export interface Avenant {
  id: string;
  contrat_id: string;
  numero: number;
  type_avenant: TypeAvenant;
  date_effet: string;
  description?: string;
  delta_prime?: number;
  nouvelle_prime?: number;
  ancien_status?: string;
  nouveau_status?: string;
  motif?: string;
  agent_id?: string;
  created_at: string;
  // Vue enrichie
  contrat_numero?: string;
  prime_actuelle?: number;
  agent_nom?: string;
  agent_prenom?: string;
}

export interface CreateAvenantPayload {
  contrat_id:      string;
  type_avenant:    TypeAvenant;
  date_effet:      string;
  description?:    string;
  delta_prime?:    number;
  nouvelle_prime?: number;
  motif?:          string;
}

// ── Config des types d'avenant ────────────────────────────────
export const AVENANT_CFG: Record<TypeAvenant, {
  label: string; icon: string;
  color: string; bg: string;
  targetStatus?: string;
  requiresPrime?: boolean;
  requiresMotif?: boolean;
}> = {
  suspension: {
    label: 'Suspension',
    icon: '⏸️',
    color: 'text-amber-700', bg: 'bg-amber-50',
    targetStatus: 'suspendu',
    requiresMotif: true,
  },
  remise_en_vigueur: {
    label: 'Remise en vigueur',
    icon: '▶️',
    color: 'text-emerald-700', bg: 'bg-emerald-50',
    targetStatus: 'actif',
  },
  modification_prime: {
    label: 'Modification de prime',
    icon: '💰',
    color: 'text-blue-700', bg: 'bg-blue-50',
    requiresPrime: true,
  },
  resiliation: {
    label: 'Résiliation',
    icon: '🚫',
    color: 'text-red-700', bg: 'bg-red-50',
    targetStatus: 'résilié',
    requiresMotif: true,
  },
  modification_objet: {
    label: 'Modification objet assuré',
    icon: '🔧',
    color: 'text-purple-700', bg: 'bg-purple-50',
  },
  autre: {
    label: 'Autre avenant',
    icon: '📋',
    color: 'text-gray-700', bg: 'bg-gray-50',
  },
};

// ── Lister les avenants d'un contrat ─────────────────────────
export async function getAvenantsContrat(contrat_id: string): Promise<Avenant[]> {
  const { data, error } = await supabase
    .from('v_avenants')
    .select('*')
    .eq('contrat_id', contrat_id)
    .order('numero', { ascending: false });
  if (error) throw error;
  return data as Avenant[];
}

// ── Créer un avenant via RPC ──────────────────────────────────
export async function creerAvenant(payload: CreateAvenantPayload): Promise<Avenant> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('creer_avenant', {
    p_contrat_id:     payload.contrat_id,
    p_type:           payload.type_avenant,
    p_date_effet:     payload.date_effet,
    p_description:    payload.description ?? null,
    p_delta_prime:    payload.delta_prime ?? 0,
    p_nouvelle_prime: payload.nouvelle_prime ?? null,
    p_motif:          payload.motif ?? null,
    p_agent_id:       user?.id ?? null,
  });
  if (error) throw error;
  return data as Avenant;
}

// ── Transitions autorisées selon le statut courant ────────────
export function getTransitionsAutorisees(status: string): TypeAvenant[] {
  switch (status) {
    case 'actif':     return ['suspension', 'modification_prime', 'modification_objet', 'resiliation', 'autre'];
    case 'suspendu':  return ['remise_en_vigueur', 'resiliation'];
    case 'brouillon': return ['resiliation'];
    default:          return [];
  }
}

// ── Formatage delta prime ─────────────────────────────────────
export function formatDeltaPrime(delta: number, devise = 'FCFA'): string {
  if (!delta) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fr-FR').format(delta)} ${devise}`;
}
