-- Sync Databricks users/access into Neon and append management tree snapshot.
-- Run in Neon SQL editor on the target branch.
-- Idempotent: uses upsert patterns where possible.

BEGIN;

-- 1) Ensure support tables exist in Neon.
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    app_user_id UUID REFERENCES app_user (id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    manager_user_id TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_access (
    user_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    granted_by TEXT NOT NULL,
    PRIMARY KEY (user_id, customer_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    FOREIGN KEY (granted_by) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS local_vin_access (
    vehicle_id TEXT PRIMARY KEY,
    customer_id TEXT,
    pending_customer_id JSONB,
    testvehicle BOOLEAN,
    vin TEXT,
    name TEXT,
    make TEXT,
    model TEXT,
    year TEXT,
    event_timestamp TIMESTAMPTZ,
    uploader_user_id TEXT REFERENCES users (user_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS app_user_id UUID REFERENCES app_user (id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2) Databricks source data as inline CTEs.
WITH databricks_users AS (
    SELECT * FROM (
        VALUES
            ('USR-001','Alice Patel','alice@example.com',NULL,'admin','["dashboard:view","customers:manage","vehicles:manage","users:manage"]'::jsonb,'active'),
            ('USR-002','Bob Stone','bob@example.com','USR-001','sysadmin','["dashboard:view","customers:manage","vehicles:view","users:manage"]'::jsonb,'active'),
            ('USR-003','Carol Lee','carol@example.com','USR-001','user','["dashboard:view","customers:view"]'::jsonb,'active'),
            ('USR-004','David Raj','david@example.com','USR-002','user','["dashboard:view","vehicles:view"]'::jsonb,'pending'),
            ('USR-005','Eva Martinez','eva@example.com',NULL,'admin','["dashboard:view","customers:manage","vehicles:manage","users:manage"]'::jsonb,'active')
    ) AS v(user_id, name, email, manager_user_id, role, permissions, status)
),
org_context AS (
    SELECT id AS organization_id
    FROM organization
    ORDER BY created_at ASC
    LIMIT 1
),
app_user_seed AS (
    SELECT
        d.user_id,
        d.name,
        d.email,
        CASE
            WHEN d.status = 'active' THEN 'ACTIVE'
            WHEN d.status = 'inactive' THEN 'INACTIVE'
            ELSE 'SUSPENDED'
        END AS app_status,
        (
            substr(md5('databricks:' || d.user_id), 1, 8) || '-' ||
            substr(md5('databricks:' || d.user_id), 9, 4) || '-' ||
            substr(md5('databricks:' || d.user_id), 13, 4) || '-' ||
            substr(md5('databricks:' || d.user_id), 17, 4) || '-' ||
            substr(md5('databricks:' || d.user_id), 21, 12)
        )::uuid AS generated_user_uuid
    FROM databricks_users d
),
upsert_app_users AS (
    INSERT INTO app_user (id, organization_id, display_name, email, status)
    SELECT
        a.generated_user_uuid,
        o.organization_id,
        a.name,
        a.email,
        a.app_status
    FROM app_user_seed a
    CROSS JOIN org_context o
    ON CONFLICT (id) DO UPDATE
    SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id
)
INSERT INTO users (user_id, app_user_id, name, email, manager_user_id, role, permissions, status, updated_at)
SELECT
    d.user_id,
    a.generated_user_uuid,
    d.name,
    d.email,
    d.manager_user_id,
    d.role,
    d.permissions,
    d.status,
    now()
FROM databricks_users d
JOIN app_user_seed a
    ON a.user_id = d.user_id
ON CONFLICT (user_id) DO UPDATE
SET
    app_user_id = EXCLUDED.app_user_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    manager_user_id = EXCLUDED.manager_user_id,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    status = EXCLUDED.status,
    updated_at = now();

-- 3) Upsert customer access from Databricks records.
INSERT INTO customer_access (user_id, customer_id, granted_by)
SELECT * FROM (
    VALUES
        ('USR-001','CUST-000124','USR-001'),
        ('USR-001','CUST-000208','USR-001'),
        ('USR-001','CUST-000311','USR-001'),
        ('USR-001','CUST-000415','USR-001'),
        ('USR-001','CUST-000509','USR-001'),
        ('USR-001','CUST-000622','USR-001'),
        ('USR-001','CUST-000714','USR-001'),
        ('USR-001','CUST-000801','USR-001'),
        ('USR-002','CUST-000124','USR-001'),
        ('USR-002','CUST-000208','USR-001'),
        ('USR-002','CUST-000311','USR-001'),
        ('USR-002','CUST-000415','USR-001'),
        ('USR-003','CUST-000124','USR-002'),
        ('USR-003','CUST-000208','USR-002'),
        ('USR-004','CUST-000415','USR-002'),
        ('USR-004','CUST-000509','USR-002'),
        ('USR-005','CUST-000622','USR-005'),
        ('USR-005','CUST-000714','USR-005'),
        ('USR-005','CUST-000801','USR-005')
) AS src(user_id, customer_id, granted_by)
ON CONFLICT (user_id, customer_id) DO UPDATE
SET granted_by = EXCLUDED.granted_by;

-- 4) Upsert local VIN access from Databricks records.
INSERT INTO local_vin_access (
    vehicle_id,
    customer_id,
    pending_customer_id,
    testvehicle,
    vin,
    name,
    make,
    model,
    year,
    event_timestamp,
    uploader_user_id
)
SELECT * FROM (
    VALUES
        ('LV-0001','CUST-000124',NULL::jsonb,true,'1HGCM82633A764219','7JXK194','Jeep','Grand Cherokee','2024','2026-11-05T09:00:00Z'::timestamptz,'USR-001'),
        ('LV-0002','CUST-000208','["87d5a40a-3a31-4d37-bd70-73fd5de7ccf7"]'::jsonb,false,'1FTFW1E50NFA55217','8RMD552','Ram','1500','2022','2026-11-05T09:05:00Z'::timestamptz,'USR-002'),
        ('LV-0003','CUST-000311',NULL::jsonb,true,'WVWZZZ1JZXW873541','6TQP318','Dodge','Durango','2023','2026-11-05T09:10:00Z'::timestamptz,'USR-003'),
        ('LV-0004','CUST-000415','["d3cc2a41-8776-4ffc-ae8b-6f16f03a9674","4c870162-e5e1-4343-bf95-2b2f1f090f8d"]'::jsonb,false,'2C3KA53G76H998234','4NLE204','Chrysler','Pacifica','2021','2026-11-05T09:15:00Z'::timestamptz,'USR-002'),
        ('LV-0005','CUST-000509',NULL::jsonb,true,'5YJ3E1EA7KF662901','9VCK770','Alfa Romeo','Tonale','2024','2026-11-05T09:20:00Z'::timestamptz,'USR-005'),
        ('LV-0006','CUST-000622','["6efb78c7-478f-4eb5-9b2f-31a6bc5fd99b"]'::jsonb,false,'1N4AL3AP8EC587130','5BRX611','Ram','ProMaster','2022','2026-11-05T09:25:00Z'::timestamptz,'USR-004'),
        ('LV-0007','CUST-000714',NULL::jsonb,false,'WAUZZZ8V4GA784320','2YLP442','Dodge','Charger','2021','2026-11-05T09:30:00Z'::timestamptz,'USR-003'),
        ('LV-0008','CUST-000801','["e9e8b70c-ae58-4f6e-80f0-d19fdbcc1ad8"]'::jsonb,false,'3FA6P0HD1KR447892','1HSA905','Ram','1500','2022','2026-11-05T09:35:00Z'::timestamptz,'USR-001')
) AS src(
    vehicle_id,
    customer_id,
    pending_customer_id,
    testvehicle,
    vin,
    name,
    make,
    model,
    year,
    event_timestamp,
    uploader_user_id
)
ON CONFLICT (vehicle_id) DO UPDATE
SET
    customer_id = EXCLUDED.customer_id,
    pending_customer_id = EXCLUDED.pending_customer_id,
    testvehicle = EXCLUDED.testvehicle,
    vin = EXCLUDED.vin,
    name = EXCLUDED.name,
    make = EXCLUDED.make,
    model = EXCLUDED.model,
    year = EXCLUDED.year,
    event_timestamp = EXCLUDED.event_timestamp,
    uploader_user_id = EXCLUDED.uploader_user_id;

-- 5) Append management tree snapshot including Databricks users.
DO $$
DECLARE
    v_tree_id UUID;
    v_expected_version BIGINT;
    v_actor UUID;
    v_current_structure JSONB;
    v_db_mapping JSONB;
BEGIN
    SELECT tree_id, current_version
    INTO v_tree_id, v_expected_version
    FROM management_tree_head
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_tree_id IS NULL THEN
        RAISE EXCEPTION 'No management_tree_head row found.';
    END IF;

    -- Use USR-001 mapped app_user as actor.
    SELECT app_user_id
    INTO v_actor
    FROM users
    WHERE user_id = 'USR-001';

    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'Could not resolve actor user for USR-001.';
    END IF;

    SELECT s.structure
    INTO v_current_structure
    FROM management_tree_snapshot s
    WHERE s.tree_id = v_tree_id
      AND s.version = v_expected_version;

    IF v_current_structure IS NULL THEN
        RAISE EXCEPTION 'No snapshot found for tree % at version %', v_tree_id, v_expected_version;
    END IF;

    SELECT jsonb_object_agg(u.app_user_id::text, mgr.app_user_id::text)
    INTO v_db_mapping
    FROM users u
    LEFT JOIN users mgr
        ON mgr.user_id = u.manager_user_id
    WHERE u.app_user_id IS NOT NULL;

    IF v_db_mapping IS NULL THEN
        v_db_mapping := '{}'::jsonb;
    END IF;

    PERFORM publish_management_tree_snapshot(
        p_tree_id => v_tree_id,
        p_expected_version => v_expected_version,
        p_structure => jsonb_build_object(
            'managerByUser',
            coalesce(v_current_structure->'managerByUser', '{}'::jsonb) || v_db_mapping
        ),
        p_schema_version => 1,
        p_actor_user_id => v_actor,
        p_reason => 'Append Databricks users into management hierarchy mapping',
        p_restored_from_version => NULL
    );
END
$$;

COMMIT;

-- Optional validation queries.
-- SELECT user_id, app_user_id, role, status FROM users ORDER BY user_id;
-- SELECT * FROM customer_access ORDER BY user_id, customer_id;
-- SELECT tree_id, current_version FROM management_tree_head;
-- SELECT version, reason, created_at FROM management_tree_snapshot ORDER BY created_at DESC LIMIT 5;
