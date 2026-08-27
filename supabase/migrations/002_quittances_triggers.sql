-- ============================================================
-- AssurZen ERP — Migration 002
-- Génération automatique des quittances
-- ============================================================

-- ── Séquence quittances (si pas déjà créée) ──────────────────
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS seq_quittance START 1;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ── Séquence sinistres (si pas déjà créée) ───────────────────
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS seq_sinistre START 1;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ── Fonction utilitaire : numéro de quittance ─────────────────
CREATE OR REPLACE FUNCTION gen_numero_quittance()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'QUI-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('seq_quittance')::TEXT, 5, '0');
END;
$$;

-- ============================================================
-- FONCTION PRINCIPALE : générer les quittances d'un contrat
-- Appelée par trigger ET par l'Edge Function
-- ============================================================
CREATE OR REPLACE FUNCTION generer_quittances_contrat(p_contrat_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_contrat       contrats%ROWTYPE;
  v_date_debut    DATE;
  v_date_fin      DATE;
  v_prime_mensuelle NUMERIC(12,2);
  v_mois          INT;
  v_total_mois    INT;
  v_count         INT := 0;
BEGIN
  -- Charger le contrat
  SELECT * INTO v_contrat FROM contrats WHERE id = p_contrat_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrat % introuvable', p_contrat_id;
  END IF;

  -- Calculer la durée en mois
  v_total_mois := (
    (EXTRACT(YEAR FROM v_contrat.date_echeance) - EXTRACT(YEAR FROM v_contrat.date_effet)) * 12
    + (EXTRACT(MONTH FROM v_contrat.date_echeance) - EXTRACT(MONTH FROM v_contrat.date_effet))
  )::INT;

  -- Minimum 1 mois
  IF v_total_mois < 1 THEN v_total_mois := 1; END IF;

  -- Prime mensuelle arrondie
  v_prime_mensuelle := ROUND(v_contrat.prime_annuelle / 12, 0);

  -- Supprimer les quittances existantes en statut en_attente
  -- (pour permettre la régénération sans dupliquer)
  DELETE FROM quittances
  WHERE contrat_id = p_contrat_id
    AND status = 'en_attente';

  -- Générer une quittance par mois
  FOR v_mois IN 0..(v_total_mois - 1) LOOP
    v_date_debut := v_contrat.date_effet + (v_mois || ' months')::INTERVAL;
    v_date_fin   := v_date_debut + INTERVAL '1 month' - INTERVAL '1 day';

    -- Ne pas dépasser la date d'échéance
    IF v_date_debut >= v_contrat.date_echeance THEN
      EXIT;
    END IF;
    IF v_date_fin > v_contrat.date_echeance THEN
      v_date_fin := v_contrat.date_echeance;
    END IF;

    INSERT INTO quittances (
      contrat_id,
      numero,
      periode_debut,
      periode_fin,
      montant,
      date_echeance,
      status
    ) VALUES (
      p_contrat_id,
      gen_numero_quittance(),
      v_date_debut,
      v_date_fin,
      v_prime_mensuelle,
      v_date_debut + INTERVAL '15 days', -- 15 jours pour payer
      'en_attente'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- TRIGGER : génération auto quand un contrat passe à "actif"
-- ============================================================
CREATE OR REPLACE FUNCTION trg_contrat_activation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Déclencher uniquement quand le statut passe à "actif"
  IF NEW.status = 'actif' AND (OLD.status IS DISTINCT FROM 'actif') THEN
    PERFORM generer_quittances_contrat(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contrat_activation ON contrats;
CREATE TRIGGER on_contrat_activation
  AFTER UPDATE OF status ON contrats
  FOR EACH ROW
  EXECUTE FUNCTION trg_contrat_activation();

-- Aussi déclencher si le contrat est créé directement en "actif"
CREATE OR REPLACE FUNCTION trg_contrat_insert_actif()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'actif' THEN
    PERFORM generer_quittances_contrat(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contrat_insert_actif ON contrats;
CREATE TRIGGER on_contrat_insert_actif
  AFTER INSERT ON contrats
  FOR EACH ROW
  EXECUTE FUNCTION trg_contrat_insert_actif();

-- ============================================================
-- FONCTION : encaisser une quittance
-- Met à jour la quittance + crée un historique de paiement
-- ============================================================
CREATE OR REPLACE FUNCTION encaisser_quittance(
  p_quittance_id     UUID,
  p_mode_paiement    paiement_mode,
  p_reference        TEXT DEFAULT NULL,
  p_date_paiement    DATE DEFAULT CURRENT_DATE
) RETURNS quittances LANGUAGE plpgsql AS $$
DECLARE
  v_quittance quittances%ROWTYPE;
BEGIN
  SELECT * INTO v_quittance FROM quittances WHERE id = p_quittance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quittance % introuvable', p_quittance_id;
  END IF;
  IF v_quittance.status = 'payé' THEN
    RAISE EXCEPTION 'Quittance % déjà payée', p_quittance_id;
  END IF;

  UPDATE quittances
  SET
    status             = 'payé',
    date_paiement      = p_date_paiement,
    mode_paiement      = p_mode_paiement,
    reference_paiement = p_reference
  WHERE id = p_quittance_id
  RETURNING * INTO v_quittance;

  RETURN v_quittance;
END;
$$;

-- ============================================================
-- FONCTION : recalculer les statuts en retard
-- À appeler via un cron Supabase ou pg_cron
-- ============================================================
CREATE OR REPLACE FUNCTION maj_quittances_en_retard()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE quittances
  SET status = 'en_retard'
  WHERE status = 'en_attente'
    AND date_echeance < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- VUE : tableau de bord paiements
-- ============================================================
CREATE OR REPLACE VIEW v_quittances_dashboard AS
SELECT
  q.*,
  c.numero          AS contrat_numero,
  c.prime_annuelle,
  cl.nom            AS client_nom,
  cl.prenom         AS client_prenom,
  cl.raison_sociale,
  cl.est_personne_morale,
  cl.code_client,
  p.nom             AS produit_nom,
  p.branche,
  -- Jours de retard (si en retard)
  CASE
    WHEN q.status = 'en_retard'
    THEN (CURRENT_DATE - q.date_echeance)::INT
    ELSE 0
  END AS jours_retard,
  -- Jours avant échéance (si en attente)
  CASE
    WHEN q.status = 'en_attente'
    THEN (q.date_echeance - CURRENT_DATE)::INT
    ELSE NULL
  END AS jours_avant_echeance
FROM quittances q
JOIN contrats c  ON c.id  = q.contrat_id
JOIN clients  cl ON cl.id = c.client_id
JOIN produits p  ON p.id  = c.produit_id;

-- ============================================================
-- INDEX pour les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quittances_contrat_id ON quittances(contrat_id);
CREATE INDEX IF NOT EXISTS idx_quittances_status      ON quittances(status);
CREATE INDEX IF NOT EXISTS idx_quittances_echeance    ON quittances(date_echeance);
CREATE INDEX IF NOT EXISTS idx_contrats_status        ON contrats(status);
CREATE INDEX IF NOT EXISTS idx_clients_status         ON clients(status);

-- ============================================================
-- CRON : mise à jour quotidienne des retards (si pg_cron dispo)
-- Dans Supabase : Dashboard → Database → Extensions → pg_cron
-- ============================================================
-- SELECT cron.schedule(
--   'maj-retards-quotidien',
--   '0 7 * * *',   -- chaque jour à 7h
--   'SELECT maj_quittances_en_retard()'
-- );
