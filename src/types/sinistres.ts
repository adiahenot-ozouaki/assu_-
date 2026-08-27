// ── Extension des types pour les sinistres ────────────────────
// À ajouter dans src/types/index.ts ou importer séparément

export interface SinistreDocument {
  id: string;
  sinistre_id: string;
  nom_fichier: string;
  storage_path: string;
  url_public?: string;
  type_doc: 'photo' | 'constat' | 'facture' | 'rapport_expert' | 'autre';
  taille_octets?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface SinistreHistorique {
  id: string;
  sinistre_id: string;
  ancien_status?: string;
  nouveau_status: string;
  commentaire?: string;
  auteur_id?: string;
  created_at: string;
  auteur?: { nom: string; prenom: string };
}

export interface SinistreComplet {
  id: string;
  numero: string;
  contrat_id: string;
  contrat_numero: string;
  produit_nom: string;
  branche: string;
  client_nom: string;
  client_prenom?: string;
  raison_sociale?: string;
  est_personne_morale: boolean;
  code_client: string;
  client_telephone?: string;
  agent_nom?: string;
  agent_prenom?: string;
  date_sinistre: string;
  date_declaration: string;
  nature: string;
  description?: string;
  lieu?: string;
  montant_declare?: number;
  montant_expertisé?: number;
  montant_indemnise?: number;
  status: string;
  date_cloture?: string;
  expert_nom?: string;
  notes?: string;
  nb_documents: number;
  jours_depuis_declaration: number;
  created_at: string;
  updated_at: string;
  documents?: SinistreDocument[];
  historique?: SinistreHistorique[];
}

export interface NouveauSinistreForm {
  contrat_id: string;
  date_sinistre: string;
  nature: string;
  description: string;
  lieu: string;
  montant_declare?: number;
  expert_nom?: string;
  notes?: string;
}
