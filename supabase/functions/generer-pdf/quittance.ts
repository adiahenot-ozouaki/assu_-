// ============================================================
// Template : Quittance de prime
// ============================================================

import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import {
  A4, MARGIN, CONTENT_WIDTH, COLORS,
  loadFonts, drawHeader, drawFooter, drawText,
  drawRect, drawHRule, drawTwoColSection, drawTable,
  fmtCurrency, fmtDate, fmtDateShort,
} from './pdfHelpers.ts';

export async function buildQuittance(data: {
  quittance: any;
  contrat: any;
  client: any;
  produit: any;
}): Promise<Uint8Array> {
  const { quittance, contrat, client, produit } = data;
  const doc   = await PDFDocument.create();
  const page  = doc.addPage([A4.width, A4.height]);
  const fonts = await loadFonts(doc);

  const clientNom = client.est_personne_morale
    ? client.raison_sociale
    : `${client.prenom ?? ''} ${client.nom}`.trim();

  const isPaid = quittance.status === 'payé';

  // ── Header ───────────────────────────────────────────────
  drawHeader(page, fonts, {
    title:     'QUITTANCE DE PRIME',
    subtitle:  `${produit.nom} · ${produit.branche?.toUpperCase()}`,
    docNumber: `N° ${quittance.numero}`,
    date:      `Émise le ${fmtDate(new Date().toISOString().slice(0, 10))}`,
  });

  let y = A4.height - 110;

  // ── Statut payé (bandeau vert) ou en attente (amber) ─────
  const statusColor = isPaid ? COLORS.green : quittance.status === 'en_retard' ? COLORS.red : COLORS.amber;
  const statusLabel = isPaid
    ? `✓ QUITTANCE RÉGLÉE — Paiement reçu le ${fmtDate(quittance.date_paiement)}`
    : quittance.status === 'en_retard'
      ? '⚠ QUITTANCE EN RETARD — Merci de régulariser votre situation'
      : `◉ EN ATTENTE DE PAIEMENT — Échéance : ${fmtDate(quittance.date_echeance)}`;

  drawRect(page, MARGIN, y - 28, CONTENT_WIDTH, 36, statusColor);
  drawText(page, statusLabel, MARGIN + 12, y - 12, {
    font: fonts.bold, size: 9, color: COLORS.white,
  });
  y -= 50;

  // ── Souscripteur + contrat ────────────────────────────────
  y = drawTwoColSection(page, fonts,
    'SOUSCRIPTEUR',
    [
      ['Nom / Raison sociale', clientNom],
      ['Code client',          client.code_client],
      ['Téléphone',            client.telephone ?? '—'],
    ],
    [
      ['Adresse', [client.adresse, client.ville].filter(Boolean).join(', ') || '—'],
      ['Email',   client.email ?? '—'],
    ],
    y - 10
  );
  y -= 16;

  y = drawTwoColSection(page, fonts,
    'CONTRAT RÉFÉRENCÉ',
    [
      ['N° de contrat',  contrat.numero],
      ['Produit',        produit.nom],
      ['Date d\'effet',  fmtDate(contrat.date_effet)],
    ],
    [
      ['Échéance',       fmtDate(contrat.date_echeance)],
      ['Prime annuelle', fmtCurrency(contrat.prime_annuelle, contrat.devise)],
      ['Statut contrat', contrat.status?.toUpperCase()],
    ],
    y - 10
  );
  y -= 16;

  // ── Détail quittance ──────────────────────────────────────
  drawRect(page, MARGIN, y - 4, CONTENT_WIDTH, 20, COLORS.navyMid);
  drawText(page, 'DÉTAIL DE LA QUITTANCE', MARGIN + 8, y + 4, {
    font: fonts.bold, size: 9, color: COLORS.white,
  });
  y -= 30;

  // Tableau détail
  y = drawTable(page, fonts,
    ['Désignation', 'Période', 'Montant HT', 'Taxes', 'Montant TTC'],
    [[
      produit.nom,
      `${fmtDateShort(quittance.periode_debut)} → ${fmtDateShort(quittance.periode_fin)}`,
      fmtCurrency(quittance.montant * 0.85),
      fmtCurrency(quittance.montant * 0.15),
      fmtCurrency(quittance.montant, contrat.devise),
    ]],
    [180, 130, 85, 75, 100],
    y,
    22
  );
  y -= 10;

  // Total box
  drawRect(page, MARGIN + CONTENT_WIDTH - 200, y - 36, 200, 44, COLORS.navy);
  drawText(page, 'TOTAL À PAYER', MARGIN + CONTENT_WIDTH - 190, y - 10, {
    font: fonts.bold, size: 8, color: COLORS.green,
  });
  drawText(page, fmtCurrency(quittance.montant, contrat.devise),
    MARGIN + CONTENT_WIDTH - 190, y - 26,
    { font: fonts.bold, size: 14, color: COLORS.white }
  );
  y -= 56;

  // ── Modes de paiement acceptés ────────────────────────────
  drawHRule(page, y);
  y -= 14;
  drawText(page, 'MODES DE PAIEMENT ACCEPTÉS', MARGIN, y, {
    font: fonts.bold, size: 8, color: COLORS.navy,
  });
  y -= 14;

  const modes = [
    ['📱 Mobile Money', 'Airtel Money / Moov Money'],
    ['🏦 Virement',     'BGFI · UGB · BICIG'],
    ['💵 Espèces',      'Au guichet AssurZen'],
    ['📄 Chèque',       'À l\'ordre d\'AssurZen'],
  ];
  modes.forEach(([mode, detail], i) => {
    const mx = MARGIN + (i % 2) * (CONTENT_WIDTH / 2);
    const my = y - Math.floor(i / 2) * 20;
    drawText(page, mode,   mx, my,      { font: fonts.bold,    size: 8, color: COLORS.gray700 });
    drawText(page, detail, mx, my - 10, { font: fonts.regular, size: 7, color: COLORS.gray500 });
  });
  y -= 54;

  // ── Paiement enregistré (si payé) ─────────────────────────
  if (isPaid) {
    drawHRule(page, y);
    y -= 14;
    drawRect(page, MARGIN, y - 36, CONTENT_WIDTH, 44, COLORS.gray100);
    drawText(page, '✓ PAIEMENT ENREGISTRÉ', MARGIN + 12, y - 8, {
      font: fonts.bold, size: 9, color: COLORS.greenDark,
    });

    const modeLabels: Record<string, string> = {
      mobile_money: 'Mobile Money', virement: 'Virement bancaire',
      especes: 'Espèces', cheque: 'Chèque', carte: 'Carte bancaire',
    };
    const details = [
      `Mode : ${modeLabels[quittance.mode_paiement] ?? quittance.mode_paiement}`,
      quittance.reference_paiement ? `Référence : ${quittance.reference_paiement}` : '',
      `Date : ${fmtDate(quittance.date_paiement)}`,
    ].filter(Boolean).join('   ·   ');

    drawText(page, details, MARGIN + 12, y - 22, {
      font: fonts.regular, size: 8, color: COLORS.gray700,
    });
    y -= 56;
  }

  // ── Note de bas ───────────────────────────────────────────
  drawHRule(page, y);
  y -= 12;
  drawText(page,
    'Cette quittance n\'est valable qu\'après encaissement effectif de la somme indiquée. ' +
    'En cas de litige, veuillez contacter votre agence AssurZen.',
    MARGIN, y,
    { font: fonts.italic, size: 7, color: COLORS.gray500 }
  );

  // ── Footer ───────────────────────────────────────────────
  drawFooter(page, fonts, 1, 1);

  return doc.save();
}
