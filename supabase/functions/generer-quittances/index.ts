// ============================================================
// Edge Function : generer-quittances
// POST /functions/v1/generer-quittances
// Body: { contrat_id: string }
//
// Permet de (re)générer les quittances d'un contrat depuis
// le front-end ou un script externe.
// Le trigger SQL le fait automatiquement à l'activation,
// mais cette fonction est utile pour :
//  - les contrats existants avant la migration
//  - forcer la régénération après modification des dates/prime
//  - les appels depuis des scripts d'import
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, jsonError, requireAuth } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Init client Supabase (service role pour bypasser RLS) ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Auth ──────────────────────────────────────────────────
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const user = await requireAuth(req, supabaseUser);

    // ── Body ──────────────────────────────────────────────────
    const body = await req.json();
    const { contrat_id } = body;

    if (!contrat_id) {
      return jsonError('contrat_id requis');
    }

    // ── Vérifier que le contrat existe et est actif ───────────
    const { data: contrat, error: errContrat } = await supabaseAdmin
      .from('contrats')
      .select('id, status, numero, prime_annuelle, date_effet, date_echeance')
      .eq('id', contrat_id)
      .single();

    if (errContrat || !contrat) {
      return jsonError('Contrat introuvable', 404);
    }

    if (contrat.status !== 'actif') {
      return jsonError(
        `Le contrat est en statut "${contrat.status}". Activez-le d'abord.`,
        422,
      );
    }

    // ── Appel de la fonction SQL ──────────────────────────────
    const { data: nbQuittances, error: errFn } = await supabaseAdmin
      .rpc('generer_quittances_contrat', { p_contrat_id: contrat_id });

    if (errFn) {
      console.error('RPC error:', errFn);
      return jsonError(`Erreur génération : ${errFn.message}`, 500);
    }

    // ── Récupérer les quittances générées ─────────────────────
    const { data: quittances } = await supabaseAdmin
      .from('quittances')
      .select('*')
      .eq('contrat_id', contrat_id)
      .order('periode_debut', { ascending: true });

    console.log(
      `✅ ${nbQuittances} quittances générées pour contrat ${contrat.numero} par ${user.email}`
    );

    return json({
      success: true,
      message: `${nbQuittances} quittances générées`,
      contrat_id,
      contrat_numero: contrat.numero,
      nb_quittances: nbQuittances,
      quittances,
    });

  } catch (err: any) {
    console.error('Erreur:', err);
    return jsonError(err.message ?? 'Erreur interne', 500);
  }
});
