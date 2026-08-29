# AssurZen ERP — Déploiement Edge Functions & migrations

## Prérequis

```bash
npm install -g supabase
supabase login
supabase link --project-ref <VOTRE_PROJECT_REF>
```

---

## 1. Migrations SQL (ordre strict)

Dans **Supabase → SQL Editor**, exécuter :

| # | Fichier | Contenu |
|---|---------|---------|
| 1 | `001_init_schema.sql` | Tables, RLS de base, seed produits |
| 2 | `002_quittances_triggers.sql` | Génération / encaissement / retards |
| 3 | `003_sinistres_storage.sql` | Sinistres, documents, bucket policies |
| 4 | `004_notifications.sql` | Table notifications + helpers |
| 5 | `005_analytics.sql` | Vues / RPC reporting |
| 6 | `fix_001_rls_profiles.sql` | Correctifs RLS profiles |

---

## 2. Bucket Storage

**Storage → New Bucket**

| Champ | Valeur |
|-------|--------|
| Name | `sinistres-documents` |
| Public | Non (URLs signées) |

Policies (si non déjà dans `003`) :

```sql
CREATE POLICY "read_auth" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'sinistres-documents');

CREATE POLICY "insert_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'sinistres-documents');

CREATE POLICY "delete_auth" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'sinistres-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
```

---

## 3. Secrets Edge Functions

```bash
supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set SUPABASE_ANON_KEY=eyJ...
# Optionnel — emails (notifications-cron)
# supabase secrets set RESEND_API_KEY=re_...
```

---

## 4. Déployer les fonctions

```bash
# Depuis la racine du projet
supabase functions deploy generer-quittances  --no-verify-jwt
supabase functions deploy encaisser-quittance --no-verify-jwt
supabase functions deploy sinistre-documents  --no-verify-jwt
supabase functions deploy generer-pdf         --no-verify-jwt
supabase functions deploy notifications-cron  --no-verify-jwt
```

> `--no-verify-jwt` laisse la vérification au code (`requireAuth()` dans `_shared/helpers.ts`).  
> Ne pas exposer les fonctions sans contrôle d’auth interne.

Vérification :

```bash
supabase functions list
```

---

## 5. Cron jobs (Dashboard SQL)

Activer l’extension **pg_cron**, puis :

```sql
-- Quittances en retard (chaque jour 07:00)
SELECT cron.schedule(
  'maj-retards-quotidien',
  '0 7 * * *',
  'SELECT maj_quittances_en_retard()'
);
```

Pour les **notifications** (échéances, sinistres bloqués…), planifier un appel HTTP vers l’Edge Function (via pg_net ou un scheduler externe) vers :

`POST /functions/v1/notifications-cron`  
avec un JWT service role ou un secret partagé selon votre implémentation.

Depuis l’UI, un admin peut aussi déclencher le cron via le bouton « Actualiser » de la cloche / page Notifications.

---

## 6. Test local (optionnel)

```bash
supabase start
supabase functions serve generer-pdf --env-file .env.local

curl -X POST http://localhost:54321/functions/v1/generer-pdf \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"attestation","id":"<CONTRAT_UUID>"}' \
  --output test_attestation.pdf
```

---

## Architecture fonctions

```
supabase/functions/
├── _shared/helpers.ts
├── generer-quittances/
├── encaisser-quittance/
├── sinistre-documents/
├── generer-pdf/          (attestation, quittance, ficheSinistre)
└── notifications-cron/   (alertes + templates email)
```
