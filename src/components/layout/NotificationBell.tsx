import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import {
  getNotifications, countNonLues,
  marquerLue, marquerToutesLues,
  declencherNotifications,
  getNotifIcon, getNotifRoute,
  type Notification,
} from '../../lib/notifications.service';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

const TYPE_COLORS: Record<string, string> = {
  echeance_proche:        'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sinistre_bloque:        'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  sinistre_bloque_urgent: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  quittance_retard:       'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  resume_quotidien:       'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  contrat_expire:         'bg-gray-50 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

interface NotificationBellProps {
  /** 'dark' = sidebar (white icons), 'light' = topbar (ink icons) */
  variant?: 'dark' | 'light';
}

export function NotificationBell({ variant = 'dark' }: NotificationBellProps) {
  const navigate = useNavigate();
  const instanceId = useId().replace(/:/g, '');
  const [open, setOpen]               = useState(false);
  const [notifs, setNotifs]           = useState<Notification[]>([]);
  const [count, setCount]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [triggering, setTriggering]   = useState(false);
  const dropdownRef                   = useRef<HTMLDivElement>(null);
  const openRef                       = useRef(open);
  openRef.current = open;

  const loadNotifs = useCallback(async () => {
    const [list, c] = await Promise.all([getNotifications(15), countNonLues()]);
    setNotifs(list);
    setCount(c);
  }, []);

  const loadNotifsRef = useRef(loadNotifs);
  loadNotifsRef.current = loadNotifs;

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  useEffect(() => {
    const interval = setInterval(() => countNonLues().then(setCount), 120_000);
    return () => clearInterval(interval);
  }, []);

  // Canal Realtime unique par instance (plusieurs cloches : sidebar desktop + mobile + header)
  useEffect(() => {
    const topic = `notifications-changes-${instanceId}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          countNonLues().then(setCount);
          if (openRef.current) loadNotifsRef.current();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [instanceId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open) {
      setLoading(true);
      await loadNotifs();
      setLoading(false);
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.lu) await marquerLue(notif.id);
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, lu: true } : n));
    setCount(c => Math.max(0, c - (notif.lu ? 0 : 1)));
    const route = getNotifRoute(notif);
    setOpen(false);
    navigate(route);
  };

  const handleMarkAll = async () => {
    await marquerToutesLues();
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
    setCount(0);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await declencherNotifications();
      await loadNotifs();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  const btnClass = variant === 'light'
    ? 'relative w-10 h-10 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-3 transition-all'
    : 'relative w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={btnClass}
        aria-label={count > 0 ? `Notifications, ${count} non lues` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[min(24rem,calc(100vw-1.5rem))] bg-surface-2 rounded-2xl shadow-card-lg border border-border z-50 overflow-hidden dark:shadow-card-dark"
          role="menu"
          aria-label="Liste des notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-ink-muted" aria-hidden />
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {count > 0 && (
                <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {count} non lues
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleTrigger}
                disabled={triggering}
                title="Déclencher les notifications maintenant"
                className="p-1.5 text-ink-subtle hover:text-brand-dark hover:bg-brand-soft rounded-lg transition-all"
                aria-label="Actualiser les notifications"
              >
                <RefreshCw size={13} className={triggering ? 'animate-spin' : ''} />
              </button>
              {count > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  title="Tout marquer comme lu"
                  className="p-1.5 text-ink-subtle hover:text-brand-dark hover:bg-brand-soft rounded-lg transition-all"
                  aria-label="Tout marquer comme lu"
                >
                  <CheckCheck size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="text-center py-12">
                <Bell size={32} className="text-ink-subtle/40 mx-auto mb-3" aria-hidden />
                <p className="text-sm text-ink-muted">Aucune notification</p>
                <p className="text-xs text-ink-subtle mt-1">Les alertes apparaîtront ici</p>
              </div>
            )}

            {!loading && notifs.map(notif => (
              <button
                key={notif.id}
                type="button"
                role="menuitem"
                onClick={() => handleClick(notif)}
                className={clsx(
                  'w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-3 transition-colors text-left border-b border-border last:border-0',
                  !notif.lu && 'bg-blue-50/40 dark:bg-blue-500/5'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5',
                  TYPE_COLORS[notif.type] ?? 'bg-surface-3 text-ink-muted'
                )} aria-hidden>
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm leading-tight',
                    notif.lu ? 'text-ink-muted' : 'font-semibold text-ink'
                  )}>
                    {notif.titre}
                  </p>
                  <p className="text-xs text-ink-subtle mt-0.5 truncate">{notif.message}</p>
                  <p className="text-xs text-ink-subtle/70 mt-1">{timeAgo(notif.created_at)}</p>
                </div>

                {!notif.lu && (
                  <div className="w-2 h-2 bg-brand rounded-full shrink-0 mt-2" aria-label="Non lu" />
                )}
              </button>
            ))}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-surface-3/50">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="text-xs text-brand-dark hover:underline font-medium"
              >
                Voir toutes les notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
