import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { getClientById } from '../lib/clients.service';
import type { Client, ClientStatus, ContratStatus } from '../types';
import {
  ClientStatusBadge, ContratStatusBadge,
  Button, Card, Spinner
} from '../components/ui';
import { formatDate, formatCurrency } from '../lib/supabase';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getClientById(id).then(setClient).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" role="status">
        <Spinner className="w-8 h-8 text-brand" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center text-ink-muted">Client introuvable.</div>
    );
  }

  const displayName = client.est_personne_morale
    ? client.raison_sociale
    : `${client.prenom ?? ''} ${client.nom}`.trim();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors self-start"
        >
          <ArrowLeft size={16} aria-hidden /> Retour
        </button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/clients/${id}/modifier`)}>
            <Edit size={14} aria-hidden /> Modifier
          </Button>
          <Button onClick={() => navigate(`/contrats/nouveau?client=${id}`)}>
            <Plus size={14} aria-hidden /> Nouveau contrat
          </Button>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-soft flex items-center justify-center text-2xl font-bold text-brand-dark shrink-0" aria-hidden>
            {client.est_personne_morale ? '🏢' : (displayName?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '??')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-ink font-display">{displayName}</h1>
              <ClientStatusBadge status={client.status as ClientStatus} />
            </div>
            <p className="text-sm text-ink-subtle mt-1">{client.code_client}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-ink-muted">
              {client.telephone && (
                <span className="flex items-center gap-1.5"><Phone size={13} aria-hidden /> {client.telephone}</span>
              )}
              {client.email && (
                <span className="flex items-center gap-1.5"><Mail size={13} aria-hidden /> {client.email}</span>
              )}
              {(client.ville || client.adresse) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden /> {[client.adresse, client.ville, client.pays].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Informations</h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Type',           value: client.est_personne_morale ? 'Personne morale' : 'Personne physique' },
              { label: "Pièce d'identité", value: client.type_piece && client.numero_piece ? `${client.type_piece} · ${client.numero_piece}` : '—' },
              { label: 'Date naissance', value: client.date_naissance ? formatDate(client.date_naissance) : '—' },
              { label: 'Agent',          value: client.agent ? `${client.agent.prenom} ${client.agent.nom}` : '—' },
              { label: 'Courtier',       value: client.courtier ? `${client.courtier.prenom} ${client.courtier.nom}` : '—' },
              { label: 'Client depuis',  value: formatDate(client.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-ink-subtle shrink-0">{label}</dt>
                <dd className="font-medium text-ink text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {client.notes && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-ink-subtle mb-1">Notes</p>
              <p className="text-sm text-ink-muted">{client.notes}</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Contrats ({client.contrats?.length ?? 0})
            </h2>
          </div>

          {!client.contrats?.length ? (
            <Card className="p-8 text-center">
              <FileText size={32} className="text-ink-subtle/40 mx-auto mb-3" aria-hidden />
              <p className="text-sm text-ink-muted">Aucun contrat pour ce client.</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => navigate(`/contrats/nouveau?client=${id}`)}
              >
                <Plus size={13} aria-hidden /> Créer un contrat
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {client.contrats.map(contrat => (
                <Link key={contrat.id} to={`/contrats/${contrat.id}`} className="block">
                  <Card className="p-4 hover:border-brand/30 hover:bg-brand-soft/50 transition-all border border-transparent">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl" aria-hidden>
                          {{ auto: '🚗', sante: '🏥', vie: '❤️', mrh: '🏠', autre: '📋' }[(contrat as any).produit?.branche] ?? '📋'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink text-sm">{(contrat as any).produit?.nom ?? 'Contrat'}</p>
                          <p className="text-xs text-ink-subtle">{contrat.numero}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ContratStatusBadge status={contrat.status as ContratStatus} />
                        <div className="text-right">
                          <p className="text-sm font-semibold text-ink">{formatCurrency(contrat.prime_annuelle)}</p>
                          <p className="text-xs text-ink-subtle">/an</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-ink-subtle">
                      <span>Effet : {formatDate(contrat.date_effet)}</span>
                      <span>Échéance : {formatDate(contrat.date_echeance)}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
