import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { getClients } from '../lib/clients.service';
import type { Client, ClientStatus } from '../types';
import { ClientStatusBadge, Button, Card, EmptyState, Spinner } from '../components/ui';
import { formatDate } from '../lib/supabase';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'actif',    label: 'Actif'    },
  { value: 'prospect', label: 'Prospect' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'resilié',  label: 'Résilié'  },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClients({ search, status: status || undefined, page, pageSize: PAGE_SIZE });
      setClients(result.data);
      setTotal(result.count);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clientName = (client: Client) =>
    client.est_personne_morale
      ? (client.raison_sociale ?? '—')
      : `${client.prenom ?? ''} ${client.nom}`.trim();

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">Clients</h1>
          <p className="text-sm text-ink-muted mt-0.5">{total} client{total > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={() => navigate('/clients/nouveau')} className="self-start sm:self-auto">
          <Plus size={16} aria-hidden /> Nouveau client
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <label htmlFor="clients-search" className="sr-only">Rechercher un client</label>
            <input
              id="clients-search"
              name="search"
              type="search"
              placeholder="Nom, code client, email, téléphone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <label htmlFor="clients-status" className="sr-only">Filtrer par statut</label>
          <select
            id="clients-status"
            name="status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </Card>

      {/* Table desktop / cards mobile */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16" role="status">
            <Spinner className="w-6 h-6 text-brand" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Aucun client trouvé"
            description={search || status ? 'Essayez de modifier vos filtres.' : 'Commencez par créer votre premier client.'}
            action={
              !search && !status
                ? <Button onClick={() => navigate('/clients/nouveau')}><Plus size={15} aria-hidden /> Créer un client</Button>
                : undefined
            }
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="w-full text-left p-4 hover:bg-surface-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand-dark shrink-0" aria-hidden>
                      {client.est_personne_morale
                        ? (client.raison_sociale?.[0] ?? '?')
                        : `${client.prenom?.[0] ?? ''}${client.nom[0]}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-ink truncate">{clientName(client)}</p>
                        <ClientStatusBadge status={client.status as ClientStatus} />
                      </div>
                      <p className="text-xs text-ink-subtle mt-0.5">{client.code_client}</p>
                      <div className="mt-2 space-y-0.5">
                        {client.telephone && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Phone size={11} aria-hidden /> {client.telephone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
                            <Mail size={11} aria-hidden /> {client.email}
                          </div>
                        )}
                      </div>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Créé le</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map(client => (
                    <tr
                      key={client.id}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/clients/${client.id}`); } }}
                      tabIndex={0}
                      role="link"
                      className="hover:bg-surface-3 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand-dark shrink-0" aria-hidden>
                            {client.est_personne_morale
                              ? (client.raison_sociale?.[0] ?? '?')
                              : `${client.prenom?.[0] ?? ''}${client.nom[0]}`}
                          </div>
                          <div>
                            <p className="font-medium text-ink">{clientName(client)}</p>
                            <p className="text-xs text-ink-subtle">{client.code_client}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {client.telephone && (
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                              <Phone size={11} aria-hidden /> {client.telephone}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                              <Mail size={11} aria-hidden /> {client.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ClientStatusBadge status={client.status as ClientStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ink-muted">
                        {client.agent ? `${client.agent.prenom} ${client.agent.nom}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ink-subtle">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs text-brand font-medium">Voir →</span>
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
            <p className="text-xs text-ink-subtle">
              Page {page} sur {totalPages} · {total} résultats
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
    </div>
  );
}
