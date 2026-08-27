-- ============================================================
-- AssurZen ERP — Fix 001 : RLS profiles + toutes les tables
-- À coller dans Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. Supprimer les policies existantes sur profiles ────────
DROP POLICY IF EXISTS "admin_all"             ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;

-- ── 2. Policy SELECT : chaque user lit son propre profil ─────
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ── 3. Policy SELECT : les admins voient tous les profils ────
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- ── 4. Policy INSERT ─────────────────────────────────────────
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ── 5. Policy UPDATE ─────────────────────────────────────────
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ── 6. Corriger les policies clients ─────────────────────────
DROP POLICY IF EXISTS "admin_all"          ON clients;
DROP POLICY IF EXISTS "agent_own_clients"  ON clients;

CREATE POLICY "clients_admin_all" ON clients
  TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "clients_agent_select" ON clients
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('agent', 'courtier')
    AND (agent_id = auth.uid() OR courtier_id = auth.uid())
  );

CREATE POLICY "clients_agent_insert" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'agent', 'courtier'));

CREATE POLICY "clients_agent_update" ON clients
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'admin'
    OR agent_id = auth.uid()
    OR courtier_id = auth.uid()
  );

-- ── 7. Corriger les policies contrats ────────────────────────
DROP POLICY IF EXISTS "admin_all" ON contrats;

CREATE POLICY "contrats_admin_all" ON contrats
  TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "contrats_agent_select" ON contrats
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('agent', 'courtier')
    AND (agent_id = auth.uid() OR courtier_id = auth.uid())
  );

CREATE POLICY "contrats_agent_insert" ON contrats
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'agent', 'courtier'));

CREATE POLICY "contrats_agent_update" ON contrats
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'admin'
    OR agent_id = auth.uid()
    OR courtier_id = auth.uid()
  );

-- ── 8. Quittances ─────────────────────────────────────────────
DROP POLICY IF EXISTS "quittances_all"    ON quittances;
DROP POLICY IF EXISTS "quittances_insert" ON quittances;

CREATE POLICY "quittances_select" ON quittances
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'admin'
    OR contrat_id IN (
      SELECT id FROM contrats
      WHERE agent_id = auth.uid()
         OR courtier_id = auth.uid()
    )
  );

CREATE POLICY "quittances_insert" ON quittances
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "quittances_update" ON quittances
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'agent', 'courtier'));

-- ── 9. Sinistres ──────────────────────────────────────────────
DROP POLICY IF EXISTS "sinistres_all"    ON sinistres;
DROP POLICY IF EXISTS "sinistres_insert" ON sinistres;

CREATE POLICY "sinistres_select" ON sinistres
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'admin'
    OR contrat_id IN (
      SELECT c.id FROM contrats c
      JOIN clients cl ON cl.id = c.client_id
      WHERE cl.agent_id = auth.uid()
         OR cl.courtier_id = auth.uid()
    )
  );

CREATE POLICY "sinistres_insert" ON sinistres
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "sinistres_update" ON sinistres
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'agent', 'courtier'));

-- ── 10. Produits (lecture seule) ─────────────────────────────
DROP POLICY IF EXISTS "produits_read" ON produits;
CREATE POLICY "produits_read" ON produits
  FOR SELECT TO authenticated USING (true);

-- ── 11. Confirmer l'email de l'utilisateur ───────────────────
-- IMPORTANT : remplace ton@email.com par ton vrai email
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- ── 12. Vérification finale ───────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
