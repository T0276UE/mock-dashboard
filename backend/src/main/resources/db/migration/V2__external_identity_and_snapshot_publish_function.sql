-- Phase 2: add external identity mapping + controlled snapshot append function.

CREATE TABLE external_identity (
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject)
);

CREATE INDEX idx_external_identity_user_id ON external_identity (user_id);

CREATE OR REPLACE FUNCTION publish_management_tree_snapshot(
    p_tree_id UUID,
    p_expected_version BIGINT,
    p_structure JSONB,
    p_schema_version INTEGER,
    p_actor_user_id UUID,
    p_reason TEXT,
    p_restored_from_version BIGINT DEFAULT NULL
)
RETURNS TABLE (
    tree_id UUID,
    version BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_version BIGINT;
    v_new_version BIGINT;
    v_created_at TIMESTAMPTZ := now();
BEGIN
    IF p_expected_version < 1 THEN
        RAISE EXCEPTION 'expected_version must be >= 1';
    END IF;

    IF p_schema_version < 1 THEN
        RAISE EXCEPTION 'schema_version must be >= 1';
    END IF;

    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RAISE EXCEPTION 'reason is required';
    END IF;

    IF p_structure IS NULL OR jsonb_typeof(p_structure) <> 'object' THEN
        RAISE EXCEPTION 'structure must be a JSON object';
    END IF;

    PERFORM 1
    FROM app_user
    WHERE id = p_actor_user_id
      AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'actor user % is not active or does not exist', p_actor_user_id;
    END IF;

    SELECT current_version
    INTO v_current_version
    FROM management_tree_head
    WHERE tree_id = p_tree_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tree_id % not found', p_tree_id;
    END IF;

    IF v_current_version <> p_expected_version THEN
        RAISE EXCEPTION 'stale expected_version for tree %, expected %, current %', p_tree_id, p_expected_version, v_current_version;
    END IF;

    v_new_version := v_current_version + 1;

    INSERT INTO management_tree_snapshot (
        tree_id,
        version,
        structure,
        schema_version,
        created_at,
        created_by,
        reason,
        restored_from_version
    )
    VALUES (
        p_tree_id,
        v_new_version,
        p_structure,
        p_schema_version,
        v_created_at,
        p_actor_user_id,
        p_reason,
        p_restored_from_version
    );

    UPDATE management_tree_head
    SET current_version = v_new_version,
        updated_at = v_created_at
    WHERE tree_id = p_tree_id;

    RETURN QUERY
    SELECT p_tree_id, v_new_version, v_created_at;
END;
$$;
