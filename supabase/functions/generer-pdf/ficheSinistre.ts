// ============================================================
// Template : Fiche de déclaration de sinistre
// ============================================================

import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import {
  A4, MARGIN, CONTENT_WIDTH, COLORS,
  loadFonts, drawHeader, drawFooter, drawText,
  drawRect, drawHRule, drawTwoColSection, drawTable,
  drawMultilineText, drawStampZone,
  fmtCurrency, fmtDate,
} from './pdfHelpers.ts';

const STATUS_LABELS: Record<string, string> = {
  ouvert:          'OUVERT',
  en_instruction:  'EN INSTRUCTION',
  'réglé':         'RÉGLÉ',
  'rejeté':        'REJETÉ',
  sans_suite:      'SANS SUITE',
};

const STATUS_COLORS: Record<string, any> = {
  ouvert:          COLORS.amber,
  en_instruction:  COLORS.navyMid,
  'réglé':         COLORS.green,
  'rejeté':        COLORS.red,
  sans_suite:      COLORS.gray500,
};

export async function buildFicheSinistre(data: {
  sinistre: any;
  contrat: any;
  client: any;
  produit: any;
  historique: any[];
  nb_documents: number;
}): Promise<Uint8Array> {
  const { sinistre, contrat, client, produit, historique, nb_documents } = data;
  const doc   = await PDFDocument.create();
  const page  = doc.addPage([A4.width, A4.height]);
  const fonts = await loadFonts(doc);

  const clientNom = client.est_personne_morale
    ? client.raison_sociale
    : `${client.prenom ?? ''} ${client.nom}`.trim();

  const statusColor = STATUS_COLORS[sinistre.status] ?? COLORS.gray500;
  const statusLabel = STATUS_LABELS[sinistre.status] ?? sinistre.status?.toUpperCase();

  // ── Header ───────────────────────────────────────────────
  drawHeader(page, fonts, {
    title:     'FICHE DE SINISTRE',
    subtitle:  sinistre.nature,
    docNumber: `N° ${sinistre.numero}`,
    date:      `Déclaré le ${fmtDate(sinistre.date_declaration)}`,
  });

  let y = A4.height - 110;

  // ── Statut ────────────────────────────────────────────────
  drawRect(page, MARGIN, y - 28, CONTENT_WIDTH, 36, statusColor);
  drawText(page, `STATUT DU DOSSIER : ${statusLabel}`, MARGIN + 12, y - 8, {
    font: fonts.bold, size: 10, color: COLORS.white,
  });
  if (sinistre.date_cloture) {
    drawText(page, `Clôturé le ${fmtDate(sinistre.date_cloture)}`,
      MARGIN + 12, y - 22, { font: fonts.regular, size: 8, color: COLORS.white }
    );
  }
  y -= 50;

  // ── Parties ───────────────────────────────────────────────
  y = drawTwoColSection(page, fonts,
    'SOUSCRIPTEUR',
    [
      ['Nom / Raison sociale', clientNom],
      ['Code client',          client.code_client],
      ['Téléphone',            client.telephone ?? '—'],
    ],
    [
      ['Contrat',  contrat.numero],
      ['Produit',  produit.nom],
      ['Branche',  produit.branche?.toUpperCase()],
    ],
    y - 10
  );
  y -= 16;

  // ── Circonstances ─────────────────────────────────────────
  drawRect(page, MARGIN, y - 4, CONTENT_WIDTH, 20, COLORS.navyMid);
  drawText(page, 'CIRCONSTANCES DU SINISTRE', MARGIN + 8, y + 4, {
    font: fonts.bold, size: 9, color: COLORS.white,
  });
  y -= 30;

  const circItems: Array<[string, string]> = [
    ['Nature',           sinistre.nature],
    ['Date du sinistre', fmtDate(sinistre.date_sinistre)],
    ['Lieu',             sinistre.lieu || '—'],
    ['Expert désigné',   sinistre.expert_nom || '—'],
  ];

  // Left 2 items
  circItems.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = MARGIN + col * (CONTENT_WIDTH / 2);
    const cy = y - row * 28;
    drawText(page, label, cx, cy, { font: fonts.regular, size: 8, color: COLORS.gray500 });
    drawText(page, value, cx, cy - 12, { font: fonts.bold, size: 9, color: COLORS.gray700 });
  });
  y -= 64;

  // Description
  drawText(page, 'Description des faits', MARGIN, y, {
    font: fonts.regular, size: 8, color: COLORS.gray500,
  });
  y -= 14;
  drawRect(page, MARGIN, y - 56, CONTENT_WIDTH, 64, COLORS.gray100);
  y -= 6;
  y = drawMultilineText(page, sinistre.description || '—', MARGIN + 8, y,
    { font: fonts.regular, size: 9, color: COLORS.gray700, lineHeight: 13, maxWidth: CONTENT_WIDTH - 16 }
  );
  y -= 24;

  // ── Évaluation financière ────────────────────────────────
  y = drawTwoColSection(page, fonts,
    'ÉVALUATION FINANCIÈRE',
    [
      ['Montant déclaré',   sinistre.montant_declare  ? fmtCurrency(sinistre.montant_declare)  : '—'],
      ['Montant expertisé', sinistre.montant_expertisé ? fmtCurrency(sinistre.montant_expertisé) : 'En cours'],
    ],
    [
      ['Montant indemnisé', sinistre.montant_indemnise ? fmtCurrency(sinistre.montant_indemnise) : '—'],
      ['Pièces jointes',    `${nb_documents} document(s) joint(s)`],
    ],
    y - 10
  );
  y -= 16;

  // ── Historique workflow ───────────────────────────────────
  if (historique && historique.length > 0) {
    drawRect(page, MARGIN, y - 4, CONTENT_WIDTH, 20, COLORS.navyMid);
    drawText(page, 'HISTORIQUE DU DOSSIER', MARGIN + 8, y + 4, {
      font: fonts.bold, size: 9, color: COLORS.white,
    });
    y -= 10;

    y = drawTable(page, fonts,
      ['Date', 'Statut', 'Commentaire', 'Gestionnaire'],
      historique.map(h => [
        fmtDate(h.created_at),
        STATUS_LABELS[h.nouveau_status] ?? h.nouveau_status,
        h.commentaire || '—',
        h.auteur ? `${h.auteur.prenom} ${h.auteur.nom}` : '—',
      ]),
      [90, 110, 210, 120],
      y - 10,
      18
    );
    y -= 12;
  }

  // ── Notes internes ────────────────────────────────────────
  if (sinistre.notes) {
    drawHRule(page, y);
    y -= 12;
    drawText(page, 'NOTES INTERNES', MARGIN, y, { font: fonts.bold, size: 8, color: COLORS.navy });
    y -= 12;
    y = drawMultilineText(page, sinistre.notes, MARGIN, y,
      { font: fonts.italic, size: 8, color: COLORS.gray500, lineHeight: 12, maxWidth: CONTENT_WIDTH }
    );
    y -= 8;
  }

  // ── Zone signature ────────────────────────────────────────
  if (y > 150) {
    drawStampZone(page, fonts, y - 10);
  }

  // ── Footer ───────────────────────────────────────────────
  drawFooter(page, fonts, 1, 1);

  return doc.save();
}
