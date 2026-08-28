import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getContrats } from '../lib/contrats.service';
import type { Contrat, ContratStatus, BranchType } from '../types';
import {
  ContratStatusBadge, BranchBadge,
  Button, Card, EmptyState, Spinner
} from '../components/ui';
import { formatDate, formatCurrency } from '../lib/supabase';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'actif',     label: 'Actif'     },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'suspendu',  label: 'Suspendu'  },
  { value: 'expiré',    label: 'Expiré'    },
  { value: 'résilié',   label: 'Résilié'   },
];

const BRANCHE_OPTIONS = [
  { value: '', label: 'Toutes les branches' },
  { value: 'auto',  label: '🚗 Auto'       },
  { value: 'sante', label: '🏥 Santé'      },
  { value: 'vie',   label: '❤️ Vie'        },
  { value: 'mrh',   label: '🏠 Habitation' },
];

export default function ContratsPage() {
  const navigate = useNavigate();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branche, setBranche] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getContrats({
        search, status: status || undefined,
        branche: branche || undefined, page, pageSize: PAGE_SIZE,
      });
      setContrats(result.data);
      setTotal(result.count);
    } finally {
      setLoading(false);
    }
  }, [search, status, branche, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, branche]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clientLabel = (c: Contrat) =>
    c.client
      ? (c.client.est_personne_morale ? c.client.raison_sociale : `${c.client.prenom ?? ''} ${c.client.nom}`.trim())
      : '—';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">Contrats</h1>
          <p className="text-sm text-ink-muted mt-0.5">{total} contrat{total > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/contrats/nouveau')} className="self-start sm:self-auto">
          <Plus size={16} aria-hidden /> Nouveau contrat
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <label htmlFor="contrats-search" className="sr-only">Rechercher un contrat</label>
            <input
              id="contrats-search"
              name="search"
              type="search"
              placeholder="N° contrat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <label htmlFor="contrats-status" className="sr-only">Filtrer par statut</label>
          <select id="contrats-status" name="status" value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label htmlFor="contrats-branche" className="sr-only">Filtrer par branche</label>
          <select id="contrats-branche" name="branche" value={branche} onChange={e => setBranche(e.target.value)}
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
        ) : contrats.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Aucun contrat trouvé"
            description="Ajustez vos filtres ou émettez un nouveau contrat."
            action={<Button onClick={() => navigate('/contrats/nouveau')}><Plus size={15} aria-hidden /> Nouveau contrat</Button>}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {contrats.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/contrats/${c.id}`)}
                  className="w-full text-left p-4 hover:bg-surface-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-ink-muted">{c.numero}</p>
                      <p className="font-medium text-ink mt-0.5 truncate">{clientLabel(c)}</p>
                      <p className="text-sm text-ink-muted mt-1">{c.produit?.nom ?? '—'}</p>
                      {c.produit && (
                        <div className="mt-1.5">
                          <BranchBadge branche={c.produit.branche as BranchType} />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <ContratStatusBadge status={c.status as ContratStatus} />
                      <p className="text-sm font-semibold text-ink">{formatCurrency(c.prime_annuelle)}</p>
                      <p className="text-xs text-ink-subtle">{formatDate(c.date_echeance)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-3/50">
                    {['N° Contrat', 'Client', 'Produit', 'Prime annuelle', 'Échéance', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contrats.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/contrats/${c.id}`)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/contrats/${c.id}`); } }}
                      tabIndex={0}
                      role="link"
                      className="hover:bg-surface-3 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-medium text-ink">{c.numero}</span>
                      </td>
                      <td className="px-4 py-3.5 text-ink">{clientLabel(c)}</td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <p className="text-ink font-medium">{c.produit?.nom ?? '—'}</p>
                          {c.produit && <BranchBadge branche={c.produit.branche as BranchType} />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-ink">
                        {formatCurrency(c.prime_annuelle)}
                      </td>
                      <td className="px-4 py-3.5 text-ink-muted text-xs">
                        {formatDate(c.date_echeance)}
                      </td>
                      <td className="px-4 py-3.5">
                        <ContratStatusBadge status={c.status as ContratStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-ink-subtle">Page {page} sur {totalPages} · {total} résultats</p>
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
