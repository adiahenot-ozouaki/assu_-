-- ============================================================
-- AssurZen ERP — Fix 002 : performance RLS (évite timeout 57014)
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

-- 1) current_user_role() en SECURITY DEFINER
--    Sinon chaque policy qui appelle cette fonction relit profiles
--    sous RLS → récursion / timeout (surtout avec embeds PostgREST).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

-- 2) Lecture des profils pour les jointures (agent / courtier sur clients)
--    Sans ça, embed profiles!agent_id échoue ou timeout sous RLS strict.
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

-- Tout utilisateur authentifié peut lire les profils (ERP interne)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT / UPDATE restent restreints (créés dans fix_001 si absents)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR current_user_role() = 'admin'
  );

-- 3) Index utiles pour listes + filtres RLS
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON public.clients (agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_courtier_id ON public.clients (courtier_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 4) Vérification
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'current_user_role';
