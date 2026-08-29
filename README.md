# AssurZen ERP

ERP assurance multi-branches (Gabon / FCFA) — **React 18 + TypeScript + Vite + Tailwind + Supabase**.

---

## Fonctionnalités

| Module | Contenu |
|--------|---------|
| **Auth** | Login, rôles admin / agent / courtier, session persistée |
| **Clients** | Liste, fiche, création (physique / morale) |
| **Contrats** | Wizard 5 étapes, branches Auto / MRH / Santé / Vie / Autre, avenants |
| **Quittances** | Génération auto, encaissement (Mobile Money, espèces…), retards |
| **Sinistres** | Déclaration multi-étapes, workflow, documents Storage |
| **PDF** | Attestation, quittance, fiche sinistre (Edge Function) |
| **Notifications** | Cloche temps réel + page `/notifications` |
| **Reporting** | KPIs direction (admin) |
| **Paramètres** | Produits, utilisateurs, agence (admin) |
| **UI** | Dark mode, responsive, design tokens sémantiques |

---

## Stack

- **Front** : React 18, TypeScript, Vite 5, Tailwind 3 (`darkMode: 'class'`), Recharts, React Hook Form, Lucide
- **Back** : Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)

---

## Démarrage

### Prérequis

- Node.js **18+**
- Projet [Supabase](https://supabase.com)

### Installation

```bash
git clone https://github.com/adiahenot-ozouaki/assu_-.git
cd assu_-
npm install
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
# → http://localhost:5173
```

### Base de données

Dans **SQL Editor**, exécuter **dans l’ordre** :

1. `supabase/migrations/001_init_schema.sql`
2. `supabase/migrations/002_quittances_triggers.sql`
3. `supabase/migrations/003_sinistres_storage.sql`
4. `supabase/migrations/004_notifications.sql`
5. `supabase/migrations/005_analytics.sql`
6. `supabase/migrations/fix_001_rls_profiles.sql`

Puis créer un user Auth et un profil `admin` (voir section ci-dessous).

### Edge Functions

Voir **[DEPLOY.md](./DEPLOY.md)** pour Storage, secrets et déploiements.

### Utilisateur admin

```sql
INSERT INTO profiles (id, role, nom, prenom, email)
VALUES (
  '<UUID_AUTH_USER>',
  'admin',
  'Admin',
  'AssurZen',
  'admin@assurzen.ga'
);
```

---

## Structure

```
src/
├── pages/           # Écrans métier
├── components/      # UI, layout, contrats, sinistres, pdf…
├── lib/             # Services Supabase
├── hooks/           # useAuth, useTheme
└── types/
supabase/
├── migrations/      # 001 → 005 + fix RLS
└── functions/       # generer-quittances, encaisser-quittance,
                     # sinistre-documents, generer-pdf, notifications-cron
```

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | `tsc` + build production |
| `npm run preview` | Preview du build |

> En cas d’erreur `Cannot find module 'recharts'` : `rm -rf node_modules && npm install`.

---

## Rôles

| Rôle | Accès |
|------|--------|
| `admin` | Total + Reporting + Paramètres |
| `agent` / `courtier` | Clients, contrats, sinistres, quittances (périmètre RLS) |

Les routes `/reporting` et `/parametres` sont protégées côté front (`AdminRoute`) **et** doivent l’être par RLS côté DB.

---

## Thème

- Toggle clair / sombre / système (localStorage)
- Tokens CSS : `--surface`, `--ink`, `--brand`, etc. mappés Tailwind (`bg-surface`, `text-ink`…)

---

## Roadmap (état réel)

- [x] Clients & auth
- [x] Contrats multi-branches + avenants
- [x] Quittances & encaissement
- [x] Sinistres + Storage + workflow
- [x] PDF (attestation, quittance, fiche)
- [x] Notifications + cron
- [x] Reporting analytics
- [x] Dark mode / responsive (cœur de l’app)
- [ ] Édition client (page dédiée)
- [ ] Dark mode complet (BranchForms, Paramètres, PhotoUploader)
- [ ] Portail client self-service
- [ ] Tests automatisés + CI
