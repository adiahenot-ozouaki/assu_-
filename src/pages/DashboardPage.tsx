import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getClientStats } from '../lib/clients.service';
import { getContratStats } from '../lib/contrats.service';
import { formatCurrency } from '../lib/supabase';
import { StatCard, Card, Spinner } from '../components/ui';

interface Stats {
  clients: { total: number; actifs: number; prospects: number; resiliés: number };
  contrats: { total: number; actifs: number; primeTotal: number; parBranche: Record<string, number> };
}

const BRANCH_LABELS: Record<string, { label: string; icon: string }> = {
  auto:  { label: 'Auto',       icon: '🚗' },
  sante: { label: 'Santé',      icon: '🏥' },
  vie:   { label: 'Vie',        icon: '❤️' },
  mrh:   { label: 'Habitation', icon: '🏠' },
  autre: { label: 'Autre',      icon: '📋' },
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClientStats(), getContratStats()])
      .then(([clients, contrats]) => setStats({ clients, contrats }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" role="status">
        <Spinner className="w-8 h-8 text-brand" />
      </div>
    );
  }

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">
            {greet}, {profile?.prenom}{' '}
            <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-subtle bg-surface-3 px-3 py-1.5 rounded-full self-start">
          <TrendingUp size={13} aria-hidden />
          Données en temps réel
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total clients"
          value={stats?.clients.total ?? 0}
          icon="👥"
          trend={`${stats?.clients.prospects ?? 0} prospects`}
          color="blue"
        />
        <StatCard
          label="Clients actifs"
          value={stats?.clients.actifs ?? 0}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Contrats actifs"
          value={stats?.contrats.actifs ?? 0}
          icon="📋"
          trend={`sur ${stats?.contrats.total ?? 0} total`}
          color="purple"
        />
        <StatCard
          label="Primes (annuel)"
          value={formatCurrency(stats?.contrats.primeTotal ?? 0)}
          icon="💰"
          color="amber"
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 col-span-1">
          <h2 className="text-sm font-semibold text-ink mb-4">Contrats par branche</h2>
          <div className="space-y-3">
            {Object.entries(stats?.contrats.parBranche ?? {}).map(([branche, count]) => {
              const cfg = BRANCH_LABELS[branche] ?? { label: branche, icon: '📋' };
              const total = stats?.contrats.total || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={branche}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-muted">
                      <span aria-hidden>{cfg.icon}</span> {cfg.label}
                    </span>
                    <span className="text-sm font-medium text-ink">{count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${cfg.label} ${pct}%`}>
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!Object.keys(stats?.contrats.parBranche ?? {}).length && (
              <p className="text-sm text-ink-subtle text-center py-4">Aucun contrat</p>
            )}
          </div>
        </Card>

        <Card className="p-5 col-span-1 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { to: '/clients/nouveau',   icon: '👤', label: 'Nouveau client',   desc: 'Créer une fiche client' },
              { to: '/contrats/nouveau',  icon: '📝', label: 'Nouveau contrat',  desc: 'Émettre un contrat'     },
              { to: '/sinistres/nouveau', icon: '🚨', label: 'Déclarer sinistre', desc: 'Ouvrir un dossier'     },
              { to: '/clients',           icon: '🔍', label: 'Rechercher client', desc: 'Accéder au portefeuille'},
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-brand/30 hover:bg-brand-soft transition-all group"
              >
                <span className="text-2xl" aria-hidden>{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink group-hover:text-brand-dark">{item.label}</p>
                  <p className="text-xs text-ink-subtle truncate">{item.desc}</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-ink-subtle group-hover:text-brand shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
