import { supabase } from './supabase';

export interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string;
  lu: boolean;
  ref_type?: string;
  ref_id?: string;
  ref_numero?: string;
  created_at: string;
}

// ── Charger les notifications non lues ───────────────────────
export async function getNotifications(limit = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Notification[];
}

// ── Compter les non lues ──────────────────────────────────────
export async function countNonLues(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('lu', false);

  if (error) return 0;
  return count ?? 0;
}

// ── Marquer comme lue ─────────────────────────────────────────
export async function marquerLue(id: string): Promise<void> {
  await supabase.from('notifications').update({ lu: true }).eq('id', id);
}

// ── Marquer toutes comme lues ─────────────────────────────────
export async function marquerToutesLues(): Promise<void> {
  await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('lu', false);
}

// ── Déclencher le cron manuellement ──────────────────────────
export async function declencherNotifications(): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications-cron`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? 'Erreur');
  return result;
}

// ── Icône par type ────────────────────────────────────────────
export function getNotifIcon(type: string): string {
  const icons: Record<string, string> = {
    echeance_proche:       '⏰',
    sinistre_bloque:       '🚨',
    sinistre_bloque_urgent:'🔴',
    quittance_retard:      '💳',
    resume_quotidien:      '📋',
    contrat_expire:        '📄',
  };
  return icons[type] ?? '🔔';
}

// ── Route associée ────────────────────────────────────────────
export function getNotifRoute(notif: Notification): string {
  if (notif.ref_type === 'sinistre')  return `/sinistres/${notif.ref_id}`;
  if (notif.ref_type === 'quittance') return `/quittances`;
  if (notif.ref_type === 'contrat')   return `/contrats/${notif.ref_id}`;
  return '/dashboard';
}
