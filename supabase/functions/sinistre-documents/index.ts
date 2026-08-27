// ============================================================
// Edge Function : sinistre-documents
// POST /functions/v1/sinistre-documents
//
// Actions supportées (body.action) :
//   "upload_url"  → génère une URL signée pour upload direct
//   "list"        → liste les documents d'un sinistre
//   "delete"      → supprime un document
//   "signed_urls" → génère des URLs de lecture signées
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, jsonError, requireAuth } from '../_shared/helpers.ts';

const BUCKET = 'sinistres-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME  = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'video/mp4', 'video/quicktime',
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const user = await requireAuth(req, supabaseUser);
    const body = await req.json();
    const { action } = body;

    // ── ACTION: upload_url ────────────────────────────────────
    // Génère une URL pré-signée pour upload direct depuis le navigateur
    // body: { sinistre_id, nom_fichier, mime_type, taille_octets, type_doc }
    if (action === 'upload_url') {
      const { sinistre_id, nom_fichier, mime_type, taille_octets, type_doc = 'photo' } = body;

      if (!sinistre_id || !nom_fichier || !mime_type) {
        return jsonError('sinistre_id, nom_fichier, mime_type requis');
      }
      if (!ALLOWED_MIME.includes(mime_type)) {
        return jsonError(`Type de fichier non autorisé: ${mime_type}`);
      }
      if (taille_octets > MAX_FILE_SIZE) {
        return jsonError('Fichier trop volumineux (max 10 MB)');
      }

      // Vérifier que le sinistre existe
      const { data: sinistre } = await supabaseAdmin
        .from('sinistres').select('id, numero').eq('id', sinistre_id).single();
      if (!sinistre) return jsonError('Sinistre introuvable', 404);

      // Chemin unique dans le bucket
      const ext          = nom_fichier.split('.').pop()?.toLowerCase() ?? 'bin';
      const timestamp    = Date.now();
      const storage_path = `${sinistre_id}/${timestamp}_${type_doc}.${ext}`;

      // URL signée valide 5 minutes pour upload
      const { data: signedData, error: signedErr } = await supabaseAdmin
        .storage
        .from(BUCKET)
        .createSignedUploadUrl(storage_path);

      if (signedErr) {
        console.error('Storage error:', signedErr);
        return jsonError(`Erreur storage: ${signedErr.message}`, 500);
      }

      // Pré-enregistrer le document en base (sera complété après upload)
      const { data: doc, error: docErr } = await supabaseAdmin
        .from('sinistre_documents')
        .insert({
          sinistre_id,
          nom_fichier,
          storage_path,
          type_doc,
          taille_octets,
          mime_type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (docErr) return jsonError(`Erreur DB: ${docErr.message}`, 500);

      return json({
        success: true,
        document_id: doc.id,
        storage_path,
        signed_url: signedData.signedUrl,
        token: signedData.token,
      });
    }

    // ── ACTION: confirm_upload ────────────────────────────────
    // Appelé après upload réussi pour générer l'URL de lecture
    // body: { document_id }
    if (action === 'confirm_upload') {
      const { document_id } = body;
      if (!document_id) return jsonError('document_id requis');

      const { data: doc } = await supabaseAdmin
        .from('sinistre_documents').select('*').eq('id', document_id).single();
      if (!doc) return jsonError('Document introuvable', 404);

      // Générer URL signée de lecture (valide 1 heure)
      const { data: readUrl } = await supabaseAdmin
        .storage.from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600);

      // Mettre à jour l'URL publique
      await supabaseAdmin
        .from('sinistre_documents')
        .update({ url_public: readUrl?.signedUrl })
        .eq('id', document_id);

      return json({ success: true, url: readUrl?.signedUrl, document: doc });
    }

    // ── ACTION: list ──────────────────────────────────────────
    // body: { sinistre_id }
    if (action === 'list') {
      const { sinistre_id } = body;
      if (!sinistre_id) return jsonError('sinistre_id requis');

      const { data: docs } = await supabaseAdmin
        .from('sinistre_documents')
        .select('*')
        .eq('sinistre_id', sinistre_id)
        .order('created_at', { ascending: true });

      // Régénérer les URLs signées (elles expirent)
      const withUrls = await Promise.all((docs ?? []).map(async (doc) => {
        const { data } = await supabaseAdmin.storage
          .from(BUCKET).createSignedUrl(doc.storage_path, 3600);
        return { ...doc, url_public: data?.signedUrl };
      }));

      return json({ success: true, documents: withUrls });
    }

    // ── ACTION: delete ────────────────────────────────────────
    // body: { document_id }
    if (action === 'delete') {
      const { document_id } = body;
      if (!document_id) return jsonError('document_id requis');

      const { data: doc } = await supabaseAdmin
        .from('sinistre_documents').select('*').eq('id', document_id).single();
      if (!doc) return jsonError('Document introuvable', 404);

      // Supprimer du storage
      await supabaseAdmin.storage.from(BUCKET).remove([doc.storage_path]);

      // Supprimer de la base
      await supabaseAdmin.from('sinistre_documents').delete().eq('id', document_id);

      return json({ success: true, deleted: document_id });
    }

    return jsonError(`Action inconnue: ${action}`);

  } catch (err: any) {
    console.error('Erreur:', err);
    return jsonError(err.message ?? 'Erreur interne', 500);
  }
});
