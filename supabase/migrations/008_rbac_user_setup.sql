-- RBAC User Setup Migration
-- Adds Innovation team to all 4 apps
-- Adds BI team to athena-monitor and validator-api
-- Created: 2026-01-21

-- 1A. Ensure athena-monitor app exists
INSERT INTO epcvip_apps (id, name, description) VALUES
  ('athena-monitor', 'Athena Usage Monitor', 'Monitor Athena query usage')
ON CONFLICT (id) DO NOTHING;

-- 1B. Add Innovation Team to All Apps
-- Team members: adam, bruno.r, george.p, kate.b, olga.p
-- Apps: tools-hub, ping-tree-compare, athena-monitor, validator-api
INSERT INTO epcvip_app_roles (app_id, user_email, role, created_by) VALUES
  -- adam (admin)
  ('tools-hub', 'adam@epcvip.com', 'admin', 'system'),
  ('ping-tree-compare', 'adam@epcvip.com', 'admin', 'system'),
  ('athena-monitor', 'adam@epcvip.com', 'admin', 'system'),
  ('validator-api', 'adam@epcvip.com', 'admin', 'system'),
  -- bruno.r
  ('tools-hub', 'bruno.r@epcvip.com', 'user', 'adam@epcvip.com'),
  ('ping-tree-compare', 'bruno.r@epcvip.com', 'user', 'adam@epcvip.com'),
  ('athena-monitor', 'bruno.r@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'bruno.r@epcvip.com', 'user', 'adam@epcvip.com'),
  -- george.p
  ('tools-hub', 'george.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('ping-tree-compare', 'george.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('athena-monitor', 'george.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'george.p@epcvip.com', 'user', 'adam@epcvip.com'),
  -- kate.b
  ('tools-hub', 'kate.b@epcvip.com', 'user', 'adam@epcvip.com'),
  ('ping-tree-compare', 'kate.b@epcvip.com', 'user', 'adam@epcvip.com'),
  ('athena-monitor', 'kate.b@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'kate.b@epcvip.com', 'user', 'adam@epcvip.com'),
  -- olga.p
  ('tools-hub', 'olga.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('ping-tree-compare', 'olga.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('athena-monitor', 'olga.p@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'olga.p@epcvip.com', 'user', 'adam@epcvip.com')
ON CONFLICT (app_id, user_email) DO UPDATE SET role = EXCLUDED.role;

-- 1C. Add BI Team to Athena Monitor & Reports Dashboard
-- Team members: cesar.s, samantha
-- Apps: athena-monitor, validator-api
INSERT INTO epcvip_app_roles (app_id, user_email, role, created_by) VALUES
  ('athena-monitor', 'cesar.s@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'cesar.s@epcvip.com', 'user', 'adam@epcvip.com'),
  ('athena-monitor', 'samantha@epcvip.com', 'user', 'adam@epcvip.com'),
  ('validator-api', 'samantha@epcvip.com', 'user', 'adam@epcvip.com')
ON CONFLICT (app_id, user_email) DO NOTHING;

-- Verification query (run after applying migration)
-- Expected: 24 rows (5 Innovation team x 4 apps + 2 BI team x 2 apps)
/*
SELECT
  ar.user_email,
  ar.app_id,
  a.name as app_name,
  ar.role
FROM epcvip_app_roles ar
JOIN epcvip_apps a ON ar.app_id = a.id
WHERE ar.user_email IN (
  'adam@epcvip.com', 'bruno.r@epcvip.com', 'george.p@epcvip.com',
  'kate.b@epcvip.com', 'olga.p@epcvip.com', 'cesar.s@epcvip.com',
  'samantha@epcvip.com'
)
ORDER BY ar.user_email, a.name;
*/
