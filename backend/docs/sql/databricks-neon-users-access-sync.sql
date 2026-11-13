-- Sync Neon-defined users into Databricks users/customer_access/local_vin_access.
-- Run in Databricks SQL Warehouse.
-- Assumes target schema already contains: users, customer_access, local_vin_access.
--
-- Update catalog/schema before running:
--   USE CATALOG gadp_scratch;
--   USE SCHEMA marketplace_customer_access;

-- 1) Upsert Neon-defined users (from current app_user seed identities).
MERGE INTO users AS tgt
USING (
  SELECT * FROM VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Alice Patel',  'alice.patel@example.com',  CAST(NULL AS STRING),                           'admin',    '["dashboard:view","customers:manage","vehicles:manage","users:manage"]', 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Morgan Lee',   'morgan.lee@example.com',   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',      'sysadmin', '["dashboard:view","customers:manage","vehicles:view","users:manage"]',  'active'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'Taylor Chen',  'taylor.chen@example.com',   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',      'user',     '["dashboard:view","customers:view"]',                                    'active')
) AS src(user_id, name, email, manager_user_id, role, permissions, status)
ON tgt.user_id = src.user_id
WHEN MATCHED THEN UPDATE SET
  tgt.name = src.name,
  tgt.email = src.email,
  tgt.manager_user_id = src.manager_user_id,
  tgt.role = src.role,
  tgt.permissions = src.permissions,
  tgt.status = src.status,
  tgt.updated_at = current_timestamp()
WHEN NOT MATCHED THEN INSERT (
  user_id,
  name,
  email,
  manager_user_id,
  role,
  permissions,
  status,
  last_login,
  is_active,
  created_at,
  updated_at
) VALUES (
  src.user_id,
  src.name,
  src.email,
  src.manager_user_id,
  src.role,
  src.permissions,
  src.status,
  NULL,
  true,
  current_timestamp(),
  current_timestamp()
);

-- 2) Upsert customer access for Neon-defined users.
MERGE INTO customer_access AS tgt
USING (
  SELECT * FROM VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000124', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000208', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000311', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000415', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000509', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000622', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000714', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CUST-000801', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),

    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'CUST-000124', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'CUST-000208', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'CUST-000311', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'CUST-000415', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),

    ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'CUST-000124', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'CUST-000208', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2')
) AS src(user_id, customer_id, granted_by)
ON tgt.user_id = src.user_id AND tgt.customer_id = src.customer_id
WHEN MATCHED THEN UPDATE SET
  tgt.granted_by = src.granted_by
WHEN NOT MATCHED THEN INSERT (user_id, customer_id, granted_by)
VALUES (src.user_id, src.customer_id, src.granted_by);

-- 3) Upsert local VIN access rows assigned to Neon-defined users.
-- pendingCustomerID is stored as stringified JSON in this table shape.
MERGE INTO local_vin_access AS tgt
USING (
  SELECT * FROM VALUES
    ('NEON-LV-0001', 'CUST-000124', NULL,                                             true,  '1HGCM82633A764219', 'NEON1', 'Jeep',      'Grand Cherokee', '2024', timestamp('2026-11-13T00:00:00Z'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('NEON-LV-0002', 'CUST-000208', '["87d5a40a-3a31-4d37-bd70-73fd5de7ccf7"]',      false, '1FTFW1E50NFA55217', 'NEON2', 'Ram',       '1500',            '2022', timestamp('2026-11-13T00:05:00Z'), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'),
    ('NEON-LV-0003', 'CUST-000311', NULL,                                             true,  'WVWZZZ1JZXW873541', 'NEON3', 'Dodge',     'Durango',         '2023', timestamp('2026-11-13T00:10:00Z'), 'cccccccc-cccc-cccc-cccc-ccccccccccc3'),
    ('NEON-LV-0004', 'CUST-000415', '["d3cc2a41-8776-4ffc-ae8b-6f16f03a9674"]',      false, '2C3KA53G76H998234', 'NEON4', 'Chrysler',  'Pacifica',        '2021', timestamp('2026-11-13T00:15:00Z'), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2')
) AS src(vehicleId, customerID, pendingCustomerID, testvehicle, vin, name, make, model, year, timestamp, uploaderUserID)
ON tgt.vehicleId = src.vehicleId
WHEN MATCHED THEN UPDATE SET
  tgt.customerID = src.customerID,
  tgt.pendingCustomerID = src.pendingCustomerID,
  tgt.testvehicle = src.testvehicle,
  tgt.vin = src.vin,
  tgt.name = src.name,
  tgt.make = src.make,
  tgt.model = src.model,
  tgt.year = src.year,
  tgt.timestamp = src.timestamp,
  tgt.uploaderUserID = src.uploaderUserID
WHEN NOT MATCHED THEN INSERT (
  vehicleId,
  customerID,
  pendingCustomerID,
  testvehicle,
  vin,
  name,
  make,
  model,
  year,
  timestamp,
  uploaderUserID
) VALUES (
  src.vehicleId,
  src.customerID,
  src.pendingCustomerID,
  src.testvehicle,
  src.vin,
  src.name,
  src.make,
  src.model,
  src.year,
  src.timestamp,
  src.uploaderUserID
);

-- Optional checks:
-- SELECT user_id, name, role, status FROM users WHERE user_id LIKE '%-%' ORDER BY user_id;
-- SELECT user_id, customer_id, granted_by FROM customer_access WHERE user_id LIKE '%-%' ORDER BY user_id, customer_id;
-- SELECT vehicleId, customerID, uploaderUserID FROM local_vin_access WHERE vehicleId LIKE 'NEON-%' ORDER BY vehicleId;
