// ============================================================
// Templates email HTML — AssurZen Notifications
// ============================================================

export const EMAIL_STYLES = `
  body { margin:0; padding:0; background:#F0F4F0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
  .card { background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { background:#0A1628; padding:28px 32px; }
  .header-logo { color:#00C875; font-size:22px; font-weight:800; letter-spacing:-0.5px; }
  .header-sub { color:rgba(255,255,255,0.4); font-size:12px; margin-top:4px; }
  .body { padding:32px; }
  .alert-badge { display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border-radius:999px; font-size:12px; font-weight:600; margin-bottom:20px; }
  .badge-amber { background:#FFF5E0; color:#B45309; }
  .badge-red   { background:#FEE2E2; color:#B91C1C; }
  .badge-blue  { background:#EFF6FF; color:#1D4ED8; }
  .title { font-size:20px; font-weight:700; color:#0A1628; margin:0 0 8px; }
  .subtitle { font-size:14px; color:#6B7A8D; margin:0 0 24px; line-height:1.5; }
  .info-grid { background:#F8FAFC; border-radius:12px; padding:20px; margin:20px 0; }
  .info-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #E2E8F0; font-size:13px; }
  .info-row:last-child { border-bottom:none; }
  .info-label { color:#6B7A8D; }
  .info-value { font-weight:600; color:#0A1628; }
  .cta { display:inline-block; background:#00C875; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:10px; font-weight:600; font-size:14px; margin-top:8px; }
  .items-list { margin:16px 0; }
  .item { border:1px solid #E2E8F0; border-radius:10px; padding:14px 16px; margin-bottom:10px; }
  .item-title { font-weight:600; color:#0A1628; font-size:14px; }
  .item-meta { color:#6B7A8D; font-size:12px; margin-top:4px; }
  .item-amount { font-weight:700; color:#00A35E; font-size:15px; float:right; }
  .item-urgent { border-left:3px solid #EF4444; }
  .item-warning { border-left:3px solid #F59E0B; }
  .footer { padding:20px 32px; background:#F8FAFC; border-top:1px solid #E2E8F0; }
  .footer-text { color:#94A3B8; font-size:11px; text-align:center; line-height:1.6; }
`;

// ── Template : résumé quotidien pour les agents ───────────────
export function buildEmailResume(data: {
  agent_prenom: string;
  date: string;
  echeances: Array<{
    numero: string;
    client_nom: string;
    montant: number;
    date_echeance: string;
    jours_restants: number;
    contrat_numero: string;
  }>;
  sinistres: Array<{
    numero: string;
    client_nom: string;
    nature: string;
    status: string;
    jours_bloques: number;
    contrat_numero: string;
  }>;
  retards: Array<{
    numero: string;
    client_nom: string;
    montant: number;
    jours_retard: number;
  }>;
  app_url: string;
}): string {
  const { agent_prenom, date, echeances, sinistres, retards, app_url } = data;
  const total = echeances.length + sinistres.length + retards.length;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  const urgent = (j: number) => j <= 3;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Résumé quotidien AssurZen</title>
<style>${EMAIL_STYLES}</style>
</head>
<body>
<div class="wrapper">
  <div class="card">

    <!-- Header -->
    <div class="header">
      <div class="header-logo">AssurZen</div>
      <div class="header-sub">Résumé quotidien · ${date}</div>
    </div>

    <!-- Body -->
    <div class="body">
      <p style="color:#6B7A8D;font-size:14px;margin:0 0 20px;">
        Bonjour <strong style="color:#0A1628">${agent_prenom}</strong>,
        voici votre récapitulatif du jour.
      </p>

      ${total === 0 ? `
        <div style="text-align:center;padding:32px 0;">
          <div style="font-size:48px;margin-bottom:12px;">✅</div>
          <p style="color:#6B7A8D;font-size:14px;">Aucune action requise aujourd'hui. Bonne journée !</p>
        </div>
      ` : `

      <!-- Résumé chiffres -->
      <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
        ${echeances.length > 0 ? `
        <div style="flex:1;min-width:130px;background:#FFF5E0;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#B45309;">${echeances.length}</div>
          <div style="font-size:11px;color:#92400E;font-weight:600;">ÉCHÉANCES PROCHES</div>
        </div>` : ''}
        ${sinistres.length > 0 ? `
        <div style="flex:1;min-width:130px;background:#FEE2E2;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#B91C1C;">${sinistres.length}</div>
          <div style="font-size:11px;color:#991B1B;font-weight:600;">SINISTRES BLOQUÉS</div>
        </div>` : ''}
        ${retards.length > 0 ? `
        <div style="flex:1;min-width:130px;background:#FEE2E2;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#B91C1C;">${retards.length}</div>
          <div style="font-size:11px;color:#991B1B;font-weight:600;">QUITTANCES EN RETARD</div>
        </div>` : ''}
      </div>

      <!-- Section échéances -->
      ${echeances.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;color:#0A1628;margin:0 0 12px;">
        ⏰ Quittances à échéance dans 15 jours
      </h3>
      <div class="items-list">
        ${echeances.map(q => `
        <div class="item ${urgent(q.jours_restants) ? 'item-urgent' : 'item-warning'}">
          <span class="item-amount">${fmt(q.montant)}</span>
          <div class="item-title">${q.client_nom}</div>
          <div class="item-meta">
            ${q.numero} · Contrat ${q.contrat_numero} ·
            <strong style="color:${urgent(q.jours_restants) ? '#EF4444' : '#F59E0B'}">
              ${q.jours_restants === 0 ? "Aujourd'hui !" : `J-${q.jours_restants}`}
            </strong>
            · Échéance : ${q.date_echeance}
          </div>
        </div>`).join('')}
      </div>` : ''}

      <!-- Section sinistres bloqués -->
      ${sinistres.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;color:#0A1628;margin:20px 0 12px;">
        🚨 Sinistres sans mouvement depuis 7+ jours
      </h3>
      <div class="items-list">
        ${sinistres.map(s => `
        <div class="item item-urgent">
          <div class="item-title">${s.client_nom} — ${s.nature}</div>
          <div class="item-meta">
            ${s.numero} · Contrat ${s.contrat_numero} ·
            Statut : <strong>${s.status}</strong> ·
            <strong style="color:#EF4444">${s.jours_bloques} jours sans action</strong>
          </div>
        </div>`).join('')}
      </div>` : ''}

      <!-- Section retards -->
      ${retards.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;color:#0A1628;margin:20px 0 12px;">
        💳 Quittances en retard de paiement
      </h3>
      <div class="items-list">
        ${retards.map(r => `
        <div class="item item-urgent">
          <span class="item-amount">${fmt(r.montant)}</span>
          <div class="item-title">${r.client_nom}</div>
          <div class="item-meta">
            ${r.numero} · <strong style="color:#EF4444">${r.jours_retard} jours de retard</strong>
          </div>
        </div>`).join('')}
      </div>` : ''}

      `}

      <a href="${app_url}/dashboard" class="cta">Accéder à l'ERP →</a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        AssurZen ERP · Cet email est généré automatiquement chaque matin à 7h00.<br>
        Pour ne plus recevoir ces emails, modifiez vos préférences dans votre profil.
      </p>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Template : alerte urgente sinistre bloqué ─────────────────
export function buildEmailSinistreUrgent(data: {
  agent_prenom: string;
  sinistre_numero: string;
  client_nom: string;
  nature: string;
  status: string;
  jours_bloques: number;
  contrat_numero: string;
  app_url: string;
}): string {
  const { agent_prenom, sinistre_numero, client_nom, nature, status, jours_bloques, contrat_numero, app_url } = data;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Sinistre urgent — AssurZen</title>
<style>${EMAIL_STYLES}</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="header-logo">AssurZen</div>
      <div class="header-sub">Alerte sinistre · Action requise</div>
    </div>
    <div class="body">
      <span class="alert-badge badge-red">🚨 Urgent — ${jours_bloques} jours sans mouvement</span>
      <h2 class="title">Sinistre en attente de traitement</h2>
      <p class="subtitle">
        Bonjour ${agent_prenom}, le dossier sinistre ci-dessous nécessite votre attention immédiate.
      </p>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">N° Sinistre</span><span class="info-value">${sinistre_numero}</span></div>
        <div class="info-row"><span class="info-label">Client</span><span class="info-value">${client_nom}</span></div>
        <div class="info-row"><span class="info-label">Nature</span><span class="info-value">${nature}</span></div>
        <div class="info-row"><span class="info-label">Statut actuel</span><span class="info-value">${status}</span></div>
        <div class="info-row"><span class="info-label">Contrat</span><span class="info-value">${contrat_numero}</span></div>
        <div class="info-row">
          <span class="info-label">Inactivité</span>
          <span class="info-value" style="color:#EF4444">${jours_bloques} jours</span>
        </div>
      </div>
      <a href="${app_url}/sinistres" class="cta">Traiter le sinistre →</a>
    </div>
    <div class="footer">
      <p class="footer-text">AssurZen ERP · Alerte automatique</p>
    </div>
  </div>
</div>
</body>
</html>`;
}
