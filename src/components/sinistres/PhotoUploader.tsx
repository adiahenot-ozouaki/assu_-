import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, FileText, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument, supprimerDocument } from '../../lib/sinistres.service';
import type { SinistreDocument } from '../../types/sinistres';
import { clsx } from 'clsx';

const TYPE_DOC_OPTIONS: { value: SinistreDocument['type_doc']; label: string; icon: string }[] = [
  { value: 'photo',          label: 'Photo',           icon: '📷' },
  { value: 'constat',        label: 'Constat amiable', icon: '📋' },
  { value: 'facture',        label: 'Facture',         icon: '🧾' },
  { value: 'rapport_expert', label: 'Rapport expert',  icon: '📊' },
  { value: 'autre',          label: 'Autre',           icon: '📄' },
];

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf,video/mp4,video/quicktime';
const MAX_SIZE_MB = 10;

interface FileItem {
  id: string;
  file: File;
  type_doc: SinistreDocument['type_doc'];
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  document?: SinistreDocument;
  preview?: string;
}

interface PhotoUploaderProps {
  sinistre_id: string;
  existingDocs?: SinistreDocument[];
  onDocumentAdded?: (doc: SinistreDocument) => void;
  onDocumentRemoved?: (doc_id: string) => void;
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <FileImage size={20} className="text-blue-500" />;
  if (file.type === 'application/pdf') return <FileText size={20} className="text-red-500" />;
  if (file.type.startsWith('video/')) return <Film size={20} className="text-purple-500" />;
  return <FileText size={20} className="text-ink-subtle" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function PhotoUploader({ sinistre_id, existingDocs = [], onDocumentAdded, onDocumentRemoved }: PhotoUploaderProps) {
  const [items, setItems]       = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: FileItem[] = arr
      .filter(f => {
        if (f.size > MAX_SIZE_MB * 1024 * 1024) return false;
        return true;
      })
      .map(f => {
        const item: FileItem = {
          id:       Math.random().toString(36).slice(2),
          file:     f,
          type_doc: f.type.startsWith('image/') ? 'photo' : 'autre',
          status:   'pending',
          progress: 0,
        };
        if (f.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = e => {
            setItems(prev => prev.map(i => i.id === item.id
              ? { ...i, preview: e.target?.result as string } : i));
          };
          reader.readAsDataURL(f);
        }
        return item;
      });
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const setItemType = (id: string, type_doc: SinistreDocument['type_doc']) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, type_doc } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const uploadItem = async (item: FileItem) => {
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status: 'uploading', progress: 10 } : i));
    try {
      const progressInterval = setInterval(() => {
        setItems(prev => prev.map(i =>
          i.id === item.id && i.status === 'uploading'
            ? { ...i, progress: Math.min(i.progress + 20, 85) } : i
        ));
      }, 400);

      const doc = await uploadDocument(sinistre_id, item.file, item.type_doc);
      clearInterval(progressInterval);

      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: 'done', progress: 100, document: doc } : i));

      onDocumentAdded?.(doc);
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: 'error', error: err.message } : i));
    }
  };

  const uploadAll = async () => {
    const pending = items.filter(i => i.status === 'pending');
    for (const item of pending) {
      await uploadItem(item);
    }
  };

  const handleDeleteExisting = async (doc: SinistreDocument) => {
    setDeleting(doc.id);
    try {
      await supprimerDocument(doc.id);
      onDocumentRemoved?.(doc.id);
    } catch (err) {
      console.error('Erreur suppression:', err);
    } finally {
      setDeleting(null);
    }
  };

  const hasPending = items.some(i => i.status === 'pending');

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        aria-label="Zone de dépôt de fichiers"
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragging
            ? 'border-brand bg-brand-soft scale-[1.01]'
            : 'border-border hover:border-brand/50 hover:bg-surface-3'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            'w-14 h-14 rounded-full flex items-center justify-center transition-all',
            dragging ? 'bg-brand-soft' : 'bg-surface-3'
          )}>
            <Upload size={24} className={dragging ? 'text-brand' : 'text-ink-subtle'} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              {dragging ? 'Déposer les fichiers ici' : 'Glissez vos fichiers ou cliquez pour sélectionner'}
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              Photos, PDF, vidéos · Max {MAX_SIZE_MB} Mo par fichier
            </p>
          </div>
        </div>
      </div>

      {existingDocs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
            Documents enregistrés ({existingDocs.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingDocs.map(doc => (
              <ExistingDocCard
                key={doc.id}
                doc={doc}
                deleting={deleting === doc.id}
                onDelete={() => handleDeleteExisting(doc)}
              />
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              Nouveaux fichiers ({items.length})
            </p>
            {hasPending && (
              <button
                type="button"
                onClick={uploadAll}
                className="text-xs font-semibold text-brand-dark bg-brand-soft hover:opacity-90 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload size={12} aria-hidden /> Tout uploader
              </button>
            )}
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <FileItemRow
                key={item.id}
                item={item}
                onTypeChange={type => setItemType(item.id, type)}
                onRemove={() => removeItem(item.id)}
                onUpload={() => uploadItem(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExistingDocCard({ doc, deleting, onDelete }: {
  doc: SinistreDocument;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isImage = doc.mime_type?.startsWith('image/');
  const typeCfg = TYPE_DOC_OPTIONS.find(t => t.value === doc.type_doc) ?? TYPE_DOC_OPTIONS[0];

  return (
    <div className="relative group rounded-xl border border-border overflow-hidden bg-surface-3">
      {isImage && doc.url_public ? (
        <a href={doc.url_public} target="_blank" rel="noopener noreferrer">
          <img
            src={doc.url_public}
            alt={doc.nom_fichier}
            className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      ) : (
        <a href={doc.url_public ?? '#'} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center h-24 text-3xl hover:bg-surface-2 transition-colors">
          {typeCfg.icon}
        </a>
      )}
      <div className="p-2">
        <p className="text-xs font-medium text-ink truncate">{doc.nom_fichier}</p>
        <p className="text-xs text-ink-subtle">{typeCfg.icon} {typeCfg.label}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Supprimer ${doc.nom_fichier}`}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center"
      >
        {deleting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      </button>
    </div>
  );
}

function FileItemRow({ item, onTypeChange, onRemove, onUpload }: {
  item: FileItem;
  onTypeChange: (t: SinistreDocument['type_doc']) => void;
  onRemove: () => void;
  onUpload: () => void;
}) {
  const statusIcons = {
    pending:   null,
    uploading: <Loader2 size={16} className="animate-spin text-brand" />,
    done:      <CheckCircle2 size={16} className="text-brand" />,
    error:     <AlertCircle  size={16} className="text-red-500" />,
  };

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      item.status === 'done'  && 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
      item.status === 'error' && 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30',
      (item.status === 'pending' || item.status === 'uploading') && 'bg-surface-2 border-border',
    )}>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-3 shrink-0 flex items-center justify-center">
        {item.preview
          ? <img src={item.preview} alt="" className="w-full h-full object-cover" />
          : getFileIcon(item.file)
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-ink-subtle">{formatSize(item.file.size)}</span>
          {item.status === 'pending' && (
            <select
              value={item.type_doc}
              onChange={e => onTypeChange(e.target.value as SinistreDocument['type_doc'])}
              onClick={e => e.stopPropagation()}
              aria-label="Type de document"
              className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface-2 text-ink focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {TYPE_DOC_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          )}
          {item.status === 'error' && (
            <span className="text-xs text-red-500">{item.error}</span>
          )}
        </div>
        {item.status === 'uploading' && (
          <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {statusIcons[item.status]}
        {item.status === 'pending' && (
          <button
            type="button"
            onClick={onUpload}
            className="text-xs font-semibold text-brand-dark bg-brand-soft hover:opacity-90 px-2.5 py-1 rounded-lg transition-colors"
          >
            Uploader
          </button>
        )}
        {item.status !== 'uploading' && item.status !== 'done' && (
          <button type="button" onClick={onRemove} aria-label="Retirer"
            className="text-ink-subtle hover:text-ink-muted transition-colors">
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
