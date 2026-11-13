# Mock Dashboard Backend (Phase 1)

This module is the Spring backend bridge for the existing React frontend.

## What is implemented

- Spring Boot application scaffold
- Mock user context via `x-user-id` header (defaults to `USR-001`)
- Initial API endpoints:
  - `GET /api/v1/session/me`
  - `GET /api/v1/users`
  - `GET /api/v1/users/{userId}/customers`
  - `PUT /api/v1/users/{userId}/customers`
- OpenAPI draft contract at `backend/openapi/api-v1.yaml`

## Run locally

Set `DATABASE_URL_POOLED` (recommended) or `DATABASE_URL` to a PostgreSQL connection URI in `backend/.env`.
The backend prefers the pooled URL and accepts Neon URI parameters such as `sslmode=require`.
`DATABASE_SCHEMA` defaults to `public`; the access tables default to `customer_access` and `local_vin_access`.

From the repo root:

```bash
npm run backend:run
```

Or directly:

```bash
mvn -f backend/pom.xml spring-boot:run
```

## Test sample requests

```bash
curl http://localhost:8080/api/v1/session/me
curl -H "x-user-id: USR-003" http://localhost:8080/api/v1/session/me
curl http://localhost:8080/api/v1/users
curl http://localhost:8080/api/v1/users/USR-002/customers
curl -X PUT http://localhost:8080/api/v1/users/USR-002/customers -H "Content-Type: application/json" -d "{\"customerIds\":[\"CUST-000124\",\"CUST-000801\"]}"
```

## Notes

- JDBC persistence uses PostgreSQL; the frontend's local SQLite database remains separate.
- Authorization is intentionally permissive in this first cut and will be hardened in the next step.
