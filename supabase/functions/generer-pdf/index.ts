// ============================================================
// Edge Function : generer-pdf
// POST /functions/v1/generer-pdf
// Body: {
//   type: 'attestation' | 'quittance' | 'sinistre',
//   id: string   // contrat_id | quittance_id | sinistre_id
// }
// Retourne : application/pdf (binaire)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonError, requireAuth } from '../_shared/helpers.ts';
import { buildAttestation } from './attestation.ts';
import { buildQuittance }   from './quittance.ts';
import { buildFicheSinistre } from './ficheSinistre.ts';

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

    await requireAuth(req, supabaseUser);

    const { type, id } = await req.json();

    if (!type || !id) return jsonError('type et id requis');

    let pdfBytes: Uint8Array;
    let filename: string;

    // ── ATTESTATION ──────────────────────────────────────────
    if (type === 'attestation') {
      const { data: contrat, error } = await supabaseAdmin
        .from('contrats')
        .select(`*, client:clients(*), produit:produits(*)`)
        .eq('id', id)
        .single();
      if (error || !contrat) return jsonError('Contrat introuvable', 404);

      pdfBytes = await buildAttestation({
        contrat,
        client:      contrat.client,
        produit:     contrat.produit,
        garanties:   (contrat.garanties as Record<string, boolean>) ?? {},
        objet_assure:(contrat.objet_assure as Record<string, any>) ?? {},
      });
      filename = `attestation_${contrat.numero}.pdf`;
    }

    // ── QUITTANCE ────────────────────────────────────────────
    else if (type === 'quittance') {
      const { data: quittance, error } = await supabaseAdmin
        .from('quittances')
        .select(`*, contrat:contrats(*, client:clients(*), produit:produits(*))`)
        .eq('id', id)
        .single();
      if (error || !quittance) return jsonError('Quittance introuvable', 404);

      pdfBytes = await buildQuittance({
        quittance,
        contrat: quittance.contrat,
        client:  quittance.contrat.client,
        produit: quittance.contrat.produit,
      });
      filename = `quittance_${quittance.numero}.pdf`;
    }

    // ── FICHE SINISTRE ────────────────────────────────────────
    else if (type === 'sinistre') {
      const [{ data: sinistre, error }, { data: hist }, { count }] = await Promise.all([
        supabaseAdmin
          .from('sinistres')
          .select(`*, contrat:contrats(*, produit:produits(*)), client:clients(*)`)
          .eq('id', id)
          .single(),
        supabaseAdmin
          .from('sinistre_historique')
          .select('*, auteur:profiles!auteur_id(nom, prenom)')
          .eq('sinistre_id', id)
          .order('created_at'),
        supabaseAdmin
          .from('sinistre_documents')
          .select('id', { count: 'exact', head: true })
          .eq('sinistre_id', id),
      ]);
      if (error || !sinistre) return jsonError('Sinistre introuvable', 404);

      // Reconstruct client from contrat join if needed
      const client = sinistre.client ?? sinistre.contrat?.client;

      pdfBytes = await buildFicheSinistre({
        sinistre,
        contrat:      sinistre.contrat,
        client,
        produit:      sinistre.contrat.produit,
        historique:   hist ?? [],
        nb_documents: count ?? 0,
      });
      filename = `sinistre_${sinistre.numero}.pdf`;
    }

    else {
      return jsonError(`Type inconnu : ${type}. Valeurs : attestation, quittance, sinistre`);
    }

    // ── Retourner le PDF ─────────────────────────────────────
    return new Response(pdfBytes!, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename!}"`,
        'Content-Length':      pdfBytes!.length.toString(),
        'Cache-Control':       'no-store',
      },
    });

  } catch (err: any) {
    console.error('Erreur PDF:', err);
    return jsonError(err.message ?? 'Erreur interne', 500);
  }
});
