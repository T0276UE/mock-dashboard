# AIDA Marketplace Dashboard (ICS One-Stop Shop)

This repository hosts a frontend platform for Marketplace-style AIDA usage across ICS services.

Vision:
- One place for internal and external users to discover, browse, and manage ICS offerings.
- Role-aware access so business users, admins, and system admins see the right pages and actions.
- A practical foundation that can evolve from mock/demo workflows into production integrations.

Current implementation status:
- React + TypeScript + Vite application shell.
- Role-based navigation and management view.
- Local SQLite utilities for schema bootstrap and user seed data.
- Mocked feature pages for Customers, Products, Vehicles, Compatibility, and User Management.

## Why This Platform Exists

The AIDA Marketplace is intended to be the operational entry point for ICS consumers:
- Internal teams use it to manage assets, customer access, and product coverage.
- External users use it to view assigned services and compatibility outcomes.
- Administrators govern access, permissions, and lifecycle state.

In short, this project aims to be the one-stop marketplace interface for ICS services, regardless of user origin.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4 (configured)
- SQLite3 (local data support for schema and seed workflow)
- Oxlint (linting)

## Project Structure

Top-level:
- `src/` application code
- `data/` local DB scripts and database file
- `public/` static assets

Inside `src/`:
- `app/components/` app shell components such as navigation and user selector
- `context/` session/user context, persistence helpers, seed adapters
- `features/` domain pages and feature-specific components
- `library/` SQLite setup, schema, and data-access helpers
- `navigation/` route definitions, role model, and access checks
- `shared/` shared UI components
- `types/` shared TypeScript types

## Access and Role Model

Roles:
- `user`
- `sysadmin`
- `admin`

Route-level gating is defined in `src/navigation/routes.ts` and enforced through `src/navigation/permissions.ts`.

Role/permission behavior:
- Effective roles and permissions are computed in `src/context/UserContext.tsx`.
- Session context is persisted in browser storage using `src/context/utils/sessionStorage.ts`.
- Management workflows can update role, permissions, status, and managed customer assignments.

## Data Layer and Local Database

Database file:
- `data/dashboard.db`

Schema is created from:
- `src/library/schema.ts`

Initialization helpers:
- `src/library/dbSetup.ts`
- `src/library/db.ts`

User seed logic:
- `src/library/dbUsers.ts`
- `data/seed-users.js`

### Current schema entities

- `users`
- `customers`
- `vehicles`
- `customer_access`
- `products`
- `resources`
- `product_access`

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Database Operations

Create schema:

```powershell
npx tsx data/create-db.js
```

Seed users:

```bash
npm run db:seed
```

Windows helpers:

```powershell
./data/create-db.ps1
./data/delete-db.ps1
```

Shell helpers:

```bash
./data/create-db.sh
./data/delete-db.sh
```

## Platform Workflow (Today)

1. App starts with `UserProvider` wrapping the UI.
2. Session and user state restore from browser storage if available.
3. Navigation visibility is computed from effective roles.
4. Feature pages render based on the active route.
5. Management actions update role/permission state in context.

This is intentionally lightweight so the team can iterate quickly on AIDA marketplace behavior.

## Long-Term Codebase Runbook

This section is for keeping the platform healthy over time.

### 1) Architectural boundaries

- Keep domain logic inside `src/features/<domain>/`.
- Keep cross-cutting state in `src/context/`.
- Keep DB and persistence adapters in `src/library/`.
- Keep route metadata centralized in `src/navigation/`.

### 2) Add new marketplace modules safely

When introducing a new ICS service module:
1. Create `src/features/<service>/pages/<Service>Page.tsx`.
2. Add route entry in `src/navigation/routes.ts`.
3. Apply explicit `requiredRoles`.
4. Add or extend typed contracts in `src/types/`.
5. Add access checks and UI affordances in management views when needed.

### 3) Data and schema lifecycle

- Treat `src/library/schema.ts` as the source of truth for table design.
- Add migration strategy before production rollout (versioned SQL migrations).
- Keep seed scripts deterministic so local onboarding is reliable.
- Add rollback notes for each schema change.

### 4) Auth and external integration evolution

`UserContext` already defines an `ExternalAuthAdapter` contract.

Recommended path:
1. Implement token/session restore with your identity provider.
2. Replace demo login payload with provider-backed claims.
3. Resolve roles/permissions from backend policy service.
4. Keep a minimal fallback demo mode for local development.

### 5) Quality gates

Minimum gate for each PR:
1. `npm run lint`
2. `npm run build`
3. Manual role-based route smoke test

Recommended next additions:
- Unit tests for role and permission reducers.
- Integration tests for navigation access paths.
- Contract tests for DB helper functions.

### 6) Operational standards

- Document every new route and role dependency.
- Avoid hidden coupling between feature folders.
- Keep mock data and DB seed data aligned.
- Maintain clear release notes for access-control changes.

### 7) Known backlog themes

The file `src/library/TODO.txt` already identifies near-term schema work such as:
- richer `product_access` linkage
- customer metrics modeling
- vehicle telemetry metadata

Treat these as part of the roadmap from dashboard prototype to production marketplace.

## Suggested Near-Term Roadmap

1. Introduce backend API layer for users/customers/products.
2. Convert context-side updates into API-backed mutations.
3. Add audit trail for permission and role changes.
4. Introduce CI checks for lint/build/test.
5. Add role matrix documentation for external partners.

## Contributing

For contributions:
1. Create a branch from `main`.
2. Keep changes scoped to one feature or concern.
3. Run lint/build checks before pushing.
4. Include short notes for route, role, or schema changes.

## License

No license file is currently included in this repository.
Add a license before external distribution.
