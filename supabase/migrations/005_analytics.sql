-- ============================================================
-- AssurZen ERP — Migration 005
-- Analytics : vues reporting + données de démonstration
-- ============================================================

-- ── SEED : données de démonstration ──────────────────────────

-- Clients
INSERT INTO clients (id, code_client, nom, prenom, telephone, email, ville, pays, status, est_personne_morale) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'AZ-2024-00001', 'Moussavou', 'Jean-Pierre', '+241 06 11 22 33', 'jp.moussavou@gmail.com', 'Libreville', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000002', 'AZ-2024-00002', 'Ndong', 'Marie-Claire', '+241 07 44 55 66', 'mc.ndong@yahoo.fr', 'Libreville', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000003', 'AZ-2024-00003', 'Obame', 'Patrick', '+241 06 77 88 99', 'p.obame@gmail.com', 'Port-Gentil', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000004', 'AZ-2024-00004', 'Mba', 'Sophie', '+241 07 22 33 44', 's.mba@gmail.com', 'Libreville', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000005', 'AZ-2024-00005', 'Ella', 'Bruno', '+241 06 55 66 77', 'b.ella@hotmail.com', 'Franceville', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000006', 'AZ-2024-00006', 'Nze', 'Pauline', '+241 07 88 99 00', 'p.nze@gmail.com', 'Libreville', 'Gabon', 'prospect', false),
  ('c1000001-0000-0000-0000-000000000007', 'AZ-2024-00007', 'Bivigou', 'Christian', '+241 06 33 44 55', 'c.bivigou@gmail.com', 'Oyem', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000008', 'AZ-2025-00008', 'Societe GABTRANS', NULL, '+241 01 23 45 67', 'contact@gabtrans.ga', 'Libreville', 'Gabon', 'actif', true),
  ('c1000001-0000-0000-0000-000000000009', 'AZ-2025-00009', 'Mintsa', 'Elodie', '+241 07 11 22 33', 'e.mintsa@gmail.com', 'Libreville', 'Gabon', 'actif', false),
  ('c1000001-0000-0000-0000-000000000010', 'AZ-2025-00010', 'Biyoghe', 'Albert', '+241 06 44 55 66', 'a.biyoghe@gmail.com', 'Port-Gentil', 'Gabon', 'suspendu', false)
ON CONFLICT (id) DO NOTHING;

-- Contrats (sur 12 mois glissants)
INSERT INTO contrats (id, numero, client_id, produit_id, date_effet, date_echeance, prime_annuelle, franchise, devise, status, objet_assure, garanties) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'CTR-2024-00001',
   'c1000001-0000-0000-0000-000000000001',
   (SELECT id FROM produits WHERE code='AUTO-TR'),
   '2024-01-15', '2025-01-15', 120000, 50000, 'FCFA', 'actif',
   '{"marque":"Toyota","modele":"Corolla","immat":"GA-123-AB","annee":2020,"carburant":"essence","usage":"personnel"}',
   '{"rc":true,"vol":true,"incendie":true,"bris_glace":true,"assistance":true}'),

  ('f0000001-0000-0000-0000-000000000002', 'CTR-2024-00002',
   'c1000001-0000-0000-0000-000000000002',
   (SELECT id FROM produits WHERE code='MRH-STD'),
   '2024-02-01', '2025-02-01', 85000, 20000, 'FCFA', 'actif',
   '{"adresse":"Quartier Glass","ville":"Libreville","type_logement":"appartement","surface_m2":75,"valeur_mobilier":3000000}',
   '{"incendie":true,"degats_eaux":true,"vol":true,"rc_locataire":true}'),

  ('f0000001-0000-0000-0000-000000000003', 'CTR-2024-00003',
   'c1000001-0000-0000-0000-000000000003',
   (SELECT id FROM produits WHERE code='AUTO-RC'),
   '2024-03-10', '2025-03-10', 45000, 0, 'FCFA', 'actif',
   '{"marque":"Peugeot","modele":"208","immat":"PG-456-CD","annee":2019,"carburant":"essence","usage":"personnel"}',
   '{"rc":true,"defense":true}'),

  ('f0000001-0000-0000-0000-000000000004', 'CTR-2024-00004',
   'c1000001-0000-0000-0000-000000000004',
   (SELECT id FROM produits WHERE code='SANTE-IND'),
   '2024-04-01', '2025-04-01', 180000, 0, 'FCFA', 'actif',
   '{"assure_principal":"Sophie Mba","date_naissance":"1985-06-12","formule":"confort","regime":"famille","nb_beneficiaires":3}',
   '{"hospitalisation":true,"ambulatoire":true,"pharmacie":true,"maternite":true,"dentaire":true}'),

  ('f0000001-0000-0000-0000-000000000005', 'CTR-2024-00005',
   'c1000001-0000-0000-0000-000000000005',
   (SELECT id FROM produits WHERE code='AUTO-TR'),
   '2024-05-20', '2025-05-20', 135000, 75000, 'FCFA', 'actif',
   '{"marque":"Hyundai","modele":"Tucson","immat":"FC-789-EF","annee":2021,"carburant":"diesel","usage":"professionnel"}',
   '{"rc":true,"vol":true,"incendie":true,"bris_glace":true,"tierce_collision":true,"conducteur":true}'),

  ('f0000001-0000-0000-0000-000000000006', 'CTR-2024-00006',
   'c1000001-0000-0000-0000-000000000007',
   (SELECT id FROM produits WHERE code='VIE-TERM'),
   '2024-06-01', '2034-06-01', 96000, 0, 'FCFA', 'actif',
   '{"assure_nom":"Christian Bivigou","date_naissance":"1978-03-22","type_contrat":"temporaire_deces","capital":10000000,"duree_annees":10,"beneficiaire_1":"Epouse Bivigou","lien_beneficiaire_1":"Épouse"}',
   '{"deces":true,"invalidite_totale":true,"deces_accidentel":true}'),

  ('f0000001-0000-0000-0000-000000000007', 'CTR-2025-00007',
   'c1000001-0000-0000-0000-000000000008',
   (SELECT id FROM produits WHERE code='AUTO-TR'),
   '2025-01-05', '2026-01-05', 280000, 100000, 'FCFA', 'actif',
   '{"marque":"Toyota","modele":"Land Cruiser","immat":"LB-321-GH","annee":2022,"carburant":"diesel","usage":"professionnel"}',
   '{"rc":true,"vol":true,"incendie":true,"bris_glace":true,"assistance":true,"conducteur":true}'),

  ('f0000001-0000-0000-0000-000000000008', 'CTR-2025-00008',
   'c1000001-0000-0000-0000-000000000009',
   (SELECT id FROM produits WHERE code='MRH-STD'),
   '2025-02-15', '2026-02-15', 72000, 15000, 'FCFA', 'actif',
   '{"adresse":"Quartier Louis","ville":"Libreville","type_logement":"villa","surface_m2":120,"valeur_mobilier":5000000}',
   '{"incendie":true,"degats_eaux":true,"vol":true}'),

  ('f0000001-0000-0000-0000-000000000009', 'CTR-2025-00009',
   'c1000001-0000-0000-0000-000000000001',
   (SELECT id FROM produits WHERE code='SANTE-IND'),
   '2025-03-01', '2026-03-01', 145000, 0, 'FCFA', 'actif',
   '{"assure_principal":"Jean-Pierre Moussavou","date_naissance":"1975-09-05","formule":"standard","regime":"couple","nb_beneficiaires":2}',
   '{"hospitalisation":true,"ambulatoire":true,"pharmacie":true}'),

  ('f0000001-0000-0000-0000-000000000010', 'CTR-2024-00010',
   'c1000001-0000-0000-0000-000000000010',
   (SELECT id FROM produits WHERE code='AUTO-RC'),
   '2024-08-01', '2025-08-01', 42000, 0, 'FCFA', 'suspendu',
   '{"marque":"Renault","modele":"Clio","immat":"PG-654-IJ","annee":2018,"carburant":"essence","usage":"personnel"}',
   '{"rc":true}')
ON CONFLICT (id) DO NOTHING;

-- Quittances avec statuts variés (12 mois de données)
DO $$
DECLARE
  contrat RECORD;
  i INT;
  dt DATE;
  statut paiement_status;
  mode_p paiement_mode;
BEGIN
  FOR contrat IN SELECT id, prime_annuelle, date_effet, date_echeance FROM contrats LOOP
    FOR i IN 0..11 LOOP
      dt := contrat.date_effet + (i || ' months')::INTERVAL;
      EXIT WHEN dt >= contrat.date_echeance;

      -- Statut réaliste selon l'ancienneté
      IF dt < CURRENT_DATE - INTERVAL '1 month' THEN
        statut := 'payé';
        mode_p := (ARRAY['mobile_money','especes','virement','mobile_money','mobile_money'])[floor(random()*5+1)::INT];
      ELSIF dt < CURRENT_DATE THEN
        IF random() > 0.3 THEN statut := 'payé'; mode_p := 'mobile_money';
        ELSE statut := 'en_retard'; mode_p := NULL;
        END IF;
      ELSE
        statut := 'en_attente'; mode_p := NULL;
      END IF;

      INSERT INTO quittances (
        contrat_id, numero, periode_debut, periode_fin,
        montant, date_echeance, status,
        date_paiement, mode_paiement
      ) VALUES (
        contrat.id,
        gen_numero_quittance(),
        dt,
        dt + INTERVAL '1 month' - INTERVAL '1 day',
        ROUND(contrat.prime_annuelle / 12),
        dt + INTERVAL '15 days',
        statut,
        CASE WHEN statut = 'payé' THEN dt + (floor(random()*10))::INT ELSE NULL END,
        mode_p
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Sinistres
INSERT INTO sinistres (id, numero, contrat_id, date_sinistre, date_declaration, nature, description, lieu, montant_declare, montant_expertisé, montant_indemnise, status, expert_nom, date_cloture) VALUES
  ('s0000001-0000-0000-0000-000000000001', 'SIN-2024-00001',
   'f0000001-0000-0000-0000-000000000001',
   '2024-04-12', '2024-04-13', 'Collision / Accrochage',
   'Accrochage en sortie de parking au PK12. Dommages sur aile avant droite et pare-chocs.',
   'PK12, Libreville', 850000, 720000, 650000, 'réglé', 'Expert Auto Gabon', '2024-05-20'),

  ('s0000001-0000-0000-0000-000000000002', 'SIN-2024-00002',
   'f0000001-0000-0000-0000-000000000005',
   '2024-07-03', '2024-07-04', 'Vol du véhicule',
   'Véhicule dérobé la nuit devant le domicile. Dépôt de plainte effectué.',
   'Quartier Nzeng-Ayong, Franceville', 4500000, 4200000, 3800000, 'réglé', 'Cabinet Expertise BGFI', '2024-09-15'),

  ('s0000001-0000-0000-0000-000000000003', 'SIN-2024-00003',
   'f0000001-0000-0000-0000-000000000002',
   '2024-09-20', '2024-09-22', 'Dégâts des eaux',
   'Fuite importante provenant de l appartement du dessus. Dégâts sur plafond et mobilier salon.',
   'Quartier Glass, Libreville', 1200000, NULL, NULL, 'en_instruction', 'Expert Habitation Gabon', NULL),

  ('s0000001-0000-0000-0000-000000000004', 'SIN-2025-00004',
   'f0000001-0000-0000-0000-000000000007',
   '2025-02-10', '2025-02-11', 'Bris de glace',
   'Pare-brise fissuré suite à projection de gravillon sur l autoroute.',
   'Route nationale 1, km 45', 180000, 165000, 165000, 'réglé', NULL, '2025-02-28'),

  ('s0000001-0000-0000-0000-000000000005', 'SIN-2025-00005',
   'f0000001-0000-0000-0000-000000000003',
   '2025-04-05', '2025-04-06', 'Collision / Accrochage',
   'Collision avec un taxi en centre-ville. Responsabilité partagée selon le constat.',
   'Carrefour du Stade, Libreville', 320000, NULL, NULL, 'ouvert', NULL, NULL),

  ('s0000001-0000-0000-0000-000000000006', 'SIN-2025-00006',
   'f0000001-0000-0000-0000-000000000004',
   '2025-05-18', '2025-05-19', 'Hospitalisation',
   'Hospitalisation d urgence suite à appendicite. 5 jours en clinique La Croix du Sud.',
   'Clinique La Croix du Sud, Libreville', 2100000, 1950000, 1560000, 'réglé', NULL, '2025-06-10')
ON CONFLICT (id) DO NOTHING;

-- ── VUES ANALYTICS ───────────────────────────────────────────

-- Vue : primes encaissées par mois (12 derniers mois)
CREATE OR REPLACE VIEW v_primes_par_mois AS
SELECT
  TO_CHAR(date_paiement, 'YYYY-MM') AS mois,
  TO_CHAR(date_paiement, 'Mon YYYY') AS mois_label,
  COUNT(*) AS nb_quittances,
  SUM(montant) AS total_encaisse,
  p.branche
FROM quittances q
JOIN contrats c ON c.id = q.contrat_id
JOIN produits p ON p.id = c.produit_id
WHERE q.status = 'payé'
  AND q.date_paiement >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(date_paiement, 'YYYY-MM'), TO_CHAR(date_paiement, 'Mon YYYY'), p.branche
ORDER BY mois;

-- Vue : portefeuille contrats par branche
CREATE OR REPLACE VIEW v_portefeuille_branches AS
SELECT
  p.branche,
  COUNT(c.id) AS nb_contrats,
  SUM(c.prime_annuelle) AS prime_totale,
  COUNT(c.id) FILTER (WHERE c.status = 'actif') AS contrats_actifs,
  COUNT(c.id) FILTER (WHERE c.status = 'expiré') AS contrats_expires,
  AVG(c.prime_annuelle) AS prime_moyenne
FROM contrats c
JOIN produits p ON p.id = c.produit_id
GROUP BY p.branche;

-- Vue : sinistralité par branche
CREATE OR REPLACE VIEW v_sinistralite AS
SELECT
  p.branche,
  COUNT(s.id) AS nb_sinistres,
  SUM(s.montant_declare) AS montant_declare_total,
  SUM(s.montant_indemnise) AS montant_indemnise_total,
  SUM(c.prime_annuelle) AS prime_totale_branche,
  ROUND(
    COALESCE(SUM(s.montant_indemnise), 0) /
    NULLIF(SUM(c.prime_annuelle), 0) * 100, 2
  ) AS taux_sinistralite,
  COUNT(s.id) FILTER (WHERE s.status IN ('ouvert','en_instruction')) AS sinistres_ouverts
FROM contrats c
JOIN produits p ON p.id = c.produit_id
LEFT JOIN sinistres s ON s.contrat_id = c.id
GROUP BY p.branche;

-- Vue : évolution clients par mois
CREATE OR REPLACE VIEW v_clients_par_mois AS
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS mois,
  TO_CHAR(created_at, 'Mon YYYY') AS mois_label,
  COUNT(*) AS nouveaux_clients,
  COUNT(*) FILTER (WHERE status = 'actif') AS clients_actifs
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
ORDER BY mois;

-- Vue : KPIs globaux direction
CREATE OR REPLACE VIEW v_kpis_direction AS
SELECT
  -- Clients
  (SELECT COUNT(*) FROM clients) AS total_clients,
  (SELECT COUNT(*) FROM clients WHERE status = 'actif') AS clients_actifs,
  (SELECT COUNT(*) FROM clients WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS nouveaux_ce_mois,
  -- Contrats
  (SELECT COUNT(*) FROM contrats) AS total_contrats,
  (SELECT COUNT(*) FROM contrats WHERE status = 'actif') AS contrats_actifs,
  (SELECT COALESCE(SUM(prime_annuelle),0) FROM contrats WHERE status = 'actif') AS masse_prime_annuelle,
  -- Quittances
  (SELECT COALESCE(SUM(montant),0) FROM quittances WHERE status = 'payé'
   AND date_paiement >= date_trunc('month', CURRENT_DATE)) AS encaisse_ce_mois,
  (SELECT COALESCE(SUM(montant),0) FROM quittances WHERE status = 'payé'
   AND date_paiement >= date_trunc('year', CURRENT_DATE)) AS encaisse_ytd,
  (SELECT COALESCE(SUM(montant),0) FROM quittances WHERE status IN ('en_attente','en_retard')) AS en_attente_total,
  (SELECT COUNT(*) FROM quittances WHERE status = 'en_retard') AS nb_retards,
  -- Sinistres
  (SELECT COUNT(*) FROM sinistres) AS total_sinistres,
  (SELECT COUNT(*) FROM sinistres WHERE status IN ('ouvert','en_instruction')) AS sinistres_ouverts,
  (SELECT COALESCE(SUM(montant_indemnise),0) FROM sinistres) AS total_indemnise;
