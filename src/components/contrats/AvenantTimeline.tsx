import { AVENANT_CFG, formatDeltaPrime, type Avenant } from '../../lib/avenants.service';
import { formatDate, formatCurrency } from '../../lib/supabase';
import { clsx } from 'clsx';

interface AvenantTimelineProps {
  avenants: Avenant[];
}

const STATUS_LABELS: Record<string, string> = {
  actif:     'Actif',
  suspendu:  'Suspendu',
  'résilié': 'Résilié',
  brouillon: 'Brouillon',
  'expiré':  'Expiré',
};

export function AvenantTimeline({ avenants }: AvenantTimelineProps) {
  if (avenants.length === 0) {
    return (
      <p className="text-sm text-ink-subtle text-center py-6 italic">
        Aucun avenant sur ce contrat.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-3" aria-hidden />

      <div className="space-y-4">
        {avenants.map((a, i) => {
          const cfg = AVENANT_CFG[a.type_avenant] ?? AVENANT_CFG.autre;
          const isFirst = i === 0;

          return (
            <div key={a.id} className="flex gap-4 relative">
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 z-10 border-2',
                isFirst ? 'border-brand bg-surface-2' : `border-border ${cfg.bg}`,
              )}>
                {cfg.icon}
              </div>

              <div className={clsx(
                'flex-1 rounded-xl border p-3.5 mb-1',
                isFirst ? 'border-brand/30 bg-brand-soft' : 'border-border bg-surface-2'
              )}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-subtle">Avenant N°{a.numero}</span>
                      {isFirst && (
                        <span className="text-xs bg-brand-soft text-brand-dark font-semibold px-2 py-0.5 rounded-full">
                          Dernier
                        </span>
                      )}
                    </div>
                    <p className={clsx('font-semibold text-sm mt-0.5', cfg.color)}>{cfg.label}</p>
                  </div>
                  <p className="text-xs text-ink-subtle shrink-0">
                    {formatDate(a.created_at)}
                  </p>
                </div>

                <div className="mt-2 space-y-1.5 text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-subtle">Date d'effet :</span>
                    <span className="font-medium text-ink">{formatDate(a.date_effet)}</span>
                  </div>

                  {a.ancien_status && a.nouveau_status && a.ancien_status !== a.nouveau_status && (
                    <div className="flex items-center gap-2">
                      <span className="text-ink-subtle">Statut :</span>
                      <span className="capitalize line-through text-ink-subtle">
                        {STATUS_LABELS[a.ancien_status] ?? a.ancien_status}
                      </span>
                      <span className="text-ink-subtle">→</span>
                      <span className={clsx(
                        'font-semibold capitalize',
                        a.nouveau_status === 'actif'    ? 'text-emerald-600 dark:text-emerald-400' :
                        a.nouveau_status === 'suspendu' ? 'text-amber-600 dark:text-amber-400'   :
                        a.nouveau_status === 'résilié'  ? 'text-red-600 dark:text-red-400'     : 'text-ink'
                      )}>
                        {STATUS_LABELS[a.nouveau_status] ?? a.nouveau_status}
                      </span>
                    </div>
                  )}

                  {(a.delta_prime || a.nouvelle_prime) && (
                    <div className="flex items-center gap-2">
                      <span className="text-ink-subtle">Prime :</span>
                      {a.nouvelle_prime ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(a.nouvelle_prime)} /an
                        </span>
                      ) : a.delta_prime ? (
                        <span className={clsx(
                          'font-semibold',
                          a.delta_prime > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                        )}>
                          {formatDeltaPrime(a.delta_prime)}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {a.motif && (
                    <div className="mt-1.5 bg-surface-3 rounded-lg px-2.5 py-1.5 border-l-2 border-border">
                      <span className="text-ink-subtle">Motif : </span>{a.motif}
                    </div>
                  )}

                  {a.description && (
                    <p className="text-ink-muted mt-1 italic">{a.description}</p>
                  )}

                  {(a.agent_nom || a.agent_prenom) && (
                    <p className="text-ink-subtle">
                      Par : {a.agent_prenom} {a.agent_nom}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
