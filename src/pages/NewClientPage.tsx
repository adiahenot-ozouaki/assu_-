import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { createClient } from '../lib/clients.service';
import type { ClientInsert } from '../types';
import { Button, Card, Input, Select } from '../components/ui';

const PAYS_OPTIONS = [
  { value: 'Gabon', label: 'Gabon' },
  { value: 'Cameroun', label: 'Cameroun' },
  { value: 'Congo', label: 'Congo' },
  { value: 'Côte d\'Ivoire', label: 'Côte d\'Ivoire' },
  { value: 'Sénégal', label: 'Sénégal' },
  { value: 'France', label: 'France' },
  { value: 'Autre', label: 'Autre' },
];

const PIECE_OPTIONS = [
  { value: '', label: 'Sélectionner…' },
  { value: 'CNI', label: 'Carte Nationale d\'Identité' },
  { value: 'Passeport', label: 'Passeport' },
  { value: 'RCCM', label: 'RCCM (entreprise)' },
  { value: 'Autre', label: 'Autre' },
];

export default function NewClientPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isPersonneMorale, setIsPersonneMorale] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ClientInsert>({
    defaultValues: { pays: 'Gabon', status: 'prospect', est_personne_morale: false },
  });

  const onSubmit = async (data: ClientInsert) => {
    setLoading(true);
    setServerError('');
    try {
      const client = await createClient({ ...data, est_personne_morale: isPersonneMorale });
      navigate(`/clients/${client.id}`);
    } catch (err: any) {
      setServerError(err.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nouveau client</h1>
          <p className="text-sm text-gray-500">Renseignez les informations du client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Type */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Type de client</h2>
          <div className="flex gap-3">
            {[
              { value: false, label: '👤 Personne physique' },
              { value: true,  label: '🏢 Personne morale'  },
            ].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setIsPersonneMorale(opt.value)}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  isPersonneMorale === opt.value
                    ? 'border-[#00C875] bg-[#00C875]/10 text-[#00A35E]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Identité */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Identité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isPersonneMorale ? (
              <div className="sm:col-span-2">
                <Input
                  label="Raison sociale *"
                  placeholder="Ex : SARL MonEntreprise"
                  {...register('raison_sociale', { required: isPersonneMorale })}
                  error={errors.raison_sociale ? 'Requis' : undefined}
                />
              </div>
            ) : (
              <>
                <Input
                  label="Prénom"
                  placeholder="Jean"
                  {...register('prenom')}
                />
                <Input
                  label="Nom *"
                  placeholder="Moussavou"
                  {...register('nom', { required: !isPersonneMorale })}
                  error={errors.nom ? 'Requis' : undefined}
                />
              </>
            )}
            {!isPersonneMorale && (
              <Input
                label="Date de naissance"
                type="date"
                {...register('date_naissance')}
              />
            )}
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              placeholder="+241 06 000 000"
              {...register('telephone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="jean@example.com"
              {...register('email')}
            />
            <Input
              label="Adresse"
              placeholder="Quartier, rue…"
              {...register('adresse')}
            />
            <Input
              label="Ville"
              placeholder="Libreville"
              {...register('ville')}
            />
            <Select
              label="Pays"
              options={PAYS_OPTIONS}
              {...register('pays')}
            />
          </div>
        </Card>

        {/* Pièce d'identité */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Pièce d'identité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type de pièce"
              options={PIECE_OPTIONS}
              {...register('type_piece')}
            />
            <Input
              label="Numéro"
              placeholder="Ex : 1234567"
              {...register('numero_piece')}
            />
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes internes</h2>
          <textarea
            placeholder="Informations complémentaires…"
            rows={3}
            {...register('notes')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent resize-none"
          />
        </Card>

        {serverError && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{serverError}</p>
        )}

        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer le client
          </Button>
        </div>
      </form>
    </div>
  );
}
