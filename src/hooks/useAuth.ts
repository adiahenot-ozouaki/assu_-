import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export function useAuth() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const loadingRef              = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!mounted) return;

        if (error) {
          console.error('Erreur chargement profil:', error.message);
          setProfile(null);
        } else {
          setProfile(data as Profile);
        }
      } finally {
        if (mounted) setLoading(false);
        loadingRef.current = false;
      }
    };

    // onAuthStateChange est la source de vérité — il se déclenche
    // immédiatement avec la session restaurée depuis localStorage,
    // puis à chaque changement (login, logout, refresh token).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return {
    profile,
    loading,
    signOut,
    isAdmin:    profile?.role === 'admin',
    isAgent:    profile?.role === 'agent',
    isCourtier: profile?.role === 'courtier',
  };
}
