-- Ta bort ALL operations-data som skapades av scripts/seed-operations.sql
-- (fasta UUID-prefix: a1/a2 objectives, b1/b2 key results, c1/c2 projects, d1/d2 tasks)
--
-- Kör i Supabase → SQL Editor (eller psql mot databasen).
-- Ordning: tasks först (CASCADE rensar comments, activity, entity_links, dependencies),
--          sedan projects, key results, objectives.

BEGIN;

DELETE FROM admin_tasks        WHERE id::text ~ '^d[12]000000-';
DELETE FROM admin_projects     WHERE id::text ~ '^c[12]000000-';
DELETE FROM admin_key_results  WHERE id::text ~ '^b[12]000000-';
DELETE FROM admin_objectives   WHERE id::text ~ '^a[12]000000-';

COMMIT;

-- Verifiering (ska returnera 0 rader per tabell om allt är borta):
-- SELECT 'tasks' AS t, COUNT(*) FROM admin_tasks WHERE id::text ~ '^d[12]000000-'
-- UNION ALL SELECT 'projects', COUNT(*) FROM admin_projects WHERE id::text ~ '^c[12]000000-'
-- UNION ALL SELECT 'key_results', COUNT(*) FROM admin_key_results WHERE id::text ~ '^b[12]000000-'
-- UNION ALL SELECT 'objectives', COUNT(*) FROM admin_objectives WHERE id::text ~ '^a[12]000000-';
