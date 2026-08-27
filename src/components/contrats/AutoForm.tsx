import { Input, Select } from '../ui';

const MARQUES = ['Toyota', 'Peugeot', 'Renault', 'Volkswagen', 'Hyundai', 'Kia', 'Honda',
  'Nissan', 'Mitsubishi', 'Mercedes', 'BMW', 'Ford', 'Citroën', 'Suzuki', 'Autre'];

const CARBURANT_OPTIONS = [
  { value: '',         label: 'Sélectionner…' },
  { value: 'essence',  label: 'Essence' },
  { value: 'diesel',   label: 'Diesel'  },
  { value: 'hybride',  label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
];

const USAGE_OPTIONS = [
  { value: '',              label: 'Sélectionner…' },
  { value: 'personnel',     label: 'Usage personnel' },
  { value: 'professionnel', label: 'Usage professionnel' },
  { value: 'mixte',         label: 'Mixte' },
  { value: 'transport',     label: 'Transport de personnes' },
];

interface AutoFormProps {
  register: any;
  errors: any;
  prefix?: string;
}

export function AutoObjetForm({ register, errors, prefix = 'objet_assure' }: AutoFormProps) {
  const f = (name: string) => `${prefix}.${name}`;
  const e = (name: string) => errors?.objet_assure?.[name]?.message;

  return (
    <div className="space-y-5">
      <SectionTitle icon="🚗" title="Identification du véhicule" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Marque */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Marque *</label>
          <select
            {...register(f('marque'), { required: 'Requis' })}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent"
          >
            <option value="">Sélectionner…</option>
            {MARQUES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {e('marque') && <p className="text-xs text-red-500">{e('marque')}</p>}
        </div>

        <Input
          label="Modèle *"
          placeholder="Ex : Corolla, 308, Golf…"
          {...register(f('modele'), { required: 'Requis' })}
          error={e('modele')}
        />
        <Input
          label="Immatriculation *"
          placeholder="Ex : GA-123-AB"
          {...register(f('immat'), { required: 'Requis' })}
          error={e('immat')}
        />
        <Input
          label="Année *"
          type="number"
          placeholder={String(new Date().getFullYear())}
          {...register(f('annee'), {
            required: 'Requis',
            min: { value: 1980, message: 'Année invalide' },
            max: { value: new Date().getFullYear() + 1, message: 'Année invalide' },
          })}
          error={e('annee')}
        />
        <Input
          label="Numéro de châssis (VIN)"
          placeholder="Ex : JTDBZ42E2A0123456"
          {...register(f('vin'))}
        />
        <Input
          label="Puissance (CV)"
          type="number"
          placeholder="Ex : 85"
          {...register(f('puissance_cv'), { min: 1 })}
        />
        <Input
          label="Valeur vénale (FCFA)"
          type="number"
          placeholder="Ex : 6000000"
          {...register(f('valeur_venale'), { min: 0 })}
        />
        <Input
          label="Couleur"
          placeholder="Ex : Blanc perle"
          {...register(f('couleur'))}
        />
      </div>

      <SectionTitle icon="⚙️" title="Caractéristiques" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Carburant"
          options={CARBURANT_OPTIONS}
          {...register(f('carburant'))}
        />
        <Select
          label="Usage"
          options={USAGE_OPTIONS}
          {...register(f('usage'))}
        />
        <Input
          label="Nombre de places"
          type="number"
          placeholder="5"
          {...register(f('nb_places'), { min: 1, max: 50 })}
        />
        <Input
          label="Charge utile (kg)"
          placeholder="Ex : 1000 (pour utilitaires)"
          {...register(f('charge_utile_kg'), { min: 0 })}
        />
      </div>
    </div>
  );
}

// ── Garanties Auto ────────────────────────────────────────────
const AUTO_GARANTIES = [
  { key: 'rc',            label: 'Responsabilité Civile',   required: true  },
  { key: 'defense',       label: 'Défense et Recours',      required: false },
  { key: 'vol',           label: 'Vol & Tentative de vol',  required: false },
  { key: 'incendie',      label: 'Incendie & Explosion',    required: false },
  { key: 'bris_glace',    label: 'Bris de glace',           required: false },
  { key: 'catastrophe',   label: 'Catastrophes naturelles', required: false },
  { key: 'tierce_collision','label':'Tierce Collision',     required: false },
  { key: 'assistance',    label: 'Assistance 24h/24',       required: false },
  { key: 'conducteur',    label: 'Individuelle conducteur', required: false },
];

interface GarantiesProps {
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
}

export function AutoGaranties({ values, onChange }: GarantiesProps) {
  return (
    <div className="space-y-3">
      <SectionTitle icon="🛡️" title="Garanties souscrites" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {AUTO_GARANTIES.map(g => (
          <label
            key={g.key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              values[g.key]
                ? 'border-[#00C875] bg-[#00C875]/8'
                : 'border-gray-200 hover:border-gray-300'
            } ${g.required ? 'opacity-80' : ''}`}
          >
            <input
              type="checkbox"
              checked={!!values[g.key]}
              disabled={g.required}
              onChange={e => onChange(g.key, e.target.checked)}
              className="accent-[#00C875] w-4 h-4"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">{g.label}</span>
              {g.required && <span className="ml-1.5 text-xs text-gray-400">(obligatoire)</span>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-base">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}
