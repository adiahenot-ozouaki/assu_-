import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw, Filter } from 'lucide-react';
import {
  getNotifications,
  marquerLue,
  marquerToutesLues,
  declencherNotifications,
  getNotifIcon,
  getNotifRoute,
  type Notification,
} from '../lib/notifications.service';
import { Button, Card, Spinner } from '../components/ui';
import { clsx } from 'clsx';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

const TYPE_COLORS: Record<string, string> = {
  echeance_proche: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sinistre_bloque: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  sinistre_bloque_urgent: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  quittance_retard: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  resume_quotidien: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  contrat_expire: 'bg-surface-3 text-ink-muted',
};

type FilterMode = 'all' | 'unread';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [triggering, setTriggering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNotifications(100);
      setNotifs(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifs.filter(n => !n.lu).length;
  const displayed =
    filter === 'unread' ? notifs.filter(n => !n.lu) : notifs;

  const handleClick = async (notif: Notification) => {
    if (!notif.lu) {
      await marquerLue(notif.id);
      setNotifs(prev => prev.map(n => (n.id === notif.id ? { ...n, lu: true } : n)));
    }
    navigate(getNotifRoute(notif));
  };

  const handleMarkAll = async () => {
    await marquerToutesLues();
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await declencherNotifications();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink font-display flex items-center gap-2">
            <Bell size={22} className="text-brand" aria-hidden />
            Notifications
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleTrigger} loading={triggering}>
            <RefreshCw size={14} aria-hidden /> Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAll}>
              <CheckCheck size={14} aria-hidden /> Tout marquer lu
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Filtrer">
        <Filter size={14} className="text-ink-subtle" aria-hidden />
        {(['all', 'unread'] as FilterMode[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f
                ? 'bg-brand text-white'
                : 'bg-surface-3 text-ink-muted hover:text-ink'
            )}
          >
            {f === 'all' ? 'Toutes' : 'Non lues'}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading && (
          <div className="flex justify-center py-16" role="status">
            <Spinner className="w-8 h-8 text-brand" />
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-16 px-4">
            <Bell size={36} className="text-ink-subtle/40 mx-auto mb-3" aria-hidden />
            <p className="text-sm text-ink-muted">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        )}

        {!loading &&
          displayed.map(notif => (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleClick(notif)}
              className={clsx(
                'w-full flex items-start gap-3 px-4 py-4 text-left border-b border-border last:border-0 hover:bg-surface-3 transition-colors',
                !notif.lu && 'bg-blue-50/40 dark:bg-blue-500/5'
              )}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0',
                  TYPE_COLORS[notif.type] ?? 'bg-surface-3 text-ink-muted'
                )}
                aria-hidden
              >
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    'text-sm',
                    notif.lu ? 'text-ink-muted' : 'font-semibold text-ink'
                  )}
                >
                  {notif.titre}
                </p>
                <p className="text-xs text-ink-subtle mt-0.5">{notif.message}</p>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-ink-subtle/80">
                  <span>{timeAgo(notif.created_at)}</span>
                  {notif.ref_numero && (
                    <span className="font-mono">{notif.ref_numero}</span>
                  )}
                </div>
              </div>
              {!notif.lu && (
                <span className="w-2.5 h-2.5 bg-brand rounded-full shrink-0 mt-2" aria-label="Non lu" />
              )}
            </button>
          ))}
      </Card>
    </div>
  );
}
