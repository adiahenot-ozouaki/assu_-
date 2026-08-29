import { useState } from 'react';
import { FileDown, Eye, Loader2 } from 'lucide-react';
import { downloadPdf, previewPdf, type PdfType } from '../../lib/pdf.service';
import { clsx } from 'clsx';

interface PdfButtonProps {
  type: PdfType;
  id: string;
  /** Numéro lisible pour le nom de fichier — ne pas nommer « ref » (réservé React) */
  docRef: string;
  label?: string;
  mode?: 'download' | 'preview' | 'both';
  variant?: 'button' | 'icon' | 'menu-item';
  size?: 'sm' | 'md';
  className?: string;
}

export function PdfButton({
  type, id, docRef, label,
  mode = 'both', variant = 'button', size = 'md', className,
}: PdfButtonProps) {
  const [loadingDown, setLoadingDown] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [error, setError]             = useState('');

  const handleDownload = async () => {
    setLoadingDown(true);
    setError('');
    try {
      await downloadPdf(type, id, docRef);
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    } finally {
      setLoadingDown(false);
    }
  };

  const handlePreview = async () => {
    setLoadingPrev(true);
    setError('');
    try {
      await previewPdf(type, id);
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    } finally {
      setLoadingPrev(false);
    }
  };

  const LABELS: Record<PdfType, string> = {
    attestation: label ?? 'Attestation PDF',
    quittance:   label ?? 'Quittance PDF',
    sinistre:    label ?? 'Fiche PDF',
  };

  if (variant === 'menu-item') {
    return (
      <div className={className}>
        {(mode === 'download' || mode === 'both') && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={loadingDown}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-surface-3 rounded-lg transition-colors"
          >
            {loadingDown
              ? <Loader2 size={14} className="animate-spin text-ink-subtle" />
              : <FileDown size={14} className="text-ink-subtle" />
            }
            {LABELS[type]}
          </button>
        )}
        {(mode === 'preview' || mode === 'both') && (
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPrev}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-surface-3 rounded-lg transition-colors"
          >
            {loadingPrev
              ? <Loader2 size={14} className="animate-spin text-ink-subtle" />
              : <Eye size={14} className="text-ink-subtle" />
            }
            Aperçu PDF
          </button>
        )}
        {error && <p className="px-3 py-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={clsx('flex items-center gap-1', className)}>
        {(mode === 'download' || mode === 'both') && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={loadingDown}
            title={`Télécharger ${LABELS[type]}`}
            aria-label={`Télécharger ${LABELS[type]}`}
            className="p-1.5 rounded-lg text-ink-subtle hover:text-brand-dark hover:bg-brand-soft transition-all disabled:opacity-40"
          >
            {loadingDown ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          </button>
        )}
        {(mode === 'preview' || mode === 'both') && (
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPrev}
            title="Aperçu PDF"
            aria-label="Aperçu PDF"
            className="p-1.5 rounded-lg text-ink-subtle hover:text-brand-dark hover:bg-brand-soft transition-all disabled:opacity-40"
          >
            {loadingPrev ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
          </button>
        )}
      </div>
    );
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
  };

  return (
    <div className={clsx('flex items-center gap-2 flex-wrap', className)}>
      {(mode === 'download' || mode === 'both') && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={loadingDown}
          className={clsx(
            'inline-flex items-center rounded-lg font-medium border border-border bg-surface-2',
            'text-ink hover:bg-surface-3 hover:border-brand/40 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size]
          )}
        >
          {loadingDown
            ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin text-ink-subtle" />
            : <FileDown size={size === 'sm' ? 13 : 15} className="text-ink-subtle" />
          }
          {LABELS[type]}
        </button>
      )}

      {(mode === 'preview' || mode === 'both') && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={loadingPrev}
          className={clsx(
            'inline-flex items-center rounded-lg font-medium border border-border bg-surface-2',
            'text-ink hover:bg-surface-3 hover:border-brand/40 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size]
          )}
        >
          {loadingPrev
            ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin text-ink-subtle" />
            : <Eye size={size === 'sm' ? 13 : 15} className="text-ink-subtle" />
          }
          Aperçu
        </button>
      )}

      {error && (
        <span className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">{error}</span>
      )}
    </div>
  );
}
