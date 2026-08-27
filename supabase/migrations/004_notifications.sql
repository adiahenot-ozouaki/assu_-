-- ============================================================
-- AssurZen ERP — Migration 004
-- Notifications : table de suivi + fonctions de détection
-- ============================================================

-- ── Table notifications ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL,
  -- 'echeance_proche' | 'sinistre_bloque' | 'quittance_retard' | 'contrat_expire'
  titre         TEXT NOT NULL,
  message       TEXT NOT NULL,
  -- Destinataires
  destinataire_id   UUID REFERENCES profiles(id),
  destinataire_email TEXT,
  -- Référence objet
  ref_type      TEXT,   -- 'quittance' | 'sinistre' | 'contrat' | 'client'
  ref_id        UUID,
  ref_numero    TEXT,
  -- Statut
  lu            BOOLEAN NOT NULL DEFAULT false,
  email_envoye  BOOLEAN NOT NULL DEFAULT false,
  email_envoye_at TIMESTAMPTZ,
  -- Dédoublonnage : on n'envoie pas deux fois la même alerte le même jour
  dedup_key     TEXT UNIQUE,  -- ex: 'echeance_QUI-2024-00001_2024-11-01'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_destinataire ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notif_type         ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_lu           ON notifications(lu);
CREATE INDEX IF NOT EXISTS idx_notif_created      ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit ses propres notifications
CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (destinataire_id = auth.uid() OR current_user_role() = 'admin');

CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (destinataire_id = auth.uid());

CREATE POLICY "notif_insert_system" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Fonction : détecter quittances échéance J-15 ──────────────
CREATE OR REPLACE FUNCTION detecter_echeances_proches(jours INT DEFAULT 15)
RETURNS TABLE (
  quittance_id    UUID,
  quittance_numero TEXT,
  montant         NUMERIC,
  date_echeance   DATE,
  jours_restants  INT,
  client_nom      TEXT,
  client_email    TEXT,
  agent_id        UUID,
  agent_email     TEXT,
  contrat_numero  TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    q.id,
    q.numero,
    q.montant,
    q.date_echeance,
    (q.date_echeance - CURRENT_DATE)::INT,
    COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS client_nom,
    cl.email,
    c.agent_id,
    ag.email AS agent_email,
    c.numero AS contrat_numero
  FROM quittances q
  JOIN contrats c  ON c.id  = q.contrat_id
  JOIN clients  cl ON cl.id = c.client_id
  LEFT JOIN profiles ag ON ag.id = c.agent_id
  WHERE q.status = 'en_attente'
    AND q.date_echeance BETWEEN CURRENT_DATE AND (CURRENT_DATE + jours)
  ORDER BY q.date_echeance ASC;
$$;

-- ── Fonction : détecter sinistres bloqués > N jours ──────────
CREATE OR REPLACE FUNCTION detecter_sinistres_bloques(jours INT DEFAULT 7)
RETURNS TABLE (
  sinistre_id     UUID,
  sinistre_numero TEXT,
  nature          TEXT,
  status          sinistre_status,
  jours_bloques   INT,
  dernier_mouvement DATE,
  client_nom      TEXT,
  client_email    TEXT,
  agent_id        UUID,
  agent_email     TEXT,
  contrat_numero  TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.numero,
    s.nature,
    s.status,
    COALESCE(
      (CURRENT_DATE - MAX(h.created_at::DATE))::INT,
      (CURRENT_DATE - s.date_declaration)::INT
    ) AS jours_bloques,
    COALESCE(MAX(h.created_at::DATE), s.date_declaration) AS dernier_mouvement,
    COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS client_nom,
    cl.email,
    c.agent_id,
    ag.email AS agent_email,
    c.numero AS contrat_numero
  FROM sinistres s
  JOIN contrats c  ON c.id  = s.contrat_id
  JOIN clients  cl ON cl.id = c.client_id
  LEFT JOIN profiles ag ON ag.id = s.agent_id
  LEFT JOIN sinistre_historique h ON h.sinistre_id = s.id
  WHERE s.status IN ('ouvert', 'en_instruction')
  GROUP BY s.id, s.numero, s.nature, s.status, s.date_declaration,
           cl.raison_sociale, cl.prenom, cl.nom, cl.email,
           c.agent_id, ag.email, c.numero
  HAVING COALESCE(
    (CURRENT_DATE - MAX(h.created_at::DATE))::INT,
    (CURRENT_DATE - s.date_declaration)::INT
  ) >= jours
  ORDER BY jours_bloques DESC;
$$;

-- ── Fonction : quittances en retard ──────────────────────────
CREATE OR REPLACE FUNCTION detecter_quittances_retard()
RETURNS TABLE (
  quittance_id    UUID,
  quittance_numero TEXT,
  montant         NUMERIC,
  date_echeance   DATE,
  jours_retard    INT,
  client_nom      TEXT,
  client_email    TEXT,
  agent_id        UUID,
  agent_email     TEXT,
  contrat_numero  TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    q.id,
    q.numero,
    q.montant,
    q.date_echeance,
    (CURRENT_DATE - q.date_echeance)::INT,
    COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom),
    cl.email,
    c.agent_id,
    ag.email,
    c.numero
  FROM quittances q
  JOIN contrats c  ON c.id  = q.contrat_id
  JOIN clients  cl ON cl.id = c.client_id
  LEFT JOIN profiles ag ON ag.id = c.agent_id
  WHERE q.status = 'en_retard'
  ORDER BY q.date_echeance ASC;
$$;

-- ── Vue notifications non lues (pour badge header) ───────────
CREATE OR REPLACE VIEW v_notifications_non_lues AS
SELECT
  n.*,
  p.nom   AS dest_nom,
  p.prenom AS dest_prenom
FROM notifications n
LEFT JOIN profiles p ON p.id = n.destinataire_id
WHERE n.lu = false
ORDER BY n.created_at DESC;
