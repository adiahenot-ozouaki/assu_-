-- ============================================================
-- AssurZen ERP — Fix 003 : FIN de la récursion RLS sur profiles
-- Erreur : infinite recursion detected in policy for relation "profiles"
--
-- À coller ENTIEREMENT dans Supabase → SQL Editor → Run
-- ============================================================

-- 0) Fonction rôle SANS passer par les policies RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

ALTER FUNCTION public.current_user_role() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

-- 1) Supprimer TOUTES les policies sur profiles (noms variables)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- 2) RLS reste activé, policies NON récursives uniquement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté (ERP interne — nécessaire pour
-- auth, embeds agent/courtier, paramètres). PAS de sous-requête sur profiles.
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Insertion : uniquement son propre id (après signup / trigger)
CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update : soi-même OU admin (role via SECURITY DEFINER → pas de récursion)
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- Delete : admin seulement
CREATE POLICY "profiles_delete"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- 3) Vérifications
SELECT policyname, cmd, qual IS NOT NULL AS has_using
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

SELECT proname, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'current_user_role';
