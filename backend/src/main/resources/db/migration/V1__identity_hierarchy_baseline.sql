-- Phase 1 baseline for soft authentication + management hierarchy snapshots.
-- Scope intentionally excludes permissions/grants tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization (id),
    display_name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT app_user_status_chk CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

CREATE INDEX idx_app_user_org_id ON app_user (organization_id);
CREATE INDEX idx_app_user_status ON app_user (status);

CREATE TABLE management_tree_head (
    tree_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization (id),
    current_version BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT management_tree_head_version_chk CHECK (current_version > 0),
    CONSTRAINT management_tree_head_org_uniq UNIQUE (organization_id)
);

CREATE TABLE management_tree_snapshot (
    tree_id UUID NOT NULL,
    version BIGINT NOT NULL,
    structure JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES app_user (id),
    reason TEXT NOT NULL,
    restored_from_version BIGINT,
    PRIMARY KEY (tree_id, version),
    FOREIGN KEY (tree_id) REFERENCES management_tree_head (tree_id),
    CONSTRAINT management_tree_snapshot_version_chk CHECK (version > 0),
    CONSTRAINT management_tree_snapshot_schema_version_chk CHECK (schema_version > 0),
    CONSTRAINT management_tree_snapshot_structure_type_chk CHECK (jsonb_typeof(structure) = 'object')
);

CREATE INDEX idx_management_tree_snapshot_tree_version_desc
    ON management_tree_snapshot (tree_id, version DESC);

CREATE INDEX idx_management_tree_snapshot_structure_gin
    ON management_tree_snapshot USING GIN (structure jsonb_path_ops);

CREATE OR REPLACE FUNCTION deny_management_tree_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'management_tree_snapshot is append-only';
END;
$$;

CREATE TRIGGER trg_management_tree_snapshot_no_update
    BEFORE UPDATE ON management_tree_snapshot
    FOR EACH ROW
EXECUTE FUNCTION deny_management_tree_snapshot_mutation();

CREATE TRIGGER trg_management_tree_snapshot_no_delete
    BEFORE DELETE ON management_tree_snapshot
    FOR EACH ROW
EXECUTE FUNCTION deny_management_tree_snapshot_mutation();
