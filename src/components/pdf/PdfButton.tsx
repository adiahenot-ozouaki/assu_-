import { useState } from 'react';
import { FileDown, Eye, Loader2 } from 'lucide-react';
import { downloadPdf, previewPdf, type PdfType } from '../../lib/pdf.service';
import { clsx } from 'clsx';

interface PdfButtonProps {
  type: PdfType;
  id: string;
  ref: string;          // numéro lisible (contrat.numero, quittance.numero…)
  label?: string;
  mode?: 'download' | 'preview' | 'both';
  variant?: 'button' | 'icon' | 'menu-item';
  size?: 'sm' | 'md';
  className?: string;
}

export function PdfButton({
  type, id, ref: docRef, label,
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

  // ── Mode menu-item (utilisé dans dropdowns) ────────────────
  if (variant === 'menu-item') {
    return (
      <div className={className}>
        {(mode === 'download' || mode === 'both') && (
          <button
            onClick={handleDownload}
            disabled={loadingDown}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {loadingDown
              ? <Loader2 size={14} className="animate-spin text-gray-400" />
              : <FileDown size={14} className="text-gray-400" />
            }
            {LABELS[type]}
          </button>
        )}
        {(mode === 'preview' || mode === 'both') && (
          <button
            onClick={handlePreview}
            disabled={loadingPrev}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {loadingPrev
              ? <Loader2 size={14} className="animate-spin text-gray-400" />
              : <Eye size={14} className="text-gray-400" />
            }
            Aperçu PDF
          </button>
        )}
        {error && <p className="px-3 py-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // ── Mode icône seul ────────────────────────────────────────
  if (variant === 'icon') {
    return (
      <div className={clsx('flex items-center gap-1', className)}>
        {(mode === 'download' || mode === 'both') && (
          <button
            onClick={handleDownload}
            disabled={loadingDown}
            title={`Télécharger ${LABELS[type]}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#00A35E] hover:bg-[#00C875]/10 transition-all disabled:opacity-40"
          >
            {loadingDown ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          </button>
        )}
        {(mode === 'preview' || mode === 'both') && (
          <button
            onClick={handlePreview}
            disabled={loadingPrev}
            title="Aperçu PDF"
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#00A35E] hover:bg-[#00C875]/10 transition-all disabled:opacity-40"
          >
            {loadingPrev ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
          </button>
        )}
      </div>
    );
  }

  // ── Mode bouton standard ───────────────────────────────────
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
  };

  return (
    <div className={clsx('flex items-center gap-2 flex-wrap', className)}>
      {(mode === 'download' || mode === 'both') && (
        <button
          onClick={handleDownload}
          disabled={loadingDown}
          className={clsx(
            'inline-flex items-center rounded-lg font-medium border border-gray-200 bg-white',
            'text-gray-700 hover:bg-gray-50 hover:border-[#00C875]/40 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size]
          )}
        >
          {loadingDown
            ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin text-gray-400" />
            : <FileDown size={size === 'sm' ? 13 : 15} className="text-gray-400" />
          }
          {LABELS[type]}
        </button>
      )}

      {(mode === 'preview' || mode === 'both') && (
        <button
          onClick={handlePreview}
          disabled={loadingPrev}
          className={clsx(
            'inline-flex items-center rounded-lg font-medium border border-gray-200 bg-white',
            'text-gray-700 hover:bg-gray-50 hover:border-[#00C875]/40 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size]
          )}
        >
          {loadingPrev
            ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin text-gray-400" />
            : <Eye size={size === 'sm' ? 13 : 15} className="text-gray-400" />
          }
          Aperçu
        </button>
      )}

      {error && (
        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg">{error}</span>
      )}
    </div>
  );
}
