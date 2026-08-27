-- ============================================================
-- AssurZen ERP — Schéma initial
-- Migration: 001_init_schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'agent', 'courtier');
CREATE TYPE client_status AS ENUM ('prospect', 'actif', 'suspendu', 'resilié');
CREATE TYPE contrat_status AS ENUM ('brouillon', 'actif', 'suspendu', 'expiré', 'résilié');
CREATE TYPE branch_type AS ENUM ('auto', 'sante', 'vie', 'mrh', 'autre');
CREATE TYPE sinistre_status AS ENUM ('ouvert', 'en_instruction', 'réglé', 'rejeté', 'sans_suite');
CREATE TYPE paiement_status AS ENUM ('en_attente', 'payé', 'en_retard', 'annulé');
CREATE TYPE paiement_mode AS ENUM ('mobile_money', 'virement', 'especes', 'cheque', 'carte');

-- ============================================================
-- PROFILS UTILISATEURS (liés à auth.users de Supabase)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'agent',
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  telephone   TEXT,
  agence      TEXT,
  avatar_url  TEXT,
  actif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_client     TEXT UNIQUE NOT NULL, -- AZ-2024-00001
  -- Identité
  nom             TEXT NOT NULL,
  prenom          TEXT,
  raison_sociale  TEXT, -- si personne morale
  est_personne_morale BOOLEAN NOT NULL DEFAULT false,
  -- Contact
  telephone       TEXT,
  email           TEXT,
  adresse         TEXT,
  ville           TEXT,
  pays            TEXT NOT NULL DEFAULT 'Gabon',
  -- Pièces
  type_piece      TEXT, -- CNI, Passeport, RCCM...
  numero_piece    TEXT,
  date_naissance  DATE,
  -- Statut
  status          client_status NOT NULL DEFAULT 'prospect',
  -- Relations
  agent_id        UUID REFERENCES profiles(id),
  courtier_id     UUID REFERENCES profiles(id),
  -- Méta
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUITS D'ASSURANCE (catalogue)
-- ============================================================

CREATE TABLE produits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  nom             TEXT NOT NULL,
  branche         branch_type NOT NULL,
  description     TEXT,
  prime_min       NUMERIC(12,2),
  prime_max       NUMERIC(12,2),
  duree_mois      INT NOT NULL DEFAULT 12,
  actif           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTRATS
-- ============================================================

CREATE TABLE contrats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT UNIQUE NOT NULL, -- CTR-2024-00001
  -- Relations
  client_id       UUID NOT NULL REFERENCES clients(id),
  produit_id      UUID NOT NULL REFERENCES produits(id),
  agent_id        UUID REFERENCES profiles(id),
  courtier_id     UUID REFERENCES profiles(id),
  -- Période
  date_effet      DATE NOT NULL,
  date_echeance   DATE NOT NULL,
  -- Financier
  prime_annuelle  NUMERIC(12,2) NOT NULL,
  prime_mensuelle NUMERIC(12,2) GENERATED ALWAYS AS (prime_annuelle / 12) STORED,
  franchise       NUMERIC(12,2) DEFAULT 0,
  devise          TEXT NOT NULL DEFAULT 'FCFA',
  -- Statut
  status          contrat_status NOT NULL DEFAULT 'brouillon',
  -- Objet assuré (JSON flexible selon branche)
  objet_assure    JSONB,
  -- Ex auto: {"marque":"Toyota","modele":"Corolla","immat":"GA-123-AB","annee":2020}
  -- Ex mrh:  {"adresse":"...", "surface_m2": 120, "valeur_mobilier": 5000000}
  -- Garanties souscrites
  garanties       JSONB,
  -- Conditions particulières
  conditions      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AVENANTS (modifications contrat)
-- ============================================================

CREATE TABLE avenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrat_id      UUID NOT NULL REFERENCES contrats(id),
  numero          INT NOT NULL, -- 1, 2, 3...
  type_avenant    TEXT NOT NULL, -- 'suspension', 'remise_en_vigueur', 'modification', 'resiliation'
  date_effet      DATE NOT NULL,
  description     TEXT,
  delta_prime     NUMERIC(12,2) DEFAULT 0,
  agent_id        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contrat_id, numero)
);

-- ============================================================
-- QUITTANCES / PAIEMENTS
-- ============================================================

CREATE TABLE quittances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrat_id      UUID NOT NULL REFERENCES contrats(id),
  numero          TEXT UNIQUE NOT NULL, -- QUI-2024-00001
  periode_debut   DATE NOT NULL,
  periode_fin     DATE NOT NULL,
  montant         NUMERIC(12,2) NOT NULL,
  date_echeance   DATE NOT NULL,
  date_paiement   DATE,
  mode_paiement   paiement_mode,
  reference_paiement TEXT,
  status          paiement_status NOT NULL DEFAULT 'en_attente',
  agent_id        UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SINISTRES
-- ============================================================

CREATE TABLE sinistres (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT UNIQUE NOT NULL, -- SIN-2024-00001
  contrat_id      UUID NOT NULL REFERENCES contrats(id),
  -- Déclaration
  date_sinistre   DATE NOT NULL,
  date_declaration DATE NOT NULL DEFAULT CURRENT_DATE,
  nature          TEXT NOT NULL,
  description     TEXT,
  lieu            TEXT,
  -- Évaluation
  montant_declare NUMERIC(12,2),
  montant_expertisé NUMERIC(12,2),
  montant_indemnise NUMERIC(12,2),
  -- Statut
  status          sinistre_status NOT NULL DEFAULT 'ouvert',
  date_cloture    DATE,
  -- Responsables
  agent_id        UUID REFERENCES profiles(id),
  expert_nom      TEXT,
  -- Pièces jointes (URLs Supabase Storage)
  documents       JSONB DEFAULT '[]',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SÉQUENCES / CODES AUTO
-- ============================================================

CREATE SEQUENCE seq_client START 1;
CREATE SEQUENCE seq_contrat START 1;
CREATE SEQUENCE seq_quittance START 1;
CREATE SEQUENCE seq_sinistre START 1;

-- Fonction génération code client
CREATE OR REPLACE FUNCTION gen_code_client()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'AZ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_client')::TEXT, 5, '0');
END;
$$;

-- Trigger code client auto
CREATE OR REPLACE FUNCTION trg_client_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code_client IS NULL OR NEW.code_client = '' THEN
    NEW.code_client := gen_code_client();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_client_code BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION trg_client_code();

-- Trigger numéro contrat auto
CREATE OR REPLACE FUNCTION trg_contrat_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'CTR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_contrat')::TEXT, 5, '0');
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_contrat_numero BEFORE INSERT OR UPDATE ON contrats
  FOR EACH ROW EXECUTE FUNCTION trg_contrat_numero();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE avenants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits   ENABLE ROW LEVEL SECURITY;

-- Helper: rôle utilisateur courant
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Admins voient tout
CREATE POLICY "admin_all" ON clients TO authenticated
  USING (current_user_role() = 'admin');
CREATE POLICY "admin_all" ON contrats TO authenticated
  USING (current_user_role() = 'admin');

-- Agents voient leurs clients
CREATE POLICY "agent_own_clients" ON clients TO authenticated
  USING (current_user_role() = 'agent' AND agent_id = auth.uid());

-- Courtiers voient leurs clients
CREATE POLICY "courtier_own_clients" ON clients TO authenticated
  USING (current_user_role() = 'courtier' AND courtier_id = auth.uid());

-- Produits lisibles par tous les authentifiés
CREATE POLICY "produits_read" ON produits FOR SELECT TO authenticated USING (true);

-- ============================================================
-- DONNÉES DE DÉPART (seed)
-- ============================================================

INSERT INTO produits (code, nom, branche, description, prime_min, prime_max, duree_mois) VALUES
  ('AUTO-TR',  'Auto Tous Risques',         'auto',  'Couverture complète véhicule + tiers', 80000,  500000, 12),
  ('AUTO-RC',  'Auto Responsabilité Civile','auto',  'RC obligatoire minimum',               25000,  120000, 12),
  ('MRH-STD',  'Multirisque Habitation',    'mrh',   'Habitation + mobilier + RC locataire', 60000,  300000, 12),
  ('SANTE-IND','Santé Individuelle',        'sante', 'Hospitalisation + soins ambulatoires', 120000, 800000, 12),
  ('VIE-TERM', 'Vie Temporaire',            'vie',   'Décès toutes causes',                  50000,  400000, 12);
