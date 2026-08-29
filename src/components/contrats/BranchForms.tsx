import { Input, Select } from '../ui';

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-base" aria-hidden>{icon}</span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="flex-1 h-px bg-surface-3" />
    </div>
  );
}

const TYPE_LOGEMENT = [
  { value: '',           label: 'Sélectionner…'   },
  { value: 'appartement',label: 'Appartement'     },
  { value: 'villa',      label: 'Villa / Maison'  },
  { value: 'studio',     label: 'Studio'          },
  { value: 'duplex',     label: 'Duplex'          },
];

const STATUT_OCCUPANT = [
  { value: '',          label: 'Sélectionner…' },
  { value: 'proprietaire', label: 'Propriétaire occupant' },
  { value: 'locataire', label: 'Locataire'   },
  { value: 'coproprietaire', label: 'Copropriétaire' },
];

export function MRHObjetForm({ register, errors }: { register: any; errors: any }) {
  const f = (n: string) => `objet_assure.${n}`;
  const e = (n: string) => errors?.objet_assure?.[n]?.message;

  return (
    <div className="space-y-5">
      <SectionTitle icon="🏠" title="Identification du bien" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Adresse du bien assuré *"
            placeholder="Quartier, rue, numéro…"
            {...register(f('adresse'), { required: 'Requis' })}
            error={e('adresse')}
          />
        </div>
        <Input label="Ville *" placeholder="Libreville"
          {...register(f('ville'), { required: 'Requis' })} error={e('ville')} />
        <Select label="Type de logement" options={TYPE_LOGEMENT} {...register(f('type_logement'))} />
        <Select label="Statut occupant" options={STATUT_OCCUPANT} {...register(f('statut_occupant'))} />
        <Input label="Surface (m²)" type="number" placeholder="80"
          {...register(f('surface_m2'), { min: 1 })} />
        <Input label="Nombre de pièces" type="number" placeholder="4"
          {...register(f('nb_pieces'), { min: 1 })} />
        <Input label="Étage" type="number" placeholder="2"
          {...register(f('etage'))} />
      </div>

      <SectionTitle icon="💰" title="Capitaux assurés (FCFA)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Valeur du bâtiment" type="number" placeholder="25 000 000"
          {...register(f('valeur_batiment'), { min: 0 })} />
        <Input label="Valeur du mobilier" type="number" placeholder="5 000 000"
          {...register(f('valeur_mobilier'), { min: 0 })} />
        <Input label="Valeur électroménager" type="number" placeholder="2 000 000"
          {...register(f('valeur_electromenager'), { min: 0 })} />
        <Input label="RC vie privée" type="number" placeholder="10 000 000"
          {...register(f('capital_rc'), { min: 0 })} />
      </div>
    </div>
  );
}

export function MRHGaranties({ values, onChange }: { values: Record<string, boolean>; onChange: (k: string, v: boolean) => void }) {
  const garanties = [
    { key: 'incendie',      label: 'Incendie & Explosion',      required: true  },
    { key: 'degats_eaux',   label: 'Dégâts des eaux',           required: false },
    { key: 'vol',           label: 'Vol & Cambriolage',          required: false },
    { key: 'bris_glace',    label: 'Bris de glace',             required: false },
    { key: 'rc_locataire',  label: 'RC Locataire / Propriétaire', required: false },
    { key: 'catastrophe',   label: 'Catastrophes naturelles',   required: false },
    { key: 'assistance',    label: 'Assistance relogement',     required: false },
  ];
  return (
    <div className="space-y-3">
      <SectionTitle icon="🛡️" title="Garanties souscrites" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {garanties.map(g => (
          <label key={g.key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              values[g.key] ? 'border-brand bg-brand-soft' : 'border-border hover:border-border-strong'
            }`}>
            <input type="checkbox" checked={!!values[g.key]} disabled={g.required}
              onChange={e => onChange(g.key, e.target.checked)}
              className="accent-brand w-4 h-4" />
            <span className="text-sm font-medium text-ink">
              {g.label}{g.required && <span className="ml-1 text-xs text-ink-subtle">(obligatoire)</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

const REGIME_OPTIONS = [
  { value: '',             label: 'Sélectionner…'         },
  { value: 'individuel',   label: 'Individuel'            },
  { value: 'couple',       label: 'Couple'                },
  { value: 'famille',      label: 'Famille (2 enfants)'  },
  { value: 'famille_plus', label: 'Famille élargie'      },
];

const FORMULE_OPTIONS = [
  { value: '',           label: 'Sélectionner…' },
  { value: 'economique', label: '🥉 Économique' },
  { value: 'standard',   label: '🥈 Standard'  },
  { value: 'confort',    label: '🥇 Confort'   },
  { value: 'premium',    label: '💎 Premium'   },
];

export function SanteObjetForm({ register, errors }: { register: any; errors: any }) {
  const f = (n: string) => `objet_assure.${n}`;
  const e = (n: string) => errors?.objet_assure?.[n]?.message;

  return (
    <div className="space-y-5">
      <SectionTitle icon="🏥" title="Assuré principal" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nom et prénom *" placeholder="Jean Moussavou"
          {...register(f('assure_principal'), { required: 'Requis' })} error={e('assure_principal')} />
        <Input label="Date de naissance *" type="date"
          {...register(f('date_naissance'), { required: 'Requis' })} error={e('date_naissance')} />
        <Select label="Régime / Composition" options={REGIME_OPTIONS} {...register(f('regime'))} />
        <Input label="Nombre de bénéficiaires" type="number" placeholder="1"
          {...register(f('nb_beneficiaires'), { min: 1 })} />
      </div>

      <SectionTitle icon="📋" title="Couverture" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Formule *" options={FORMULE_OPTIONS}
          {...register(f('formule'), { required: 'Requis' })} />
        <Input label="Plafond hospitalisation (FCFA)" type="number" placeholder="5 000 000"
          {...register(f('plafond_hospi'), { min: 0 })} />
        <Input label="Plafond ambulatoire (FCFA)" type="number" placeholder="1 000 000"
          {...register(f('plafond_ambu'), { min: 0 })} />
        <Input label="Taux remboursement (%)" type="number" placeholder="80"
          {...register(f('taux_remboursement'), { min: 0, max: 100 })} />
        <Input label="Médecin traitant" placeholder="Dr. Nze Paul"
          {...register(f('medecin_traitant'))} />
        <Input label="Groupe sanguin" placeholder="A+"
          {...register(f('groupe_sanguin'))} />
      </div>
    </div>
  );
}

export function SanteGaranties({ values, onChange }: { values: Record<string, boolean>; onChange: (k: string, v: boolean) => void }) {
  const garanties = [
    { key: 'hospitalisation', label: 'Hospitalisation',             required: true  },
    { key: 'ambulatoire',     label: 'Soins ambulatoires',         required: false },
    { key: 'pharmacie',       label: 'Pharmacie',                  required: false },
    { key: 'maternite',       label: 'Maternité',                  required: false },
    { key: 'dentaire',        label: 'Soins dentaires',            required: false },
    { key: 'optique',         label: 'Optique & lunettes',         required: false },
    { key: 'evacuation',      label: 'Évacuation sanitaire',       required: false },
    { key: 'deces_accidentel','label':'Décès accidentel',          required: false },
  ];
  return (
    <div className="space-y-3">
      <SectionTitle icon="🛡️" title="Garanties souscrites" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {garanties.map(g => (
          <label key={g.key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              values[g.key] ? 'border-brand bg-brand-soft' : 'border-border hover:border-border-strong'
            }`}>
            <input type="checkbox" checked={!!values[g.key]} disabled={g.required}
              onChange={e => onChange(g.key, e.target.checked)}
              className="accent-brand w-4 h-4" />
            <span className="text-sm font-medium text-ink">
              {g.label}{g.required && <span className="ml-1 text-xs text-ink-subtle">(obligatoire)</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

const TYPE_VIE_OPTIONS = [
  { value: '',               label: 'Sélectionner…'         },
  { value: 'temporaire_deces','label':'Temporaire décès'    },
  { value: 'vie_entiere',    label: 'Vie entière'           },
  { value: 'epargne',        label: 'Épargne retraite'      },
  { value: 'education',      label: 'Éducation / Capital'   },
  { value: 'groupe',         label: 'Prévoyance groupe'     },
];

export function VieObjetForm({ register, errors }: { register: any; errors: any }) {
  const f = (n: string) => `objet_assure.${n}`;
  const e = (n: string) => errors?.objet_assure?.[n]?.message;

  return (
    <div className="space-y-5">
      <SectionTitle icon="❤️" title="Assuré" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nom et prénom *" placeholder="Jean Moussavou"
          {...register(f('assure_nom'), { required: 'Requis' })} error={e('assure_nom')} />
        <Input label="Date de naissance *" type="date"
          {...register(f('date_naissance'), { required: 'Requis' })} error={e('date_naissance')} />
        <Input label="Profession" placeholder="Ingénieur, fonctionnaire…"
          {...register(f('profession'))} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-ink">Fumeur ?</label>
          <div className="flex gap-3 pt-1">
            {['Non', 'Oui'].map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={v === 'Oui' ? 'oui' : 'non'}
                  {...register(f('fumeur'))} className="accent-brand" />
                <span className="text-sm text-ink">{v}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <SectionTitle icon="📋" title="Contrat vie" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Type de contrat *" options={TYPE_VIE_OPTIONS}
          {...register(f('type_contrat'), { required: 'Requis' })} />
        <Input label="Capital assuré (FCFA) *" type="number" placeholder="10 000 000"
          {...register(f('capital'), { required: 'Requis', min: 0 })} error={e('capital')} />
        <Input label="Durée (années)" type="number" placeholder="20"
          {...register(f('duree_annees'), { min: 1, max: 40 })} />
      </div>

      <SectionTitle icon="👤" title="Bénéficiaires" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Bénéficiaire 1 (nom)" placeholder="Marie Moussavou"
          {...register(f('beneficiaire_1'))} />
        <Input label="Lien de parenté" placeholder="Épouse, enfant…"
          {...register(f('lien_beneficiaire_1'))} />
        <Input label="Bénéficiaire 2 (nom)" placeholder="Pierre Moussavou"
          {...register(f('beneficiaire_2'))} />
        <Input label="Lien de parenté" placeholder="Fils, parent…"
          {...register(f('lien_beneficiaire_2'))} />
      </div>
    </div>
  );
}

export function VieGaranties({ values, onChange }: { values: Record<string, boolean>; onChange: (k: string, v: boolean) => void }) {
  const garanties = [
    { key: 'deces',             label: 'Décès toutes causes',        required: true  },
    { key: 'invalidite_totale', label: 'Invalidité permanente totale', required: false },
    { key: 'invalidite_partielle','label':'Invalidité permanente partielle', required: false },
    { key: 'deces_accidentel',  label: 'Double effet accidentel',    required: false },
    { key: 'exoneration',       label: 'Exonération de prime',       required: false },
    { key: 'epargne_cap',       label: 'Capital épargne à terme',    required: false },
  ];
  return (
    <div className="space-y-3">
      <SectionTitle icon="🛡️" title="Garanties souscrites" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {garanties.map(g => (
          <label key={g.key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              values[g.key] ? 'border-brand bg-brand-soft' : 'border-border hover:border-border-strong'
            }`}>
            <input type="checkbox" checked={!!values[g.key]} disabled={g.required}
              onChange={e => onChange(g.key, e.target.checked)}
              className="accent-brand w-4 h-4" />
            <span className="text-sm font-medium text-ink">
              {g.label}{g.required && <span className="ml-1 text-xs text-ink-subtle">(obligatoire)</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function AutreObjetForm({ register }: { register: any }) {
  const f = (n: string) => `objet_assure.${n}`;
  return (
    <div className="space-y-5">
      <SectionTitle icon="📋" title="Description du risque" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nature du risque *" placeholder="Ex : Marchandises en transit"
          {...register(f('nature_risque'))} />
        <Input label="Valeur assurée (FCFA)" type="number"
          {...register(f('valeur'), { min: 0 })} />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1">Description détaillée</label>
          <textarea rows={4} placeholder="Décrivez l'objet ou le risque assuré…"
            {...register(f('description'))}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink bg-surface-2 placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none" />
        </div>
        <Input label="Lieu / Zone de risque" placeholder="Ex : Port de Libreville"
          {...register(f('lieu'))} />
        <Input label="Réf. document technique" placeholder="Ex : Police n°…"
          {...register(f('ref_technique'))} />
      </div>
    </div>
  );
}
