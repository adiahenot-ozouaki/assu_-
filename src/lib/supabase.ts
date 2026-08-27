import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises dans .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'assurzen-auth',
  },
});

// ── Formatage FCFA ─────────────────────────────────────────────
export function formatCurrency(amount: number, currency = 'FCFA'): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

// ── Formatage date fr ──────────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateStr));
}
