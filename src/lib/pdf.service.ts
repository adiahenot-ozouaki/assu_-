import { supabase } from './supabase';

export type PdfType = 'attestation' | 'quittance' | 'sinistre';

const FILENAMES: Record<PdfType, (ref: string) => string> = {
  attestation: ref => `attestation_${ref}.pdf`,
  quittance:   ref => `quittance_${ref}.pdf`,
  sinistre:    ref => `sinistre_${ref}.pdf`,
};

// ── Télécharge un PDF depuis l'Edge Function ─────────────────
export async function downloadPdf(
  type: PdfType,
  id: string,
  ref: string           // numéro lisible pour le nom du fichier
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generer-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, id }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Erreur génération PDF');
  }

  // Déclencher le téléchargement navigateur
  const blob     = await res.blob();
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement('a');
  anchor.href    = url;
  anchor.download = FILENAMES[type](ref);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ── Ouvrir le PDF dans un nouvel onglet ──────────────────────
export async function previewPdf(type: PdfType, id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generer-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, id }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Erreur génération PDF');
  }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Nettoyage différé
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
