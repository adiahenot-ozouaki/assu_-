import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSinistres, getSinistreStats } from '../lib/sinistres.service';
import type { SinistreComplet } from '../types/sinistres';
import { formatCurrency, formatDate } from '../lib/supabase';
import { Button, Card, EmptyState, Spinner, StatCard } from '../components/ui';
import { StatusChip } from '../components/sinistres/WorkflowTimeline';
import { clsx } from 'clsx';

const STATUS_OPTIONS = [
  { value: '',               label: 'Tous les statuts'  },
  { value: 'ouvert',         label: '🔵 Ouvert'         },
  { value: 'en_instruction', label: '🟡 En instruction' },
  { value: 'réglé',          label: '🟢 Réglé'          },
  { value: 'rejeté',         label: '🔴 Rejeté'         },
  { value: 'sans_suite',     label: '⚪ Sans suite'      },
];

const BRANCHE_OPTIONS = [
  { value: '', label: 'Toutes branches' },
  { value: 'auto',  label: '🚗 Auto'       },
  { value: 'mrh',   label: '🏠 Habitation' },
  { value: 'sante', label: '🏥 Santé'      },
  { value: 'vie',   label: '❤️ Vie'        },
];

const BRANCH_ICONS: Record<string, string> = {
  auto: '🚗', mrh: '🏠', sante: '🏥', vie: '❤️', autre: '📋',
};

const PAGE_SIZE = 20;

export default function SinistresPage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<SinistreComplet[]>([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [branche, setBranche] = useState('');
  const [page, setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        getSinistres({ search, status: status || undefined, branche: branche || undefined, page, pageSize: PAGE_SIZE }),
        getSinistreStats(),
      ]);
      setRows(list.data);
      setTotal(list.count);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [search, status, branche, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, branche]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clientName = (row: SinistreComplet) =>
    row.est_personne_morale ? row.raison_sociale : `${row.client_prenom ?? ''} ${row.client_nom}`.trim();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">Sinistres</h1>
          <p className="text-sm text-ink-muted mt-0.5">{total} dossier{total > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/sinistres/nouveau')} className="self-start sm:self-auto">
          <Plus size={16} aria-hidden /> Déclarer un sinistre
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total dossiers" value={stats.total} icon="📋" color="blue" />
          <StatCard label="Ouverts" value={stats.ouverts} icon="📂" trend={`${stats.en_instruction} en instruction`} color="amber" />
          <StatCard label="Réglés" value={stats.regles} icon="✅" color="green" />
          <StatCard label="Montant indemnisé" value={formatCurrency(stats.montant_indemnise_total)} icon="💰" color="purple" />
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <label htmlFor="sinistres-search" className="sr-only">Rechercher un sinistre</label>
            <input
              id="sinistres-search"
              name="search"
              type="search"
              placeholder="N° sinistre, nature, client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <label htmlFor="sinistres-status" className="sr-only">Filtrer par statut</label>
          <select id="sinistres-status" name="status" value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label htmlFor="sinistres-branche" className="sr-only">Filtrer par branche</label>
          <select id="sinistres-branche" name="branche" value={branche} onChange={e => setBranche(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand">
            {BRANCHE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            icon="🚨"
            title="Aucun sinistre trouvé"
            description="Déclarez le premier sinistre sur un contrat actif."
            action={<Button onClick={() => navigate('/sinistres/nouveau')}><Plus size={15} aria-hidden /> Déclarer</Button>}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {rows.map(row => {
                const urgent = row.status === 'ouvert' && row.jours_depuis_declaration > 7;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/sinistres/${row.id}`)}
                    className={clsx(
                      'w-full text-left p-4 hover:bg-surface-3 transition-colors',
                      urgent && 'bg-amber-50/40 dark:bg-amber-500/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-ink-muted">{row.numero}</p>
                        <p className="font-medium text-ink truncate">{clientName(row)}</p>
                        <p className="text-sm text-ink-muted mt-1">
                          <span aria-hidden>{BRANCH_ICONS[row.branche] ?? '📋'}</span> {row.nature}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <StatusChip status={row.status} />
                        {urgent && <p className="text-xs text-amber-500 dark:text-amber-400">⚠ À traiter</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-ink-subtle">
                      <span>{formatDate(row.date_sinistre)} · {row.jours_depuis_declaration}j</span>
                      <span className={row.montant_indemnise ? 'text-brand-dark font-semibold' : ''}>
                        {row.montant_indemnise ? formatCurrency(row.montant_indemnise) : (row.montant_declare ? formatCurrency(row.montant_declare) : '—')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-3/50">
                    {['N° Sinistre', 'Client', 'Nature', 'Date', 'Déclaré', 'Indemnisé', 'Docs', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(row => {
                    const urgent = row.status === 'ouvert' && row.jours_depuis_declaration > 7;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/sinistres/${row.id}`)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/sinistres/${row.id}`); } }}
                        tabIndex={0}
                        role="link"
                        className={clsx(
                          'hover:bg-surface-3 cursor-pointer transition-colors',
                          urgent && 'bg-amber-50/40 dark:bg-amber-500/5',
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
                          <div className="flex items-center gap-2">
                            <span aria-hidden>{BRANCH_ICONS[row.branche] ?? '📋'}</span>
                            <div>
                              <p className="font-medium text-ink">{row.nature}</p>
                              <p className="text-xs text-ink-subtle capitalize">{row.branche}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink-muted whitespace-nowrap">
                          <p>{formatDate(row.date_sinistre)}</p>
                          <p className="text-ink-subtle">{row.jours_depuis_declaration}j</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-ink whitespace-nowrap">
                          {row.montant_declare ? formatCurrency(row.montant_declare) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap">
                          <span className={row.montant_indemnise ? 'text-brand-dark' : 'text-ink-subtle'}>
                            {row.montant_indemnise ? formatCurrency(row.montant_indemnise) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {row.nb_documents > 0
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 text-xs font-bold">{row.nb_documents}</span>
                            : <span className="text-ink-subtle">—</span>
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusChip status={row.status} />
                          {urgent && <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">⚠ À traiter</p>}
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
            <p className="text-xs text-ink-subtle">Page {page} sur {totalPages} · {total} dossiers</p>
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
    </div>
  );
}
