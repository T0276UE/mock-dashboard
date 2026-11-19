-- Make Neon the source of truth for roles, customer grants, and local VIN data.

CREATE TABLE IF NOT EXISTS user_roles (
    userid UUID PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user'
);

UPDATE user_roles
SET role = 'user'
WHERE role IS NULL OR lower(btrim(role)) NOT IN ('user', 'admin');

UPDATE user_roles
SET role = lower(btrim(role));

ALTER TABLE user_roles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE user_roles ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_userid_fkey'
    ) THEN
        ALTER TABLE user_roles
            ADD CONSTRAINT user_roles_userid_fkey
            FOREIGN KEY (userid) REFERENCES app_user (id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_chk'
    ) THEN
        ALTER TABLE user_roles
            ADD CONSTRAINT user_roles_role_chk CHECK (role IN ('user', 'admin'));
    END IF;
END;
$$;

INSERT INTO user_roles (userid, role)
SELECT id, 'user'
FROM app_user
ON CONFLICT (userid) DO NOTHING;

CREATE TABLE IF NOT EXISTS customer_access (
    user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    granted_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, customer_id),
    CONSTRAINT customer_access_customer_id_chk CHECK (btrim(customer_id) <> '')
);

CREATE INDEX IF NOT EXISTS idx_customer_access_customer_id
    ON customer_access (customer_id);

CREATE TABLE IF NOT EXISTS local_vin_access (
    vehicle_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    pending_customer_id JSONB,
    test_vehicle BOOLEAN,
    vin TEXT NOT NULL,
    name TEXT,
    make TEXT,
    model TEXT,
    year TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    uploader_user_id UUID REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT local_vin_access_customer_id_chk CHECK (btrim(customer_id) <> ''),
    CONSTRAINT local_vin_access_vin_chk CHECK (btrim(vin) <> '')
);

CREATE INDEX IF NOT EXISTS idx_local_vin_access_customer_id
    ON local_vin_access (customer_id);

CREATE INDEX IF NOT EXISTS idx_local_vin_access_vin
    ON local_vin_access (vin);

-- Preserve the existing mock-dashboard fixtures while using Neon UUID identities.
WITH grants(email, customer_id, granted_by_email) AS (
    VALUES
        ('alice@example.com', 'CUST-000124', 'alice@example.com'),
        ('alice@example.com', 'CUST-000208', 'alice@example.com'),
        ('alice@example.com', 'CUST-000311', 'alice@example.com'),
        ('alice@example.com', 'CUST-000415', 'alice@example.com'),
        ('alice@example.com', 'CUST-000509', 'alice@example.com'),
        ('alice@example.com', 'CUST-000622', 'alice@example.com'),
        ('alice@example.com', 'CUST-000714', 'alice@example.com'),
        ('alice@example.com', 'CUST-000801', 'alice@example.com'),
        ('bob@example.com', 'CUST-000124', 'alice@example.com'),
        ('bob@example.com', 'CUST-000208', 'alice@example.com'),
        ('bob@example.com', 'CUST-000311', 'alice@example.com'),
        ('bob@example.com', 'CUST-000415', 'alice@example.com'),
        ('carol@example.com', 'CUST-000124', 'bob@example.com'),
        ('carol@example.com', 'CUST-000208', 'bob@example.com'),
        ('david@example.com', 'CUST-000415', 'bob@example.com'),
        ('david@example.com', 'CUST-000509', 'bob@example.com'),
        ('eva@example.com', 'CUST-000622', 'eva@example.com'),
        ('eva@example.com', 'CUST-000714', 'eva@example.com'),
        ('eva@example.com', 'CUST-000801', 'eva@example.com')
)
INSERT INTO customer_access (user_id, customer_id, granted_by)
SELECT target.id, grants.customer_id, grantor.id
FROM grants
JOIN app_user target ON lower(target.email) = lower(grants.email)
LEFT JOIN app_user grantor ON lower(grantor.email) = lower(grants.granted_by_email)
ON CONFLICT (user_id, customer_id) DO NOTHING;

WITH vin_seed(vehicle_id, customer_id, pending_customer_id, test_vehicle, vin, name, make, model, year, event_timestamp, uploader_email) AS (
    VALUES
        ('LV-0001', 'CUST-000124', NULL::jsonb, true,  '1HGCM82633A764219', '7JXK194', 'Jeep',        'Grand Cherokee', '2024', '2026-11-05T09:00:00.000Z'::timestamptz, 'alice@example.com'),
        ('LV-0002', 'CUST-000208', '["87d5a40a-3a31-4d37-bd70-73fd5de7ccf7"]'::jsonb, false, '1FTFW1E50NFA55217', '8RMD552', 'Ram',         '1500',           '2022', '2026-11-05T09:05:00.000Z'::timestamptz, 'bob@example.com'),
        ('LV-0003', 'CUST-000311', NULL::jsonb, true,  'WVWZZZ1JZXW873541', '6TQP318', 'Dodge',       'Durango',        '2023', '2026-11-05T09:10:00.000Z'::timestamptz, 'carol@example.com'),
        ('LV-0004', 'CUST-000415', '["d3cc2a41-8776-4ffc-ae8b-6f16f03a9674","4c870162-e5e1-4343-bf95-2b2f1f090f8d"]'::jsonb, false, '2C3KA53G76H998234', '4NLE204', 'Chrysler',    'Pacifica',       '2021', '2026-11-05T09:15:00.000Z'::timestamptz, 'bob@example.com'),
        ('LV-0005', 'CUST-000509', NULL::jsonb, true,  '5YJ3E1EA7KF662901', '9VCK770', 'Alfa Romeo',  'Tonale',         '2024', '2026-11-05T09:20:00.000Z'::timestamptz, 'eva@example.com'),
        ('LV-0006', 'CUST-000622', '["6efb78c7-478f-4eb5-9b2f-31a6bc5fd99b"]'::jsonb, false, '1N4AL3AP8EC587130', '5BRX611', 'Ram',         'ProMaster',      '2022', '2026-11-05T09:25:00.000Z'::timestamptz, 'david@example.com'),
        ('LV-0007', 'CUST-000714', NULL::jsonb, false, 'WAUZZZ8V4GA784320', '2YLP442', 'Dodge',       'Charger',        '2021', '2026-11-05T09:30:00.000Z'::timestamptz, 'carol@example.com'),
        ('LV-0008', 'CUST-000801', '["e9e8b70c-ae58-4f6e-80f0-d19fdbcc1ad8"]'::jsonb, false, '3FA6P0HD1KR447892', '1HSA905', 'Ram',         '1500',           '2022', '2026-11-05T09:35:00.000Z'::timestamptz, 'alice@example.com')
)
INSERT INTO local_vin_access (
    vehicle_id, customer_id, pending_customer_id, test_vehicle, vin,
    name, make, model, year, event_timestamp, uploader_user_id
)
SELECT
    vin_seed.vehicle_id, vin_seed.customer_id, vin_seed.pending_customer_id,
    vin_seed.test_vehicle, vin_seed.vin, vin_seed.name, vin_seed.make,
    vin_seed.model, vin_seed.year, vin_seed.event_timestamp, uploader.id
FROM vin_seed
LEFT JOIN app_user uploader ON lower(uploader.email) = lower(vin_seed.uploader_email)
ON CONFLICT (vehicle_id) DO NOTHING;
