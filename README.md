# AssurZen ERP

ERP assurance multi-branches, construit avec **React + TypeScript + Supabase + Tailwind CSS**.

---

## 🏗️ Architecture

```
assurzen-erp/
├── supabase/
│   └── migrations/
│       └── 001_init_schema.sql     ← Schéma complet + RLS + seed
├── src/
│   ├── types/
│   │   └── index.ts                ← Types TypeScript (miroir du schéma)
│   ├── lib/
│   │   ├── supabase.ts             ← Client Supabase + helpers
│   │   ├── clients.service.ts      ← CRUD clients + stats
│   │   └── contrats.service.ts     ← CRUD contrats + stats
│   ├── hooks/
│   │   └── useAuth.ts              ← Auth hook (profil + rôle)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         ← Navigation latérale (role-aware)
│   │   │   └── AppLayout.tsx       ← Wrapper principal
│   │   └── ui/
│   │       └── index.tsx           ← Badge, Button, Card, Input, StatCard…
│   ├── pages/
│   │   ├── LoginPage.tsx           ← Authentification
│   │   ├── DashboardPage.tsx       ← KPIs + accès rapides
│   │   ├── ClientsPage.tsx         ← Liste clients (search + filtre + pagination)
│   │   ├── ClientDetailPage.tsx    ← Fiche client + contrats liés
│   │   ├── NewClientPage.tsx       ← Formulaire création client
│   │   └── ContratsPage.tsx        ← Liste contrats (search + filtre + pagination)
│   ├── App.tsx                     ← Routeur + guards
│   ├── main.tsx                    ← Entrée React
│   └── index.css                   ← Tailwind + fonts
├── .env.example                    ← Variables d'environnement
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 Démarrage

### 1. Prérequis
- Node.js 18+
- Un projet [Supabase](https://supabase.com) créé

### 2. Installation

```bash
cd assurzen-erp
npm install
```

### 3. Variables d'environnement

```bash
cp .env.example .env
# Éditez .env avec vos clés Supabase
```

### 4. Base de données

Dans Supabase → SQL Editor, exécutez :

```sql
-- Copiez-collez le contenu de supabase/migrations/001_init_schema.sql
```

### 5. Créer un utilisateur admin

Dans Supabase → Authentication → Users → Add user, puis dans SQL Editor :

```sql
INSERT INTO profiles (id, role, nom, prenom, email)
VALUES (
  '<UUID_DE_L_UTILISATEUR>',
  'admin',
  'Admin',
  'AssurZen',
  'admin@assurzen.ga'
);
```

### 6. Lancer

```bash
npm run dev
# → http://localhost:5173
```

---

## 🗄️ Modèle de données

| Table       | Description                              |
|-------------|------------------------------------------|
| `profiles`  | Utilisateurs ERP (agents, courtiers, admins) |
| `clients`   | Portefeuille clients (physiques + moraux)|
| `produits`  | Catalogue produits d'assurance           |
| `contrats`  | Contrats émis (JSONB flexible par branche)|
| `avenants`  | Modifications contrat                    |
| `quittances`| Primes et paiements                      |
| `sinistres` | Déclarations et suivi                    |

---

## 🔐 Rôles et permissions

| Rôle      | Périmètre                        |
|-----------|----------------------------------|
| `admin`   | Accès total                      |
| `agent`   | Ses propres clients et contrats  |
| `courtier`| Ses propres clients et contrats  |

---

## 🗺️ Roadmap

### Phase 1 — Clients & Contrats ✅
- [x] Schéma Supabase complet
- [x] Auth + rôles
- [x] Dashboard avec KPIs
- [x] Liste clients (search, filtres, pagination)
- [x] Fiche client
- [x] Formulaire création client
- [x] Liste contrats

### Phase 2 — Contrats multi-branches ✅
- [x] Formulaire contrat multi-étapes (5 steps)
- [x] Sélecteur de branche visuel (Auto, MRH, Santé, Vie, Autre)
- [x] Formulaire objet assuré dynamique par branche
- [x] Sélection garanties par branche avec cases pré-cochées
- [x] Récapitulatif live dans la sidebar
- [x] Auto-calcul prime mensuelle
- [x] Fiche contrat : progression période, objet, garanties, quittances, sinistres
- [x] Activation contrat (brouillon → actif)

### Phase 3 — À construire
- [ ] Génération quittances automatique (trigger ou edge function)
- [ ] Encaissement quittance (modal paiement + mode Mobile Money)
- [ ] Déclaration sinistre (formulaire + upload photos)
- [ ] Workflow sinistre (instruction → expertise → règlement)
- [ ] Tableau de bord paiements (en retard, à venir)
- [ ] Export PDF (attestation, quittance, contrat)

### Phase 3 — Avancé
- [ ] Export PDF (contrat, quittance, attestation)
- [ ] Notifications (échéances, sinistres)
- [ ] Portail client self-service
- [ ] Dashboard courtier
- [ ] Reporting direction

---

## Phase 3 complétée — Quittances & Paiements ✅

- [x] Trigger SQL activation → génération auto quittances mensuelles
- [x] `generer_quittances_contrat()` — régénération idempotente
- [x] `encaisser_quittance()` — atomique avec validation
- [x] `maj_quittances_en_retard()` — cron quotidien
- [x] Vue `v_quittances_dashboard` — jointures optimisées
- [x] Edge Function `generer-quittances`
- [x] Edge Function `encaisser-quittance` (auth + mode paiement)
- [x] Page Quittances — KPIs + liste colorée (retard/urgent) + pagination
- [x] Modal Encaissement 3 étapes (mode / détails / confirmation)
- [x] Bouton régénération depuis la fiche contrat

## Phase 4 — Prochaines étapes
- [ ] Déclaration sinistre + upload photos (Supabase Storage)
- [ ] Workflow sinistre (instruction → expertise → règlement)
- [ ] Export PDF (attestation, quittance)
- [ ] Notifications (échéances J-15, sinistres)
