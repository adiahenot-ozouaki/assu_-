// ============================================================
// Edge Function : notifications-cron
// Déclenchement : cron quotidien à 7h00 (Supabase Scheduler)
// Ou POST manuel : /functions/v1/notifications-cron
//
// Actions :
//  1. Détecte les quittances à échéance dans 15 jours
//  2. Détecte les sinistres bloqués depuis 7+ jours
//  3. Détecte les quittances en retard
//  4. Groupe par agent et envoie un email résumé (Resend)
//  5. Enregistre les notifications en base (déduplication)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, jsonError } from '../_shared/helpers.ts';
import { buildEmailResume, buildEmailSinistreUrgent } from './emailTemplates.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const APP_URL        = Deno.env.get('APP_URL') ?? 'https://assurzen.app';
const FROM_EMAIL     = 'AssurZen <notifications@assurzen.ga>';
const ADMIN_EMAIL    = Deno.env.get('ADMIN_EMAIL') ?? 'admin@assurzen.ga';

// ── Envoi email via Resend ────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY non configuré — email non envoyé');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend error (${res.status}):`, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend fetch error:', err);
    return false;
  }
}

// ── Insérer notification avec déduplication ───────────────────
async function insertNotification(
  supabase: any,
  {
    type, titre, message,
    destinataire_id, destinataire_email,
    ref_type, ref_id, ref_numero,
    dedup_key, email_envoye,
  }: {
    type: string; titre: string; message: string;
    destinataire_id?: string; destinataire_email?: string;
    ref_type?: string; ref_id?: string; ref_numero?: string;
    dedup_key: string; email_envoye: boolean;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .upsert(
      {
        type, titre, message,
        destinataire_id, destinataire_email,
        ref_type, ref_id, ref_numero,
        dedup_key,
        email_envoye,
        email_envoye_at: email_envoye ? new Date().toISOString() : null,
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true }
    );

  return !error;
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const today     = new Date().toISOString().slice(0, 10);
  const results   = { echeances: 0, sinistres: 0, retards: 0, emails: 0, errors: 0 };

  try {
    // ── 1. Récupérer les alertes ─────────────────────────────
    const [
      { data: echeances },
      { data: sinistres },
      { data: retards },
      { data: agents },
    ] = await Promise.all([
      supabase.rpc('detecter_echeances_proches', { jours: 15 }),
      supabase.rpc('detecter_sinistres_bloques', { jours: 7 }),
      supabase.rpc('detecter_quittances_retard'),
      supabase.from('profiles').select('id, nom, prenom, email').eq('actif', true),
    ]);

    // ── 2. Grouper par agent ──────────────────────────────────
    // Chaque agent reçoit uniquement les alertes de ses clients
    const agentMap = new Map<string, {
      agent: any;
      echeances: any[];
      sinistres: any[];
      retards: any[];
    }>();

    // Initialiser avec l'admin comme destinataire global
    const adminAgent = agents?.find((a: any) => a.email === ADMIN_EMAIL)
      ?? { id: 'admin', nom: 'Admin', prenom: 'AssurZen', email: ADMIN_EMAIL };

    agentMap.set('admin', { agent: adminAgent, echeances: [], sinistres: [], retards: [] });

    // Trier les échéances par agent
    for (const e of (echeances ?? [])) {
      const agentId = e.agent_id ?? 'admin';
      if (!agentMap.has(agentId)) {
        const agent = agents?.find((a: any) => a.id === agentId);
        if (agent) agentMap.set(agentId, { agent, echeances: [], sinistres: [], retards: [] });
        else agentMap.get('admin')!.echeances.push(e);
        continue;
      }
      agentMap.get(agentId)!.echeances.push(e);
    }

    // Trier les sinistres par agent
    for (const s of (sinistres ?? [])) {
      const agentId = s.agent_id ?? 'admin';
      const bucket  = agentMap.get(agentId) ?? agentMap.get('admin')!;
      bucket.sinistres.push(s);

      // Alerte urgente si > 14 jours bloqué
      if (s.jours_bloques >= 14 && bucket.agent.email) {
        const html = buildEmailSinistreUrgent({
          agent_prenom:    bucket.agent.prenom,
          sinistre_numero: s.sinistre_numero,
          client_nom:      s.client_nom,
          nature:          s.nature,
          status:          s.status,
          jours_bloques:   s.jours_bloques,
          contrat_numero:  s.contrat_numero,
          app_url:         APP_URL,
        });

        const dedupKey = `urgent_${s.sinistre_numero}_${today}`;
        const dedupCheck = await supabase
          .from('notifications')
          .select('id')
          .eq('dedup_key', dedupKey)
          .single();

        if (!dedupCheck.data) {
          const sent = await sendEmail(
            bucket.agent.email,
            `🚨 Urgent — Sinistre ${s.sinistre_numero} bloqué depuis ${s.jours_bloques} jours`,
            html
          );
          await insertNotification(supabase, {
            type:               'sinistre_bloque_urgent',
            titre:              `Sinistre ${s.sinistre_numero} bloqué`,
            message:            `${s.client_nom} — ${s.nature} — ${s.jours_bloques} jours sans mouvement`,
            destinataire_id:    bucket.agent.id !== 'admin' ? bucket.agent.id : undefined,
            destinataire_email: bucket.agent.email,
            ref_type:           'sinistre',
            ref_id:             s.sinistre_id,
            ref_numero:         s.sinistre_numero,
            dedup_key:          dedupKey,
            email_envoye:       sent,
          });
          if (sent) results.emails++;
        }
      }
    }

    // Trier les retards par agent
    for (const r of (retards ?? [])) {
      const agentId = r.agent_id ?? 'admin';
      const bucket  = agentMap.get(agentId) ?? agentMap.get('admin')!;
      bucket.retards.push(r);
    }

    // ── 3. Envoyer le résumé quotidien à chaque agent ────────
    for (const [, bucket] of agentMap) {
      const { agent, echeances: e, sinistres: s, retards: r } = bucket;
      const total = e.length + s.length + r.length;

      // Ne pas envoyer si rien à signaler
      if (total === 0) continue;
      if (!agent.email) continue;

      const dedupKey = `resume_${agent.id}_${today}`;

      // Vérifier déduplication
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('dedup_key', dedupKey)
        .single();

      if (existing) continue;

      const dateLabel = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      }).format(new Date());

      const html = buildEmailResume({
        agent_prenom: agent.prenom,
        date:         dateLabel,
        echeances:    e.map((x: any) => ({
          numero:          x.quittance_numero,
          client_nom:      x.client_nom,
          montant:         x.montant,
          date_echeance:   x.date_echeance,
          jours_restants:  x.jours_restants,
          contrat_numero:  x.contrat_numero,
        })),
        sinistres: s.map((x: any) => ({
          numero:          x.sinistre_numero,
          client_nom:      x.client_nom,
          nature:          x.nature,
          status:          x.status,
          jours_bloques:   x.jours_bloques,
          contrat_numero:  x.contrat_numero,
        })),
        retards: r.map((x: any) => ({
          numero:      x.quittance_numero,
          client_nom:  x.client_nom,
          montant:     x.montant,
          jours_retard:x.jours_retard,
        })),
        app_url: APP_URL,
      });

      const subject = `AssurZen — ${total} action${total > 1 ? 's' : ''} requise${total > 1 ? 's' : ''} aujourd'hui`;
      const sent    = await sendEmail(agent.email, subject, html);
      if (sent) results.emails++;

      // Enregistrer la notification résumé
      await insertNotification(supabase, {
        type:               'resume_quotidien',
        titre:              `Résumé du ${dateLabel}`,
        message:            `${e.length} échéances, ${s.length} sinistres bloqués, ${r.length} retards`,
        destinataire_id:    agent.id !== 'admin' ? agent.id : undefined,
        destinataire_email: agent.email,
        dedup_key:          dedupKey,
        email_envoye:       sent,
      });

      // Notifications individuelles en base (pour le badge in-app)
      for (const echeance of e) {
        results.echeances++;
        await insertNotification(supabase, {
          type:               'echeance_proche',
          titre:              `Échéance J-${echeance.jours_restants} — ${echeance.client_nom}`,
          message:            `${echeance.quittance_numero} · ${echeance.montant} FCFA`,
          destinataire_id:    agent.id !== 'admin' ? agent.id : undefined,
          ref_type:           'quittance',
          ref_id:             echeance.quittance_id,
          ref_numero:         echeance.quittance_numero,
          dedup_key:          `echeance_${echeance.quittance_numero}_${today}`,
          email_envoye:       false,
        });
      }

      for (const sinistre of s) {
        results.sinistres++;
        await insertNotification(supabase, {
          type:               'sinistre_bloque',
          titre:              `Sinistre bloqué ${sinistre.jours_bloques}j — ${sinistre.client_nom}`,
          message:            `${sinistre.sinistre_numero} · ${sinistre.nature}`,
          destinataire_id:    agent.id !== 'admin' ? agent.id : undefined,
          ref_type:           'sinistre',
          ref_id:             sinistre.sinistre_id,
          ref_numero:         sinistre.sinistre_numero,
          dedup_key:          `sinistre_${sinistre.sinistre_numero}_${today}`,
          email_envoye:       false,
        });
      }
    }

    console.log(`✅ Notifications cron terminé:`, results);
    return json({ success: true, date: today, results });

  } catch (err: any) {
    console.error('Erreur cron notifications:', err);
    return jsonError(err.message ?? 'Erreur interne', 500);
  }
});
