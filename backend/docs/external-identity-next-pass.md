# External Identity Next Pass

This phase keeps soft authentication centered on `app_user.id` as the immutable internal key.

## Why external identity is deferred

- The current MVP selector is session-based and does not require provider mapping yet.
- Deferring avoids locking early assumptions about OIDC issuer/subject formats.
- It keeps phase 1 focused on hierarchy correctness and context hydration.

## Proposed table in next pass

```sql
CREATE TABLE external_identity (
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject)
);

CREATE INDEX idx_external_identity_user_id ON external_identity (user_id);
```

## external_users vs external_identity

If you mean `external_users` as a profile table, there are two common options:

1. Mapping-only table (recommended now): keep `external_identity` only.
2. Mapping + profile table (optional later): add `external_user_profile` for non-authoritative provider metadata.

Recommended optional profile shape if needed later:

```sql
CREATE TABLE external_user_profile (
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    last_seen_at TIMESTAMPTZ,
    provider_email TEXT,
    provider_display_name TEXT,
    raw_claims JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject),
    FOREIGN KEY (issuer, subject)
        REFERENCES external_identity (issuer, subject)
);
```

Use this optional table only for diagnostics and login telemetry. Do not use it as an authorization source.

## Responsibility

- `issuer + subject` uniquely identifies a provider identity record.
- `user_id` maps the provider identity to the internal application user.
- Authorization still depends on internal user status and grants, not provider claims alone.

## Cardinality rules

- One internal user may map to multiple provider identities.
- One provider identity must map to exactly one internal user.
- A reassignment requires explicit audited operation; avoid implicit remapping.

## Security and operations notes

- Keep `external_identity` write access backend-only.
- Use unique constraints to prevent duplicate identity links.
- Keep internal user ID as the only stable principal in session and request context.

## Integration note

When verified login is introduced, the backend should:

1. Validate the provider token.
2. Resolve `(issuer, subject)` in `external_identity`.
3. Load the mapped `app_user` and enforce active status.
4. Build request context using current tree/grants from internal records.
