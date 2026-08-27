import { formatCurrency, formatDate } from '../../lib/supabase';
import type { BranchType } from '../../types';

const BRANCH_LABELS: Record<BranchType, { label: string; icon: string }> = {
  auto:  { label: 'Auto',       icon: '🚗' },
  mrh:   { label: 'Habitation', icon: '🏠' },
  sante: { label: 'Santé',      icon: '🏥' },
  vie:   { label: 'Vie',        icon: '❤️' },
  autre: { label: 'Autre',      icon: '📋' },
};

interface RecapProps {
  data: {
    branche?: BranchType;
    produit_nom?: string;
    client_nom?: string;
    date_effet?: string;
    date_echeance?: string;
    prime_annuelle?: number;
    devise?: string;
    garanties?: Record<string, boolean>;
    objet_assure?: Record<string, any>;
  };
}

export function ContratRecap({ data }: RecapProps) {
  const brancheInfo = data.branche ? BRANCH_LABELS[data.branche] : null;
  const activeGaranties = Object.entries(data.garanties ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, ' '));

  // Build objet summary lines
  const objetLines = buildObjetSummary(data.branche, data.objet_assure);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Récapitulatif du contrat</h3>

      {/* Branche + produit */}
      {brancheInfo && (
        <RecapSection title="Produit">
          <RecapRow label="Branche" value={`${brancheInfo.icon} ${brancheInfo.label}`} />
          {data.produit_nom && <RecapRow label="Produit" value={data.produit_nom} />}
          {data.client_nom  && <RecapRow label="Souscripteur" value={data.client_nom} />}
        </RecapSection>
      )}

      {/* Période */}
      {(data.date_effet || data.date_echeance) && (
        <RecapSection title="Période">
          {data.date_effet    && <RecapRow label="Effet"    value={formatDate(data.date_effet)} />}
          {data.date_echeance && <RecapRow label="Échéance" value={formatDate(data.date_echeance)} />}
        </RecapSection>
      )}

      {/* Objet assuré */}
      {objetLines.length > 0 && (
        <RecapSection title="Objet assuré">
          {objetLines.map(([k, v]) => <RecapRow key={k} label={k} value={v} />)}
        </RecapSection>
      )}

      {/* Garanties */}
      {activeGaranties.length > 0 && (
        <RecapSection title="Garanties">
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {activeGaranties.map(g => (
              <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00C875]/12 text-[#00A35E] text-xs font-medium capitalize">
                ✓ {g}
              </span>
            ))}
          </div>
        </RecapSection>
      )}

      {/* Prime */}
      {data.prime_annuelle ? (
        <div className="bg-[#0A1628] rounded-xl p-4 text-white">
          <p className="text-xs text-white/50 mb-1">Prime annuelle</p>
          <p className="text-2xl font-bold">{formatCurrency(data.prime_annuelle, data.devise ?? 'FCFA')}</p>
          <p className="text-xs text-white/40 mt-1">
            soit {formatCurrency(Math.round(data.prime_annuelle / 12), data.devise ?? 'FCFA')} / mois
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">Renseignez la prime pour voir le récapitulatif complet</p>
        </div>
      )}
    </div>
  );
}

function RecapSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">{children}</div>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}

// Build summary lines from objet_assure JSONB depending on branch
function buildObjetSummary(branche?: BranchType, obj?: Record<string, any>): [string, string][] {
  if (!obj || !branche) return [];
  const lines: [string, string][] = [];
  const add = (label: string, key: string, suffix = '') => {
    if (obj[key]) lines.push([label, `${obj[key]}${suffix}`]);
  };
  switch (branche) {
    case 'auto':
      add('Véhicule', 'marque'); if (obj.marque && obj.modele) lines[lines.length - 1][1] += ` ${obj.modele}`;
      add('Immatriculation', 'immat');
      add('Année', 'annee');
      add('Usage', 'usage');
      break;
    case 'mrh':
      add('Adresse', 'adresse');
      add('Ville', 'ville');
      add('Type', 'type_logement');
      add('Surface', 'surface_m2', ' m²');
      if (obj.valeur_mobilier) lines.push(['Capital mobilier', formatCurrency(obj.valeur_mobilier)]);
      break;
    case 'sante':
      add('Assuré', 'assure_principal');
      add('Formule', 'formule');
      add('Régime', 'regime');
      if (obj.plafond_hospi) lines.push(['Plafond hospi.', formatCurrency(obj.plafond_hospi)]);
      break;
    case 'vie':
      add('Assuré', 'assure_nom');
      add('Type', 'type_contrat');
      if (obj.capital) lines.push(['Capital', formatCurrency(obj.capital)]);
      add('Durée', 'duree_annees', ' ans');
      add('Bénéficiaire 1', 'beneficiaire_1');
      break;
    case 'autre':
      add('Nature du risque', 'nature_risque');
      if (obj.valeur) lines.push(['Valeur assurée', formatCurrency(obj.valeur)]);
      break;
  }
  return lines;
}
