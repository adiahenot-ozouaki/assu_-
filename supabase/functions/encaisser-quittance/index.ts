// ============================================================
// Edge Function : encaisser-quittance
// POST /functions/v1/encaisser-quittance
// Body: {
//   quittance_id: string,
//   mode_paiement: 'mobile_money' | 'virement' | 'especes' | 'cheque' | 'carte',
//   reference?: string,
//   date_paiement?: string  // ISO date, défaut aujourd'hui
// }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, jsonError, requireAuth } from '../_shared/helpers.ts';

const MODES_VALIDES = ['mobile_money', 'virement', 'especes', 'cheque', 'carte'];

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

    // ── Body ──────────────────────────────────────────────────
    const body = await req.json();
    const { quittance_id, mode_paiement, reference, date_paiement } = body;

    if (!quittance_id)   return jsonError('quittance_id requis');
    if (!mode_paiement)  return jsonError('mode_paiement requis');
    if (!MODES_VALIDES.includes(mode_paiement)) {
      return jsonError(`mode_paiement invalide. Valeurs : ${MODES_VALIDES.join(', ')}`);
    }

    // ── Charger la quittance + contrat + client ───────────────
    const { data: quittance, error: errQ } = await supabaseAdmin
      .from('quittances')
      .select(`
        *,
        contrat:contrats(
          id, numero, prime_annuelle,
          client:clients(nom, prenom, raison_sociale, email, telephone)
        )
      `)
      .eq('id', quittance_id)
      .single();

    if (errQ || !quittance) {
      return jsonError('Quittance introuvable', 404);
    }

    if (quittance.status === 'payé') {
      return jsonError('Cette quittance est déjà encaissée', 422);
    }

    if (quittance.status === 'annulé') {
      return jsonError('Cette quittance est annulée', 422);
    }

    // ── Appel SQL encaisser_quittance ─────────────────────────
    const { data: updated, error: errFn } = await supabaseAdmin.rpc(
      'encaisser_quittance',
      {
        p_quittance_id:  quittance_id,
        p_mode_paiement: mode_paiement,
        p_reference:     reference ?? null,
        p_date_paiement: date_paiement ?? new Date().toISOString().slice(0, 10),
      }
    );

    if (errFn) {
      console.error('RPC error:', errFn);
      return jsonError(`Erreur encaissement : ${errFn.message}`, 500);
    }

    // ── Enregistrer l'agent qui a encaissé ───────────────────
    await supabaseAdmin
      .from('quittances')
      .update({ agent_id: user.id })
      .eq('id', quittance_id);

    // ── Stats : vérifier si toutes les quittances sont payées ─
    const { data: stats } = await supabaseAdmin
      .from('quittances')
      .select('status')
      .eq('contrat_id', quittance.contrat_id);

    const toutesPayees = stats?.every(q => q.status === 'payé') ?? false;

    console.log(
      `✅ Quittance ${quittance.numero} encaissée (${mode_paiement}) par ${user.email}`
    );

    return json({
      success: true,
      message: 'Quittance encaissée avec succès',
      quittance: updated,
      contrat_id: quittance.contrat_id,
      toutes_payees: toutesPayees,
      // Résumé pour affichage front
      recap: {
        numero: quittance.numero,
        montant: quittance.montant,
        mode_paiement,
        reference: reference ?? null,
        date_paiement: date_paiement ?? new Date().toISOString().slice(0, 10),
        client: quittance.contrat?.client,
      },
    });

  } catch (err: any) {
    console.error('Erreur:', err);
    return jsonError(err.message ?? 'Erreur interne', 500);
  }
});
