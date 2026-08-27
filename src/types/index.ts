// ============================================================
// AssurZen ERP — Types TypeScript
// Miroir du schéma Supabase
// ============================================================

export type UserRole = 'admin' | 'agent' | 'courtier';
export type ClientStatus = 'prospect' | 'actif' | 'suspendu' | 'resilié';
export type ContratStatus = 'brouillon' | 'actif' | 'suspendu' | 'expiré' | 'résilié';
export type BranchType = 'auto' | 'sante' | 'vie' | 'mrh' | 'autre';
export type SinistreStatus = 'ouvert' | 'en_instruction' | 'réglé' | 'rejeté' | 'sans_suite';
export type PaiementStatus = 'en_attente' | 'payé' | 'en_retard' | 'annulé';

// ── Profile ──────────────────────────────────────────────────
export interface Profile {
  id: string;
  role: UserRole;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  agence?: string;
  avatar_url?: string;
  actif: boolean;
  created_at: string;
}

// ── Client ───────────────────────────────────────────────────
export interface Client {
  id: string;
  code_client: string;
  nom: string;
  prenom?: string;
  raison_sociale?: string;
  est_personne_morale: boolean;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  pays: string;
  type_piece?: string;
  numero_piece?: string;
  date_naissance?: string;
  status: ClientStatus;
  agent_id?: string;
  courtier_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations jointes
  agent?: Profile;
  courtier?: Profile;
  contrats?: Contrat[];
}

export type ClientInsert = Omit<Client, 'id' | 'code_client' | 'created_at' | 'updated_at' | 'agent' | 'courtier' | 'contrats'>;

// ── Produit ──────────────────────────────────────────────────
export interface Produit {
  id: string;
  code: string;
  nom: string;
  branche: BranchType;
  description?: string;
  prime_min?: number;
  prime_max?: number;
  duree_mois: number;
  actif: boolean;
  created_at: string;
}

// ── Objet assuré (JSONB flexible) ────────────────────────────
export interface ObjetAuto {
  marque: string;
  modele: string;
  immat: string;
  annee: number;
  puissance_cv?: number;
  valeur_venale?: number;
  couleur?: string;
  vin?: string;
}

export interface ObjetMRH {
  adresse: string;
  surface_m2?: number;
  valeur_mobilier?: number;
  nb_pieces?: number;
  type_logement?: 'appartement' | 'villa' | 'studio';
}

export type ObjetAssure = ObjetAuto | ObjetMRH | Record<string, unknown>;

// ── Contrat ──────────────────────────────────────────────────
export interface Contrat {
  id: string;
  numero: string;
  client_id: string;
  produit_id: string;
  agent_id?: string;
  courtier_id?: string;
  date_effet: string;
  date_echeance: string;
  prime_annuelle: number;
  prime_mensuelle: number;
  franchise?: number;
  devise: string;
  status: ContratStatus;
  objet_assure?: ObjetAssure;
  garanties?: Record<string, boolean>;
  conditions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations jointes
  client?: Client;
  produit?: Produit;
  agent?: Profile;
  quittances?: Quittance[];
  sinistres?: Sinistre[];
}

export type ContratInsert = Omit<Contrat, 'id' | 'numero' | 'prime_mensuelle' | 'created_at' | 'updated_at' | 'client' | 'produit' | 'agent' | 'quittances' | 'sinistres'>;

// ── Quittance ────────────────────────────────────────────────
export interface Quittance {
  id: string;
  contrat_id: string;
  numero: string;
  periode_debut: string;
  periode_fin: string;
  montant: number;
  date_echeance: string;
  date_paiement?: string;
  mode_paiement?: string;
  reference_paiement?: string;
  status: PaiementStatus;
  agent_id?: string;
  created_at: string;
}

// ── Sinistre ─────────────────────────────────────────────────
export interface Sinistre {
  id: string;
  numero: string;
  contrat_id: string;
  date_sinistre: string;
  date_declaration: string;
  nature: string;
  description?: string;
  lieu?: string;
  montant_declare?: number;
  montant_expertisé?: number;
  montant_indemnise?: number;
  status: SinistreStatus;
  date_cloture?: string;
  agent_id?: string;
  expert_nom?: string;
  documents?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Pagination ───────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  branche?: string;
  agent_id?: string;
  page?: number;
  pageSize?: number;
}
