import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} client{total > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={() => navigate('/clients/nouveau')}>
          <Plus size={16} /> Nouveau client
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <label htmlFor="clients-search" className="sr-only">Rechercher un client</label>
            <input
              id="clients-search"
              name="search"
              type="text"
              placeholder="Nom, code client, email, téléphone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent"
            />
          </div>
          <label htmlFor="clients-status" className="sr-only">Filtrer par statut</label>
          <select
            id="clients-status"
            name="status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C875] bg-white"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6 text-[#00C875]" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Aucun client trouvé"
            description={search || status ? 'Essayez de modifier vos filtres.' : 'Commencez par créer votre premier client.'}
            action={
              !search && !status
                ? <Button onClick={() => navigate('/clients/nouveau')}><Plus size={15}/> Créer un client</Button>
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé le</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00C875]/15 flex items-center justify-center text-xs font-bold text-[#00A35E] shrink-0">
                          {client.est_personne_morale
                            ? (client.raison_sociale?.[0] ?? '?')
                            : `${client.prenom?.[0] ?? ''}${client.nom[0]}`}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.est_personne_morale
                              ? client.raison_sociale
                              : `${client.prenom ?? ''} ${client.nom}`.trim()}
                          </p>
                          <p className="text-xs text-gray-400">{client.code_client}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {client.telephone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={11} /> {client.telephone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail size={11} /> {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <ClientStatusBadge status={client.status as ClientStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {client.agent ? `${client.agent.prenom} ${client.agent.nom}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs text-[#00C875] font-medium">Voir →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} sur {totalPages} · {total} résultats
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
