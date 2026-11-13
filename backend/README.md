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

- Data is currently in-memory and resets on restart.
- This is the transition layer before JDBC + Flyway persistence.
- Authorization is intentionally permissive in this first cut and will be hardened in the next step.

## Migration Runtime Wiring (PostgreSQL profile)

This backend now includes Flyway migration runtime wiring and a PostgreSQL profile.

### Included

- Flyway runtime dependency
- PostgreSQL JDBC driver
- SQL migrations under `src/main/resources/db/migration`
- `application-postgres.yml` profile that enables datasource + Flyway

### Required environment variables

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

Optional pool tuning:

- `SPRING_DATASOURCE_MAX_POOL_SIZE`
- `SPRING_DATASOURCE_MIN_IDLE`
- `SPRING_DATASOURCE_CONNECTION_TIMEOUT_MS`
- `SPRING_DATASOURCE_IDLE_TIMEOUT_MS`
- `SPRING_DATASOURCE_MAX_LIFETIME_MS`

### Run with PostgreSQL profile

```bash
mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=postgres
```

From repo root, you can also use:

```bash
npm run backend:run:postgres
```

By default, Flyway is disabled in `application.yml` so existing non-PostgreSQL runs are unaffected.
