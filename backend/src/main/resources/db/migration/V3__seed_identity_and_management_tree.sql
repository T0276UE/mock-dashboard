-- Phase 3: deterministic development seed for one organization and one hierarchy snapshot.

INSERT INTO organization (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Organization');

INSERT INTO app_user (id, organization_id, display_name, email, status)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Alice Patel', 'alice.patel@example.com', 'ACTIVE'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '11111111-1111-1111-1111-111111111111', 'Morgan Lee', 'morgan.lee@example.com', 'ACTIVE'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc3', '11111111-1111-1111-1111-111111111111', 'Taylor Chen', 'taylor.chen@example.com', 'ACTIVE');

INSERT INTO external_identity (issuer, subject, user_id)
VALUES
    ('demo-local', 'alice.patel', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
    ('demo-local', 'morgan.lee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'),
    ('demo-local', 'taylor.chen', 'cccccccc-cccc-cccc-cccc-ccccccccccc3');

INSERT INTO management_tree_head (tree_id, organization_id, current_version)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1);

INSERT INTO management_tree_snapshot (
    tree_id,
    version,
    structure,
    schema_version,
    created_by,
    reason,
    restored_from_version
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    1,
    '{"managerByUser":{"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1":null,"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","cccccccc-cccc-cccc-cccc-ccccccccccc3":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"}}'::jsonb,
    1,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Initial seed hierarchy',
    NULL
);
