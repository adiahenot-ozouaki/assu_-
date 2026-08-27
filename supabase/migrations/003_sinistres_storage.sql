-- ============================================================
-- AssurZen ERP — Migration 003
-- Sinistres : Storage, RLS, workflow, séquence
-- ============================================================

-- ── Séquence sinistres ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_sinistre START 1;

-- ── Numéro sinistre auto ──────────────────────────────────────
CREATE OR REPLACE FUNCTION gen_numero_sinistre()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'SIN-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('seq_sinistre')::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION trg_sinistre_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := gen_numero_sinistre();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sinistre_numero ON sinistres;
CREATE TRIGGER set_sinistre_numero
  BEFORE INSERT OR UPDATE ON sinistres
  FOR EACH ROW EXECUTE FUNCTION trg_sinistre_numero();

-- ── Table documents sinistre ──────────────────────────────────
-- (remplace le JSONB documents dans sinistres par une vraie table)
CREATE TABLE IF NOT EXISTS sinistre_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinistre_id   UUID NOT NULL REFERENCES sinistres(id) ON DELETE CASCADE,
  nom_fichier   TEXT NOT NULL,
  storage_path  TEXT NOT NULL,        -- ex: sinistres/{sinistre_id}/photo_1.jpg
  url_public    TEXT,                  -- URL signée ou publique
  type_doc      TEXT NOT NULL DEFAULT 'photo',
                                       -- 'photo', 'constat', 'facture', 'rapport_expert', 'autre'
  taille_octets BIGINT,
  mime_type     TEXT,
  uploaded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sindoc_sinistre ON sinistre_documents(sinistre_id);

-- ── RLS documents ─────────────────────────────────────────────
ALTER TABLE sinistre_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sindoc_admin_all" ON sinistre_documents
  TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "sindoc_agent_read" ON sinistre_documents
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('agent', 'courtier')
    AND sinistre_id IN (
      SELECT s.id FROM sinistres s
      JOIN contrats c ON c.id = s.contrat_id
      JOIN clients cl ON cl.id = c.client_id
      WHERE cl.agent_id = auth.uid() OR cl.courtier_id = auth.uid()
    )
  );

CREATE POLICY "sindoc_agent_insert" ON sinistre_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- ── Table historique workflow sinistre ────────────────────────
CREATE TABLE IF NOT EXISTS sinistre_historique (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinistre_id   UUID NOT NULL REFERENCES sinistres(id) ON DELETE CASCADE,
  ancien_status TEXT,
  nouveau_status TEXT NOT NULL,
  commentaire   TEXT,
  auteur_id     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sinhist_sinistre ON sinistre_historique(sinistre_id);
ALTER TABLE sinistre_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sinhist_read_auth" ON sinistre_historique
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sinhist_insert_auth" ON sinistre_historique
  FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());

-- ── Trigger : log automatique des changements de statut ───────
CREATE OR REPLACE FUNCTION trg_sinistre_log_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO sinistre_historique(sinistre_id, ancien_status, nouveau_status, auteur_id)
    VALUES (NEW.id, OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_sinistre_status ON sinistres;
CREATE TRIGGER log_sinistre_status
  AFTER UPDATE OF status ON sinistres
  FOR EACH ROW EXECUTE FUNCTION trg_sinistre_log_status();

-- ── Fonction : changer statut sinistre avec commentaire ───────
CREATE OR REPLACE FUNCTION changer_statut_sinistre(
  p_sinistre_id   UUID,
  p_nouveau_status sinistre_status,
  p_commentaire   TEXT DEFAULT NULL
) RETURNS sinistres LANGUAGE plpgsql AS $$
DECLARE
  v_sinistre sinistres%ROWTYPE;
  v_ancien   sinistre_status;
BEGIN
  SELECT * INTO v_sinistre FROM sinistres WHERE id = p_sinistre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sinistre % introuvable', p_sinistre_id;
  END IF;

  v_ancien := v_sinistre.status;

  -- Règles de transition
  IF v_ancien = 'réglé' OR v_ancien = 'sans_suite' THEN
    RAISE EXCEPTION 'Sinistre déjà clôturé (statut: %)', v_ancien;
  END IF;

  -- Mettre à jour
  UPDATE sinistres SET
    status       = p_nouveau_status,
    date_cloture = CASE
      WHEN p_nouveau_status IN ('réglé', 'rejeté', 'sans_suite') THEN CURRENT_DATE
      ELSE date_cloture
    END
  WHERE id = p_sinistre_id
  RETURNING * INTO v_sinistre;

  -- Log manuel avec commentaire (le trigger logge aussi, mais sans commentaire)
  IF p_commentaire IS NOT NULL THEN
    INSERT INTO sinistre_historique(sinistre_id, ancien_status, nouveau_status, commentaire, auteur_id)
    VALUES (p_sinistre_id, v_ancien::TEXT, p_nouveau_status::TEXT, p_commentaire, auth.uid());
  END IF;

  RETURN v_sinistre;
END;
$$;

-- ── Vue sinistres enrichie ────────────────────────────────────
CREATE OR REPLACE VIEW v_sinistres AS
SELECT
  s.*,
  c.numero          AS contrat_numero,
  c.prime_annuelle,
  p.nom             AS produit_nom,
  p.branche,
  cl.nom            AS client_nom,
  cl.prenom         AS client_prenom,
  cl.raison_sociale,
  cl.est_personne_morale,
  cl.code_client,
  cl.telephone      AS client_telephone,
  ag.nom            AS agent_nom,
  ag.prenom         AS agent_prenom,
  -- Nombre de documents
  (SELECT COUNT(*) FROM sinistre_documents sd WHERE sd.sinistre_id = s.id) AS nb_documents,
  -- Jours depuis déclaration
  (CURRENT_DATE - s.date_declaration)::INT AS jours_depuis_declaration
FROM sinistres s
JOIN contrats c  ON c.id  = s.contrat_id
JOIN produits p  ON p.id  = c.produit_id
JOIN clients  cl ON cl.id = c.client_id
LEFT JOIN profiles ag ON ag.id = s.agent_id;

-- ── Storage bucket (à créer via Dashboard ou script) ──────────
-- Dans Supabase Dashboard → Storage → New Bucket
-- Nom: sinistres-documents
-- Public: false (accès par URL signées uniquement)
--
-- Ou via SQL (Supabase Storage API):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('sinistres-documents', 'sinistres-documents', false)
-- ON CONFLICT DO NOTHING;

-- ── Storage RLS policies ──────────────────────────────────────
-- Permettre upload aux utilisateurs authentifiés
-- INSERT INTO storage.policies ...
-- (Supabase gère ça via le Dashboard ou l'API Storage)
--
-- Policy recommandée pour sinistres-documents:
--   SELECT: auth.role() = 'authenticated'
--   INSERT: auth.role() = 'authenticated'
--   DELETE: auth.uid() = owner OU role = 'admin'

-- ── Index supplémentaires ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sinistres_contrat  ON sinistres(contrat_id);
CREATE INDEX IF NOT EXISTS idx_sinistres_status   ON sinistres(status);
CREATE INDEX IF NOT EXISTS idx_sinistres_date_sin ON sinistres(date_sinistre);
