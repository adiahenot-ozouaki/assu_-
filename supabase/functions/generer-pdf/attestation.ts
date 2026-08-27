// ============================================================
// Template : Attestation d'assurance
// ============================================================

import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import {
  A4, MARGIN, CONTENT_WIDTH, COLORS,
  loadFonts, drawHeader, drawFooter, drawText,
  drawRect, drawHRule, drawTwoColSection,
  drawStampZone, fmtCurrency, fmtDate, fmtDateShort,
} from './pdfHelpers.ts';

export async function buildAttestation(data: {
  contrat: any;
  client: any;
  produit: any;
  garanties: Record<string, boolean>;
  objet_assure: Record<string, any>;
}): Promise<Uint8Array> {
  const { contrat, client, produit, garanties, objet_assure } = data;
  const doc   = await PDFDocument.create();
  const page  = doc.addPage([A4.width, A4.height]);
  const fonts = await loadFonts(doc);

  const clientNom = client.est_personne_morale
    ? client.raison_sociale
    : `${client.prenom ?? ''} ${client.nom}`.trim();

  const today = fmtDate(new Date().toISOString().slice(0, 10));

  // ── Header ────────────────────────────────────────────────
  drawHeader(page, fonts, {
    title:     "ATTESTATION D'ASSURANCE",
    subtitle:  produit.nom,
    docNumber: `Réf. : ${contrat.numero}`,
    date:      `Émise le ${today}`,
  });

  let y = A4.height - 110;

  // ── Mention légale ────────────────────────────────────────
  drawRect(page, MARGIN, y - 28, CONTENT_WIDTH, 36, COLORS.green);
  drawText(page, 'DOCUMENT OFFICIEL D\'ASSURANCE', MARGIN + 12, y - 6, {
    font: fonts.bold, size: 10, color: COLORS.white,
  });
  drawText(page,
    'Ce document certifie que le souscripteur ci-dessous bénéficie d\'une couverture d\'assurance valide.',
    MARGIN + 12, y - 20, { font: fonts.regular, size: 8, color: COLORS.white }
  );
  y -= 48;

  // ── Section souscripteur + contrat ───────────────────────
  y = drawTwoColSection(page, fonts,
    'SOUSCRIPTEUR',
    [
      ['Nom / Raison sociale', clientNom],
      ['Code client',          client.code_client],
      ['Téléphone',            client.telephone ?? '—'],
      ['Email',                client.email ?? '—'],
    ],
    [
      ['Adresse',  [client.adresse, client.ville, client.pays].filter(Boolean).join(', ') || '—'],
      ['Pièce',    client.type_piece && client.numero_piece ? `${client.type_piece} n° ${client.numero_piece}` : '—'],
    ],
    y - 10
  );
  y -= 16;

  // ── Section contrat ────────────────────────────────────────
  y = drawTwoColSection(page, fonts,
    'CONTRAT D\'ASSURANCE',
    [
      ['N° de contrat',    contrat.numero],
      ['Produit',          produit.nom],
      ['Branche',          produit.branche?.toUpperCase()],
      ['Prime annuelle',   fmtCurrency(contrat.prime_annuelle, contrat.devise)],
    ],
    [
      ['Date d\'effet',    fmtDate(contrat.date_effet)],
      ['Date d\'échéance', fmtDate(contrat.date_echeance)],
      ['Statut',           contrat.status?.toUpperCase()],
      ['Franchise',        contrat.franchise ? fmtCurrency(contrat.franchise) : 'Néant'],
    ],
    y - 10
  );
  y -= 16;

  // ── Objet assuré (selon branche) ──────────────────────────
  if (objet_assure && Object.keys(objet_assure).length > 0) {
    const objetLines = buildObjetLines(produit.branche, objet_assure);
    const half = Math.ceil(objetLines.length / 2);

    y = drawTwoColSection(page, fonts,
      'OBJET ASSURÉ',
      objetLines.slice(0, half),
      objetLines.slice(half),
      y - 10
    );
    y -= 16;
  }

  // ── Garanties ────────────────────────────────────────────
  const activeGaranties = Object.entries(garanties ?? {})
    .filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ').toUpperCase());

  if (activeGaranties.length > 0) {
    drawRect(page, MARGIN, y - 4, CONTENT_WIDTH, 20, COLORS.navyMid);
    drawText(page, 'GARANTIES SOUSCRITES', MARGIN + 8, y + 4, {
      font: fonts.bold, size: 9, color: COLORS.white,
    });
    y -= 30;

    const cols = 3;
    const colW = CONTENT_WIDTH / cols;
    activeGaranties.forEach((g, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const gx = MARGIN + col * colW;
      const gy = y - row * 14;

      // Bullet point vert
      drawRect(page, gx, gy - 2, 5, 5, COLORS.green);
      drawText(page, g, gx + 9, gy, {
        font: fonts.regular, size: 8, color: COLORS.gray700,
      });
    });
    y -= (Math.ceil(activeGaranties.length / cols) * 14) + 16;
  }

  // ── Zone validité ─────────────────────────────────────────
  drawHRule(page, y);
  y -= 14;
  drawRect(page, MARGIN, y - 28, CONTENT_WIDTH, 36, COLORS.gray100);
  drawText(page, '⚠  VALIDITÉ', MARGIN + 12, y - 8, { font: fonts.bold, size: 9, color: COLORS.navy });
  drawText(page,
    `Ce document est valable du ${fmtDateShort(contrat.date_effet)} au ${fmtDateShort(contrat.date_echeance)}. ` +
    'Il doit être présenté avec une pièce d\'identité en cas de contrôle ou de sinistre.',
    MARGIN + 12, y - 20,
    { font: fonts.regular, size: 8, color: COLORS.gray700 }
  );
  y -= 52;

  // ── Zones signature ───────────────────────────────────────
  drawStampZone(page, fonts, y);
  y -= 90;

  // ── Footer ───────────────────────────────────────────────
  drawFooter(page, fonts, 1, 1);

  return doc.save();
}

function buildObjetLines(branche: string, obj: Record<string, any>): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  const add = (label: string, key: string, suffix = '') => {
    if (obj[key]) lines.push([label, `${obj[key]}${suffix}`]);
  };
  switch (branche) {
    case 'auto':
      add('Marque', 'marque'); add('Modèle', 'modele');
      add('Immatriculation', 'immat'); add('Année', 'annee');
      add('Carburant', 'carburant'); add('Usage', 'usage');
      if (obj.valeur_venale) lines.push(['Valeur vénale', fmtCurrency(obj.valeur_venale)]);
      break;
    case 'mrh':
      add('Adresse', 'adresse'); add('Ville', 'ville');
      add('Type', 'type_logement'); add('Surface', 'surface_m2', ' m²');
      if (obj.valeur_mobilier) lines.push(['Capital mobilier', fmtCurrency(obj.valeur_mobilier)]);
      break;
    case 'sante':
      add('Assuré principal', 'assure_principal');
      add('Formule', 'formule'); add('Régime', 'regime');
      break;
    case 'vie':
      add('Assuré', 'assure_nom'); add('Type contrat', 'type_contrat');
      if (obj.capital) lines.push(['Capital', fmtCurrency(obj.capital)]);
      add('Durée', 'duree_annees', ' ans');
      break;
  }
  return lines;
}
