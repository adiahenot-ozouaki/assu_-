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
      <p className="text-sm text-gray-400 text-center py-6 italic">
        Aucun avenant sur ce contrat.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Ligne verticale */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

      <div className="space-y-4">
        {avenants.map((a, i) => {
          const cfg = AVENANT_CFG[a.type_avenant] ?? AVENANT_CFG.autre;
          const isFirst = i === 0;

          return (
            <div key={a.id} className="flex gap-4 relative">
              {/* Dot */}
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 z-10 border-2',
                isFirst ? 'border-[#00C875] bg-white' : `border-gray-200 ${cfg.bg}`,
              )}>
                {cfg.icon}
              </div>

              {/* Card */}
              <div className={clsx(
                'flex-1 rounded-xl border p-3.5 mb-1',
                isFirst ? 'border-[#00C875]/30 bg-[#00C875]/5' : 'border-gray-100 bg-white'
              )}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">Avenant N°{a.numero}</span>
                      {isFirst && (
                        <span className="text-xs bg-[#00C875]/15 text-[#00A35E] font-semibold px-2 py-0.5 rounded-full">
                          Dernier
                        </span>
                      )}
                    </div>
                    <p className={clsx('font-semibold text-sm mt-0.5', cfg.color)}>{cfg.label}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {formatDate(a.created_at)}
                  </p>
                </div>

                {/* Body */}
                <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Date d'effet :</span>
                    <span className="font-medium">{formatDate(a.date_effet)}</span>
                  </div>

                  {/* Transition statut */}
                  {a.ancien_status && a.nouveau_status && a.ancien_status !== a.nouveau_status && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Statut :</span>
                      <span className="capitalize line-through text-gray-300">
                        {STATUS_LABELS[a.ancien_status] ?? a.ancien_status}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className={clsx(
                        'font-semibold capitalize',
                        a.nouveau_status === 'actif'    ? 'text-emerald-600' :
                        a.nouveau_status === 'suspendu' ? 'text-amber-600'   :
                        a.nouveau_status === 'résilié'  ? 'text-red-600'     : 'text-gray-700'
                      )}>
                        {STATUS_LABELS[a.nouveau_status] ?? a.nouveau_status}
                      </span>
                    </div>
                  )}

                  {/* Delta prime */}
                  {(a.delta_prime || a.nouvelle_prime) && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Prime :</span>
                      {a.nouvelle_prime ? (
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(a.nouvelle_prime)} /an
                        </span>
                      ) : a.delta_prime ? (
                        <span className={clsx(
                          'font-semibold',
                          a.delta_prime > 0 ? 'text-red-500' : 'text-emerald-600'
                        )}>
                          {formatDeltaPrime(a.delta_prime)}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Motif */}
                  {a.motif && (
                    <div className="mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border-l-2 border-gray-200">
                      <span className="text-gray-400">Motif : </span>{a.motif}
                    </div>
                  )}

                  {/* Description */}
                  {a.description && (
                    <p className="text-gray-500 mt-1 italic">{a.description}</p>
                  )}

                  {/* Agent */}
                  {(a.agent_nom || a.agent_prenom) && (
                    <p className="text-gray-400">
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
