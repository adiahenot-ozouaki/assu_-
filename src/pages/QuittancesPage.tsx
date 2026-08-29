import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getQuittancesDashboard, getQuittanceStats,
  type QuittanceDashboard, type QuittanceStats
} from '../lib/quittances.service';
import type { PaiementStatus, Quittance } from '../types';
import { formatCurrency, formatDate } from '../lib/supabase';
import { Badge, Button, Card, EmptyState, Spinner, StatCard } from '../components/ui';
import { EncaissementModal } from '../components/quittances/EncaissementModal';
import { PdfButton } from '../components/pdf/PdfButton';
import { clsx } from 'clsx';

const STATUS_CFG: Record<PaiementStatus, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' }> = {
  'payé':       { label: 'Payée',      variant: 'green' },
  'en_attente': { label: 'En attente', variant: 'amber' },
  'en_retard':  { label: 'En retard',  variant: 'red'   },
  'annulé':     { label: 'Annulée',    variant: 'gray'  },
};

const MODE_LABELS: Record<string, string> = {
  mobile_money: '📱 Mobile Money',
  especes:      '💵 Espèces',
  virement:     '🏦 Virement',
  cheque:       '📄 Chèque',
  carte:        '💳 Carte',
};

const STATUS_FILTER_OPTIONS = [
  { value: '',           label: 'Tous les statuts' },
  { value: 'en_retard',  label: '🔴 En retard'    },
  { value: 'en_attente', label: '🟡 En attente'   },
  { value: 'payé',       label: '🟢 Payées'       },
  { value: 'annulé',     label: '⚪ Annulées'     },
];

const PAGE_SIZE = 20;

export default function QuittancesPage() {
  const navigate = useNavigate();
  const [rows, setRows]           = useState<QuittanceDashboard[]>([]);
  const [total, setTotal]         = useState(0);
  const [stats, setStats]         = useState<QuittanceStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState<QuittanceDashboard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        getQuittancesDashboard({ status: status as PaiementStatus | '', search, page, pageSize: PAGE_SIZE }),
        getQuittanceStats(),
      ]);
      setRows(list.data);
      setTotal(list.count);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleEncaissementSuccess = (updated: Quittance) => {
    setRows(prev =>
      prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
    );
    setModal(null);
    getQuittanceStats().then(setStats);
  };

  const clientName = (row: QuittanceDashboard) =>
    row.est_personne_morale
      ? row.raison_sociale
      : `${row.client_prenom ?? ''} ${row.client_nom}`.trim();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">Paiements & Quittances</h1>
          <p className="text-sm text-ink-muted mt-0.5">{total} quittance{total > 1 ? 's' : ''}</p>
        </div>
        <Button variant="secondary" onClick={load} className="self-start sm:self-auto">
          <RefreshCw size={14} aria-hidden /> Actualiser
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Encaissées" value={stats.payees} icon="✅" trend={formatCurrency(stats.montant_encaisse)} color="green" />
          <StatCard label="En attente" value={stats.en_attente} icon="⏳" trend={formatCurrency(stats.montant_en_attente)} color="blue" />
          <StatCard label="En retard" value={stats.en_retard} icon="🔴" trend={formatCurrency(stats.montant_en_retard)} color="amber" />
          <StatCard label="Total quittances" value={stats.total} icon="🧾" color="purple" />
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <label htmlFor="quittances-search" className="sr-only">Rechercher une quittance</label>
            <input
              id="quittances-search"
              name="search"
              type="search"
              placeholder="Client, N° contrat, N° quittance…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <label htmlFor="quittances-status" className="sr-only">Filtrer par statut</label>
          <select
            id="quittances-status"
            name="status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16" role="status">
            <Spinner className="w-6 h-6 text-brand" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Aucune quittance trouvée"
            description="Activez des contrats pour générer des quittances."
          />
        ) : (
          <>
            <div className="md:hidden divide-y divide-border">
              {rows.map(row => {
                const cfg = STATUS_CFG[row.status as PaiementStatus] ?? STATUS_CFG['en_attente'];
                const retard = row.jours_retard > 0;
                const urgent = !retard && (row.jours_avant_echeance ?? 99) <= 7;
                return (
                  <div
                    key={row.id}
                    className={clsx(
                      'p-4 space-y-2',
                      retard && 'bg-red-50/40 dark:bg-red-500/5',
                      urgent && !retard && 'bg-amber-50/30 dark:bg-amber-500/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-ink-muted">{row.numero}</p>
                        <p className="font-medium text-ink truncate">{clientName(row)}</p>
                        <button
                          type="button"
                          onClick={() => navigate(`/contrats/${row.contrat_id}`)}
                          className="font-mono text-xs text-brand-dark hover:underline mt-0.5"
                        >
                          {row.contrat_numero}
                        </button>
                      </div>
                      <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-ink">{formatCurrency(row.montant)}</span>
                      <span className={clsx('text-xs', retard ? 'text-red-600 dark:text-red-400' : urgent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-muted')}>
                        {formatDate(row.date_echeance)}
                        {retard && ` · ${row.jours_retard}j retard`}
                      </span>
                    </div>
                    {(row.status === 'en_attente' || row.status === 'en_retard') && (
                      <div className="flex items-center gap-2 pt-1">
                        <PdfButton type="quittance" id={row.id} docRef={row.numero} variant="icon" mode="both" />
                        <Button size="sm" onClick={() => setModal(row)}>Encaisser</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-3/50">
                    {['N° Quittance', 'Client', 'Contrat', 'Période', 'Montant', 'Échéance', 'Statut', ''].map(h => (
                      <th key={h || 'actions'} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(row => {
                    const cfg = STATUS_CFG[row.status as PaiementStatus] ?? STATUS_CFG['en_attente'];
                    const retard = row.jours_retard > 0;
                    const urgent = !retard && (row.jours_avant_echeance ?? 99) <= 7;

                    return (
                      <tr key={row.id}
                        className={clsx(
                          'hover:bg-surface-3 transition-colors',
                          retard && 'bg-red-50/40 dark:bg-red-500/5',
                          urgent && !retard && 'bg-amber-50/30 dark:bg-amber-500/5',
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-medium text-ink-muted">{row.numero}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-ink text-sm">{clientName(row)}</p>
                          <p className="text-xs text-ink-subtle">{row.code_client}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/contrats/${row.contrat_id}`)}
                            className="font-mono text-xs text-brand-dark hover:underline"
                          >
                            {row.contrat_numero}
                          </button>
                          <p className="text-xs text-ink-subtle capitalize">{row.branche}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink-muted whitespace-nowrap">
                          {formatDate(row.periode_debut)}<br />
                          <span className="text-ink-subtle">→</span> {formatDate(row.periode_fin)}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-ink whitespace-nowrap">
                          {formatCurrency(row.montant)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className={clsx('text-xs font-medium', retard ? 'text-red-600 dark:text-red-400' : urgent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-muted')}>
                            {formatDate(row.date_echeance)}
                          </p>
                          {retard && (
                            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{row.jours_retard}j de retard</p>
                          )}
                          {urgent && !retard && (
                            <p className="text-xs text-amber-500 dark:text-amber-400">{row.jours_avant_echeance}j restants</p>
                          )}
                          {row.date_paiement && (
                            <p className="text-xs text-ink-subtle">Payée le {formatDate(row.date_paiement)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                          {row.mode_paiement && (
                            <p className="text-xs text-ink-subtle mt-0.5">
                              {MODE_LABELS[row.mode_paiement] ?? row.mode_paiement}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PdfButton type="quittance" id={row.id} docRef={row.numero} variant="icon" mode="both" />
                            {(row.status === 'en_attente' || row.status === 'en_retard') && (
                              <Button size="sm" onClick={() => setModal(row)}>
                                Encaisser
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-ink-subtle">
              Page {page} sur {totalPages} · {total} quittances
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Page précédente">
                <ChevronLeft size={14} />
              </Button>
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} aria-label="Page suivante">
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {modal && (
        <EncaissementModal
          quittance={modal}
          onClose={() => setModal(null)}
          onSuccess={handleEncaissementSuccess}
        />
      )}
    </div>
  );
}
