import { useState, useEffect, useRef, useCallback } from 'react';
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
  echeance_proche:        'bg-amber-50 text-amber-700',
  sinistre_bloque:        'bg-red-50 text-red-700',
  sinistre_bloque_urgent: 'bg-red-100 text-red-800',
  quittance_retard:       'bg-red-50 text-red-700',
  resume_quotidien:       'bg-blue-50 text-blue-700',
  contrat_expire:         'bg-gray-50 text-gray-700',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen]               = useState(false);
  const [notifs, setNotifs]           = useState<Notification[]>([]);
  const [count, setCount]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [triggering, setTriggering]   = useState(false);
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  const loadNotifs = useCallback(async () => {
    const [list, c] = await Promise.all([getNotifications(15), countNonLues()]);
    setNotifs(list);
    setCount(c);
  }, []);

  // Charger au démarrage
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // Polling léger toutes les 2 minutes pour le badge
  useEffect(() => {
    const interval = setInterval(() => countNonLues().then(setCount), 120_000);
    return () => clearInterval(interval);
  }, []);

  // Realtime Supabase : badge se met à jour instantanément
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => {
        countNonLues().then(setCount);
        if (open) loadNotifs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, loadNotifs]);

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {count > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {count} non lues
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Déclencher manuellement (admin) */}
              <button
                onClick={handleTrigger}
                disabled={triggering}
                title="Déclencher les notifications maintenant"
                className="p-1.5 text-gray-400 hover:text-[#00A35E] hover:bg-[#00C875]/10 rounded-lg transition-all"
              >
                <RefreshCw size={13} className={triggering ? 'animate-spin' : ''} />
              </button>
              {count > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Tout marquer comme lu"
                  className="p-1.5 text-gray-400 hover:text-[#00A35E] hover:bg-[#00C875]/10 rounded-lg transition-all"
                >
                  <CheckCheck size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-[#00C875] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="text-center py-12">
                <Bell size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aucune notification</p>
                <p className="text-xs text-gray-300 mt-1">Les alertes apparaîtront ici</p>
              </div>
            )}

            {!loading && notifs.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={clsx(
                  'w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0',
                  !notif.lu && 'bg-blue-50/40'
                )}
              >
                {/* Icon */}
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5',
                  TYPE_COLORS[notif.type] ?? 'bg-gray-50 text-gray-600'
                )}>
                  {getNotifIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm leading-tight',
                    notif.lu ? 'text-gray-600' : 'font-semibold text-gray-900'
                  )}>
                    {notif.titre}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.message}</p>
                  <p className="text-xs text-gray-300 mt-1">{timeAgo(notif.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!notif.lu && (
                  <div className="w-2 h-2 bg-[#00C875] rounded-full shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="text-xs text-[#00A35E] hover:underline font-medium"
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
