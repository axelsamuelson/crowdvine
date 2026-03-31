-- Seed Operations module – CrowdVine Q1 2026
-- Person 1: cdc144b5-a8d5-48a3-a28a-03d76cfef4f9
-- Person 2: 8aeec114-78a8-47b5-b535-12b355964933
--
-- För att ta bort all denna data: kör scripts/cleanup-seed-operations.sql

-- Säkerställ idempotens — kan köras flera gånger
DELETE FROM admin_tasks        WHERE id::text LIKE 'd2000000%';
DELETE FROM admin_projects     WHERE id::text LIKE 'c2000000%';
DELETE FROM admin_key_results  WHERE id::text LIKE 'b2000000%';
DELETE FROM admin_objectives   WHERE id::text LIKE 'a2000000%';
DELETE FROM admin_tasks        WHERE id::text LIKE 'd1000000%';
DELETE FROM admin_projects     WHERE id::text LIKE 'c1000000%';
DELETE FROM admin_key_results  WHERE id::text LIKE 'b1000000%';
DELETE FROM admin_objectives   WHERE id::text LIKE 'a1000000%';

-- ---------------------------------------------------------------------------
-- 1. admin_objectives
-- ---------------------------------------------------------------------------
INSERT INTO admin_objectives (id, title, description, period, owner_id, status, strategy_area, progress_method)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Aktivera nya medlemmar till första beställning',
    'Nya medlemmar som registrerar sig ska uppleva tillräckligt värde för att lägga en reservation eller beställning inom 14 dagar.',
    'Q1 2026',
    'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9',
    'active',
    'Growth',
    'key_results'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Förbättra kvaliteten på menyextraktion',
    'Menyextraktionen är grunden för att vi ska kunna onboarda producers snabbt och erbjuda rätt viner.',
    'Q1 2026',
    '8aeec114-78a8-47b5-b535-12b355964933',
    'active',
    'Quality',
    'key_results'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Etablera skalbar producer onboarding',
    'Vi behöver kunna onboarda nya producers utan att det tar mer än 2 dagars manuellt arbete per producer.',
    'Q1 2026',
    'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9',
    'active',
    'Operations',
    'key_results'
  ),
  (
    'a2000000-0000-0000-0000-000000000001',
    'Öka konvertering från kundvagn till genomförd reservation',
    'Fler användare som lägger produkter i kundvagnen ska slutföra en reservation. Fokus på de steg där vi mäter drop-off: cart validation → checkout started → reservation completed.',
    'Q1 2026',
    'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9',
    'active',
    'Growth',
    'key_results'
  );

-- ---------------------------------------------------------------------------
-- 2. admin_key_results
-- owner_id = same as objective owner (Obj 1,3 → Person 1; Obj 2 → Person 2)
-- ---------------------------------------------------------------------------
INSERT INTO admin_key_results (id, objective_id, title, type, start_value, target_value, current_value, status, due_date, owner_id, sort_order)
VALUES
  -- Objective 1 (Person 1)
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Andel nya medlemmar som lägger reservation inom 14 dagar', 'numeric', 12, 40, 12, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Antal genomförda reservationer från medlemmar < 30 dagar gamla', 'numeric', 8, 60, 8, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 2),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Onboarding-e-postsekvens live och aktiv', 'binary', 0, 1, 0, 'active', '2026-01-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 3),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Genomsnittlig tid från registrering till första reservation (dagar)', 'numeric', 21, 7, 21, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 4),
  -- Objective 2 (Person 2)
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Strukturell extraktionsprecision (%)', 'numeric', 74, 92, 74, 'active', '2026-03-31', '8aeec114-78a8-47b5-b535-12b355964933', 5),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Manuellt QA-flöde för PDF-uppladdningar live', 'binary', 0, 1, 0, 'active', '2026-02-15', '8aeec114-78a8-47b5-b535-12b355964933', 6),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'Genomsnittlig QA-tid per dokument (minuter)', 'numeric', 20, 5, 20, 'active', '2026-03-31', '8aeec114-78a8-47b5-b535-12b355964933', 7),
  -- Objective 3 (Person 1)
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Antal live producers på plattformen', 'numeric', 4, 15, 4, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 8),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'Onboarding-tid per producer (dagar manuellt arbete)', 'numeric', 5, 2, 5, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 9),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'Onboarding-checklist och template byggt i Operations', 'binary', 0, 1, 0, 'active', '2026-01-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 10),
  -- Objective 4 – Konvertering (Person 1)
  ('b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Andel Added to Cart som når Cart Validated (%)', 'numeric', 60, 85, 60, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 11),
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Andel Checkout Started som når Reservation Completed (%)', 'numeric', 40, 65, 40, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 12),
  ('b2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Antal genomförda reservationer per månad', 'numeric', 15, 40, 15, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 13),
  ('b2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'Andel som åtgärdar cart validation och når cart_validated inom 7 dagar (%)', 'numeric', 20, 50, 20, 'active', '2026-03-31', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 14);

-- ---------------------------------------------------------------------------
-- 3. admin_projects
-- Varannan owner: P1→Person 1, P2→Person 2, P3→Person 1, P4→Person 2, P5→Person 1, P6→Person 2, P7→Person 1
-- ---------------------------------------------------------------------------
INSERT INTO admin_projects (id, name, objective_id, key_result_id, owner_id, status, priority, due_date)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Onboarding e-postsekvens', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'critical', '2026-01-31'),
  ('c1000000-0000-0000-0000-000000000002', 'Reservationsflöde UX-förbättring', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', 'active', 'high', '2026-02-28'),
  ('c1000000-0000-0000-0000-000000000003', 'Välkomst- och aktiveringsinnehåll', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'medium', '2026-02-15'),
  ('c1000000-0000-0000-0000-000000000004', 'Menyextraktion V2', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', '8aeec114-78a8-47b5-b535-12b355964933', 'active', 'high', '2026-03-15'),
  ('c1000000-0000-0000-0000-000000000005', 'Manuellt QA-flöde för extraktioner', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'critical', '2026-02-15'),
  ('c1000000-0000-0000-0000-000000000006', 'Producer onboarding workflow', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000010', '8aeec114-78a8-47b5-b535-12b355964933', 'active', 'high', '2026-01-31'),
  ('c1000000-0000-0000-0000-000000000007', 'Producer pipeline Q1', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000008', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'high', '2026-03-31'),
  -- Objective 4 – Konvertering: varannan owner P1, P2, P1, P2
  ('c2000000-0000-0000-0000-000000000001', 'Cart validation – tydlighet och flöde', 'a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'high', '2026-02-28'),
  ('c2000000-0000-0000-0000-000000000002', 'Checkout – förenkling och tillit', 'a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', '8aeec114-78a8-47b5-b535-12b355964933', 'active', 'high', '2026-03-15'),
  ('c2000000-0000-0000-0000-000000000003', 'Funnel-analys och A/B-baserade beslut', 'a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'active', 'medium', '2026-02-28'),
  ('c2000000-0000-0000-0000-000000000004', 'Första-touch – så fungerar det', 'a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', 'active', 'medium', '2026-02-15');

-- ---------------------------------------------------------------------------
-- 4. admin_tasks
-- Per project: odd task index → Person 1, even → Person 2. created_by = assigned_to.
-- ---------------------------------------------------------------------------
INSERT INTO admin_tasks (id, title, project_id, objective_id, assigned_to, created_by, status, priority, task_type, due_date)
VALUES
  -- Project 1 (Onboarding e-post): 6 tasks — 1,3,5 P1; 2,4,6 P2
  ('d1000000-0000-0000-0000-000000000001', 'Skriv kopia för dag 0-mail', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'high', 'content', '2026-01-20'),
  ('d1000000-0000-0000-0000-000000000002', 'Skriv kopia för dag 2-mail', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'content', '2026-01-22'),
  ('d1000000-0000-0000-0000-000000000003', 'Skriv kopia för dag 7-mail', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'content', '2026-01-24'),
  ('d1000000-0000-0000-0000-000000000004', 'Skriv kopia för dag 14-mail', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'content', '2026-01-26'),
  ('d1000000-0000-0000-0000-000000000005', 'Sätt upp e-postsekvens i email-service', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'critical', 'feature', '2026-01-28'),
  ('d1000000-0000-0000-0000-000000000006', 'Testa sekvensen end-to-end', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'ops', '2026-01-30'),
  -- Project 2 (Reservationsflöde UX): 4 tasks — 7,9 P1; 8,10 P2
  ('d1000000-0000-0000-0000-000000000007', 'Kartlägg reservationsflöde', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'in_progress', 'high', 'ops', '2026-01-18'),
  ('d1000000-0000-0000-0000-000000000008', 'Förbättra mobilvy för wine box-lista', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'feature', '2026-02-07'),
  ('d1000000-0000-0000-0000-000000000009', 'Förtydliga pallet-val i bokningsflödet', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'feature', '2026-02-14'),
  ('d1000000-0000-0000-0000-000000000010', 'Lägg till bekräftelsesida', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'feature', '2026-02-21'),
  -- Project 3 (Välkomstinnehåll): 2 tasks — 11 P1; 12 P2
  ('d1000000-0000-0000-0000-000000000011', 'Skriv hur-det-fungerar-sida', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'content', '2026-02-01'),
  ('d1000000-0000-0000-0000-000000000012', 'Lägg till välkomstbanner', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'feature', '2026-02-10'),
  -- Project 4 (Menyextraktion V2): 4 tasks — 13,15 P1; 14,16 P2
  ('d1000000-0000-0000-0000-000000000013', 'Analysera 20 senaste misslyckade', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'in_progress', 'high', 'data', '2026-01-17'),
  ('d1000000-0000-0000-0000-000000000014', 'Förbättra hantering av flersidiga PDF', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'feature', '2026-02-01'),
  ('d1000000-0000-0000-0000-000000000015', 'Stöd för priser med komma', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'bug', '2026-01-24'),
  ('d1000000-0000-0000-0000-000000000016', 'Bygg testsvit för extraktionsscenarier', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'feature', '2026-02-15'),
  -- Project 5 (Manuellt QA-flöde): 4 tasks — 17,19 P1; 18,20 P2
  ('d1000000-0000-0000-0000-000000000017', 'Designa QA-gränssnittet', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'done', 'high', 'ops', '2026-01-10'),
  ('d1000000-0000-0000-0000-000000000018', 'Bygg QA-gränssnitt i admin', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'in_progress', 'critical', 'feature', '2026-01-31'),
  ('d1000000-0000-0000-0000-000000000019', 'Lägg till Godkänn dokument-knapp', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'high', 'feature', '2026-02-07'),
  ('d1000000-0000-0000-0000-000000000020', 'Testa QA-flödet med verkligt dokument', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'ops', '2026-02-12'),
  -- Project 6 (Onboarding workflow): 3 tasks — 21,23 P1; 22 P2
  ('d1000000-0000-0000-0000-000000000021', 'Dokumentera nuvarande onboarding-steg', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'done', 'high', 'ops', '2026-01-10'),
  ('d1000000-0000-0000-0000-000000000022', 'Skapa onboarding-checklist som template', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'ops', '2026-01-25'),
  ('d1000000-0000-0000-0000-000000000023', 'Skriv välkomstmail-template', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'content', '2026-01-28'),
  -- Project 7 (Producer pipeline): 3 tasks — 24,26 P1; 25 P2
  ('d1000000-0000-0000-0000-000000000024', 'Identifiera 20 potentiella producers', 'c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'in_progress', 'high', 'ops', '2026-01-20'),
  ('d1000000-0000-0000-0000-000000000025', 'Skicka first outreach till 10 producers', 'c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'ops', '2026-01-28'),
  ('d1000000-0000-0000-0000-000000000026', 'Skapa one-pager för producer outreach', 'c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'content', '2026-01-22'),
  -- Objective 4 – Konvertering: Project A (Cart validation) 4 tasks
  ('d2000000-0000-0000-0000-000000000001', 'Kartlägga var användare får första varningen (cart vs checkout)', 'c2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'high', 'ops', '2026-01-25'),
  ('d2000000-0000-0000-0000-000000000002', 'Skriva om meddelanden i cart-validation-display och checkout', 'c2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'content', '2026-02-07'),
  ('d2000000-0000-0000-0000-000000000003', 'Lägg till info-text på producer/group-sida om 6-flaskorskrav', 'c2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'feature', '2026-02-14'),
  ('d2000000-0000-0000-0000-000000000004', 'Logga cart_validation_failed och mät återkomst till cart_validated', 'c2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'data', '2026-02-21'),
  -- Project B (Checkout) 4 tasks
  ('d2000000-0000-0000-0000-000000000005', 'Kartlägga checkout-steg och dokumentera drop-off', 'c2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'high', 'ops', '2026-01-22'),
  ('d2000000-0000-0000-0000-000000000006', 'Förbättra zone-loading och feedback', 'c2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'high', 'feature', '2026-02-15'),
  ('d2000000-0000-0000-0000-000000000007', 'Förenkla eller förtydliga pallet-val', 'c2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'feature', '2026-02-28'),
  ('d2000000-0000-0000-0000-000000000008', 'Säkerställ tydlig bekräftelse på success-sida', 'c2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'feature', '2026-02-21'),
  -- Project C (Funnel-analys) 2 tasks
  ('d2000000-0000-0000-0000-000000000009', 'Bygg conversion rate per step-vy i admin', 'c2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'high', 'feature', '2026-02-15'),
  ('d2000000-0000-0000-0000-000000000010', 'Export av användare som stoppade vid Checkout started', 'c2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'data', '2026-02-28'),
  -- Project D (Första-touch) 2 tasks
  ('d2000000-0000-0000-0000-000000000011', 'Skriva/uppdatera Hur det fungerar-sida', 'c2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9', 'todo', 'medium', 'content', '2026-02-10'),
  ('d2000000-0000-0000-0000-000000000012', 'Lägg till tooltips eller banners på shop/checkout', 'c2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', '8aeec114-78a8-47b5-b535-12b355964933', '8aeec114-78a8-47b5-b535-12b355964933', 'todo', 'medium', 'feature', '2026-02-15');

-- Set completed_at for done tasks (17, 21)
UPDATE admin_tasks SET completed_at = '2026-01-10' WHERE id IN ('d1000000-0000-0000-0000-000000000017', 'd1000000-0000-0000-0000-000000000021');

-- ---------------------------------------------------------------------------
-- Verifiering
-- ---------------------------------------------------------------------------
SELECT
  o.title                        AS objective,
  o.owner_id                     AS objective_owner,
  COUNT(DISTINCT kr.id)          AS key_results,
  COUNT(DISTINCT p.id)           AS projects,
  COUNT(DISTINCT t.id)           AS tasks
FROM admin_objectives o
LEFT JOIN admin_key_results kr ON kr.objective_id = o.id
LEFT JOIN admin_projects p     ON p.objective_id  = o.id
LEFT JOIN admin_tasks t        ON t.objective_id  = o.id
WHERE o.period = 'Q1 2026'
GROUP BY o.id, o.title, o.owner_id
ORDER BY o.title;
