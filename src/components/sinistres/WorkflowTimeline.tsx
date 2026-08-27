import { clsx } from 'clsx';
import type { SinistreHistorique } from '../../types/sinistres';
import { formatDate } from '../../lib/supabase';

const STATUS_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ouvert:          { label: 'Ouvert',          icon: '📂', color: 'text-blue-700',   bg: 'bg-blue-100'   },
  en_instruction:  { label: 'En instruction',  icon: '🔍', color: 'text-amber-700',  bg: 'bg-amber-100'  },
  'réglé':         { label: 'Réglé',           icon: '✅', color: 'text-emerald-700',bg: 'bg-emerald-100'},
  'rejeté':        { label: 'Rejeté',          icon: '❌', color: 'text-red-700',    bg: 'bg-red-100'    },
  sans_suite:      { label: 'Sans suite',      icon: '⏸️', color: 'text-gray-600',   bg: 'bg-gray-100'   },
};

const TRANSITIONS: Record<string, string[]> = {
  ouvert:         ['en_instruction', 'sans_suite'],
  en_instruction: ['réglé', 'rejeté', 'sans_suite'],
  'réglé':        [],
  'rejeté':       [],
  sans_suite:     [],
};

interface WorkflowTimelineProps {
  status: string;
  historique: SinistreHistorique[];
  onChangeStatus: (newStatus: string, commentaire: string) => Promise<void>;
  loading?: boolean;
}

export function WorkflowTimeline({
  status, historique, onChangeStatus, loading = false
}: WorkflowTimelineProps) {
  const nextStatuses = TRANSITIONS[status] ?? [];

  return (
    <div className="space-y-5">
      {/* Current status badge */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          {nextStatuses.length === 0 && (
            <span className="text-xs text-gray-400 italic">Dossier clôturé</span>
          )}
        </div>
      </div>

      {/* Transition buttons */}
      {nextStatuses.length > 0 && (
        <TransitionPanel
          nextStatuses={nextStatuses}
          onChangeStatus={onChangeStatus}
          loading={loading}
        />
      )}

      {/* Timeline */}
      {historique.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Historique du dossier
          </p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
            <div className="space-y-4">
              {historique.map((h, i) => {
                const cfg = STATUS_CFG[h.nouveau_status] ?? STATUS_CFG.ouvert;
                const isFirst = i === historique.length - 1;
                return (
                  <div key={h.id} className="flex gap-3 relative">
                    {/* Dot */}
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10',
                      cfg.bg
                    )}>
                      {cfg.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx('text-sm font-semibold', cfg.color)}>
                          {cfg.label}
                        </span>
                        {h.ancien_status && (
                          <span className="text-xs text-gray-400">
                            ← {STATUS_CFG[h.ancien_status]?.label ?? h.ancien_status}
                          </span>
                        )}
                      </div>
                      {h.commentaire && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-gray-200">
                          "{h.commentaire}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{formatDate(h.created_at)}</span>
                        {h.auteur && (
                          <>
                            <span>·</span>
                            <span>{h.auteur.prenom} {h.auteur.nom}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────
export function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, icon: '📋', color: 'text-gray-600', bg: 'bg-gray-100' };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold', cfg.bg, cfg.color)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Transition panel with comment ─────────────────────────────
import { useState } from 'react';

function TransitionPanel({ nextStatuses, onChangeStatus, loading }: {
  nextStatuses: string[];
  onChangeStatus: (s: string, c: string) => Promise<void>;
  loading: boolean;
}) {
  const [selected, setSelected]     = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting]  = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onChangeStatus(selected, commentaire);
      setSelected(null);
      setCommentaire('');
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = (s: string) => STATUS_CFG[s] ?? { label: s, icon: '📋', color: '', bg: 'bg-gray-100' };

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Faire avancer le dossier
      </p>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map(s => {
          const c = cfg(s);
          const isSelected = selected === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSelected(isSelected ? null : s)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                isSelected
                  ? `${c.bg} ${c.color} border-current`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-2 animate-in fade-in">
          <textarea
            rows={2}
            placeholder="Commentaire (optionnel)…"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(null)}
              className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || loading}
              className="flex-1 py-2 text-sm font-semibold text-white bg-[#0A1628] rounded-lg hover:bg-[#132240] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirmer → {STATUS_CFG[selected]?.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
