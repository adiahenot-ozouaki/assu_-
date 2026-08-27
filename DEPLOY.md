# AssurZen ERP — Guide de déploiement des Edge Functions

## Prérequis

```bash
npm install -g supabase
supabase login
supabase link --project-ref <VOTRE_PROJECT_REF>
```

## 1. Créer le bucket Storage

Dans **Supabase Dashboard → Storage → New Bucket** :

| Champ   | Valeur                 |
|---------|------------------------|
| Name    | `sinistres-documents`  |
| Public  | ❌ Non (accès signé)   |

Puis dans **Storage → Policies**, ajouter pour `sinistres-documents` :

```sql
-- SELECT : utilisateurs authentifiés
CREATE POLICY "read_auth" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'sinistres-documents');

-- INSERT : utilisateurs authentifiés
CREATE POLICY "insert_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'sinistres-documents');

-- DELETE : auteur ou admin
CREATE POLICY "delete_auth" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'sinistres-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );
```

## 2. Variables d'environnement (secrets)

```bash
supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set SUPABASE_ANON_KEY=eyJ...
```

## 3. Déployer toutes les Edge Functions

```bash
# Depuis la racine du projet
supabase functions deploy generer-quittances   --no-verify-jwt
supabase functions deploy encaisser-quittance  --no-verify-jwt
supabase functions deploy sinistre-documents   --no-verify-jwt
supabase functions deploy generer-pdf          --no-verify-jwt
```

> **Note** : `--no-verify-jwt` laisse Supabase vérifier le JWT automatiquement.
> La vérification est faite dans chaque fonction via `requireAuth()`.

## 4. Appliquer les migrations SQL

Dans **Supabase Dashboard → SQL Editor**, exécuter dans l'ordre :

```
1. supabase/migrations/001_init_schema.sql
2. supabase/migrations/002_quittances_triggers.sql
3. supabase/migrations/003_sinistres_storage.sql
```

## 5. Vérifier les déploiements

```bash
supabase functions list
```

Résultat attendu :
```
┌─────────────────────────┬─────────┬────────────┐
│ Name                    │ Status  │ Version    │
├─────────────────────────┼─────────┼────────────┤
│ generer-quittances      │ ACTIVE  │ ...        │
│ encaisser-quittance     │ ACTIVE  │ ...        │
│ sinistre-documents      │ ACTIVE  │ ...        │
│ generer-pdf             │ ACTIVE  │ ...        │
└─────────────────────────┴─────────┴────────────┘
```

## 6. Tester localement (optionnel)

```bash
supabase start
supabase functions serve generer-pdf --env-file .env.local

# Test avec curl
curl -X POST http://localhost:54321/functions/v1/generer-pdf \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"attestation","id":"<CONTRAT_UUID>"}' \
  --output test_attestation.pdf
```

## 7. Activer pg_cron (mise à jour retards quotidienne)

Dans **Supabase Dashboard → Database → Extensions** → activer `pg_cron`.

Puis dans SQL Editor :

```sql
SELECT cron.schedule(
  'maj-retards-quotidien',
  '0 7 * * *',
  'SELECT maj_quittances_en_retard()'
);
```

## Architecture des Edge Functions

```
supabase/functions/
├── _shared/
│   └── helpers.ts              ← CORS, auth, json helpers
├── generer-quittances/
│   └── index.ts                ← Régénération manuelle quittances
├── encaisser-quittance/
│   └── index.ts                ← Enregistrement paiement
├── sinistre-documents/
│   └── index.ts                ← Upload/list/delete via Storage
└── generer-pdf/
    ├── index.ts                ← Router : attestation | quittance | sinistre
    ├── pdfHelpers.ts           ← Primitives pdf-lib (couleurs, layout, fonts)
    ├── attestation.ts          ← Template attestation d'assurance
    ├── quittance.ts            ← Template quittance de prime
    └── ficheSinistre.ts        ← Template fiche sinistre
```
