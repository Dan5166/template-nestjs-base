# template

Base template for NestJS projects — modular architecture, JWT auth (access + refresh),
RBAC + granular permissions (PBAC), TypeORM + PostgreSQL, strict TypeScript, and a full
tooling/security/observability setup.

> Built in phases. See **Roadmap** below for what is implemented and what is pending.

> 🧩 **Starting a new project from this template?** Read **[USAGE.md](./USAGE.md)** — how to
> rename, configure secrets, initialize the DB, and add your first feature module.

## Tech stack

| Concern            | Choice                                        |
| ------------------ | --------------------------------------------- |
| Framework          | NestJS 11                                     |
| Language           | TypeScript (strict mode)                      |
| ORM / DB           | TypeORM + PostgreSQL                          |
| Auth               | Passport (JWT + local), argon2 hashing        |
| Authorization      | RBAC (`@Roles()`) + PBAC (`@RequirePermissions()`) |
| Config validation  | `@nestjs/config` + Joi                        |
| Logging            | Pino (`nestjs-pino`)                          |
| Docs               | Swagger / OpenAPI                             |
| Security           | Helmet, CORS, `@nestjs/throttler`, strict validation |
| Testing            | Jest (unit + e2e with Supertest)             |

## Requirements

- Node.js >= 20
- npm >= 10
- Docker (for PostgreSQL / Redis via `docker-compose`) — added in Phase 2

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and adjust secrets
cp .env.example .env            # PowerShell: Copy-Item .env.example .env

# 3. Run in watch mode
npm run start:dev
```

The API is served under a versioned prefix: `http://localhost:3000/api/v1`.

> **Windows users:** see [Manual testing (Windows / PowerShell)](#manual-testing-windows--powershell)
> for a full setup + testing walkthrough using PowerShell.

## Available scripts

| Script                     | Description                                  |
| -------------------------- | -------------------------------------------- |
| `npm run start:dev`        | Start in watch mode                          |
| `npm run build`            | Compile to `dist/`                           |
| `npm run lint`             | Lint and auto-fix                            |
| `npm run format`           | Format with Prettier                         |
| `npm test`                 | Unit tests                                   |
| `npm run test:e2e`         | End-to-end tests                             |
| `npm run migration:run`    | Run pending TypeORM migrations (Phase 2)     |
| `npm run seed`             | Seed base data (Phase 4)                     |

## Environment variables

All variables are documented and validated. See [`.env.example`](./.env.example) — the app
fails fast on startup if a required variable is missing or invalid.

## Manual testing (Windows / PowerShell)

> 🚀 **Swagger UI** is available at **`http://localhost:3000/api/docs`** — the easiest way to
> explore and try endpoints from the browser (click **Authorize** and paste a JWT access token).
> The OpenAPI JSON is at `/api/docs-json`. A **health check** lives at `/api/health`.
>
> Authentication is live: **every route requires a Bearer access token** except those marked
> `@Public()` (`GET /`, `/api/health`, `POST /auth/register`, `POST /auth/login`,
> `POST /auth/refresh`). You can also test with PowerShell, Postman, or the VS Code REST
> Client / Thunder Client extensions as shown below.

⚠️ In PowerShell, `curl` is an **alias for `Invoke-WebRequest`** and behaves differently from
real curl. Use **`Invoke-RestMethod`** (parses JSON automatically) or call **`curl.exe`**
explicitly.

### 1. Bring the stack up

```powershell
docker compose up -d postgres   # PostgreSQL (published on the DB_PORT from .env)
npm install                     # first time only
npm run migration:run           # create the users table
npm run seed                    # create the admin user (admin@template.local)
npm run start:dev               # API at http://localhost:3000/api/v1
```

> **Port note:** if a local PostgreSQL already owns `5432`, set `DB_PORT=5433` in `.env`
> (docker-compose publishes that port). Check with:
> `Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue`

### 2. Authenticate (get a token)

```powershell
$base = "http://localhost:3000/api/v1"

# Register a new account (or log in with the seeded admin below)
$reg = @{ email = "test@example.com"; password = "Str0ng!Pass"; firstName = "Test" } | ConvertTo-Json
$auth = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body $reg

# Or log in as the seeded admin
$login = @{ email = "admin@template.local"; password = "Admin123!" } | ConvertTo-Json
$auth  = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body $login

# Build the auth header used for all protected calls below
$token   = $auth.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

# Who am I?
Invoke-RestMethod "$base/auth/me" -Headers $headers
```

> The **refresh token** is set as an httpOnly cookie, so `Invoke-RestMethod` can't read it.
> To test `/auth/refresh` and `/auth/logout` end-to-end, use `curl.exe` with a cookie jar
> (`-c cookies.txt -b cookies.txt`) or Postman (which keeps cookies automatically).

### 3. Requests with `Invoke-RestMethod` (protected routes)

```powershell
# App info is public (no header needed)
Invoke-RestMethod "$base"

# Create a user (protected — pass $headers)
$body = @{ email = "someone@example.com"; password = "Str0ng!Pass"; firstName = "Sam" } | ConvertTo-Json
$created = Invoke-RestMethod "$base/users" -Method Post -Headers $headers -ContentType "application/json" -Body $body
$created.data
$id = $created.data.id      # keep the id for the next calls

# List (pagination + search + sort)
Invoke-RestMethod "$base/users?page=1&limit=10&sortBy=email&order=ASC&search=sam" -Headers $headers

# Get one
Invoke-RestMethod "$base/users/$id" -Headers $headers

# Update
$patch = @{ firstName = "Nuevo" } | ConvertTo-Json
Invoke-RestMethod "$base/users/$id" -Method Patch -Headers $headers -ContentType "application/json" -Body $patch

# Soft delete (204) then restore
Invoke-RestMethod "$base/users/$id" -Method Delete -Headers $headers
Invoke-RestMethod "$base/users/$id/restore" -Method Patch -Headers $headers

# Update your own profile
$mine = @{ firstName = "Me" } | ConvertTo-Json
Invoke-RestMethod "$base/users/me" -Method Patch -Headers $headers -ContentType "application/json" -Body $mine
```

To see the body of an **error** response (PowerShell throws on 4xx/5xx):

```powershell
try {
  $dup = @{ email = "someone@example.com"; password = "Str0ng!Pass" } | ConvertTo-Json
  Invoke-RestMethod "$base/users" -Method Post -Headers $headers -ContentType "application/json" -Body $dup
} catch {
  $_.ErrorDetails.Message   # standardized { statusCode, code, message, timestamp, path, method }
}
```

### 4. Full auth flow with `curl.exe` (cookies for refresh/logout)

```powershell
$b = "http://localhost:3000/api/v1"
# login — store the refresh cookie in cookies.txt
curl.exe -c cookies.txt -X POST "$b/auth/login" -H "Content-Type: application/json" -d '{\"email\":\"admin@template.local\",\"password\":\"Admin123!\"}'
# refresh — send + update the cookie (returns a new access token)
curl.exe -b cookies.txt -c cookies.txt -X POST "$b/auth/refresh"
# logout — needs the access token; clears the refresh cookie
curl.exe -b cookies.txt -X POST "$b/auth/logout" -H "Authorization: Bearer <accessToken>"
```

### 5. Things worth verifying

- Password never appears in any response.
- Protected route without a token → `401`; with a valid `Bearer` token → `200`.
- Wrong password on login → `401` with `"code":"INVALID_CREDENTIALS"`.
- Duplicate email → `409` with `"code":"EMAIL_ALREADY_EXISTS"`.
- Weak password / extra field → `400` with a list of validation errors.
- After `logout`, reusing the same access token → `401` with `"code":"TOKEN_REVOKED"`.
- Every error uses the standard shape `{ statusCode, code, message, timestamp, path, method }`.

### 6. Inspect the database directly

```powershell
docker exec -it template_postgres psql -U postgres -d template -c "select id, email, is_active, deleted_at from users;"
```

### Troubleshooting

- **App won't start / port 3000 busy** — a stale Node process may be holding it. Find and kill it:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -Expand OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
  ```
- **`password authentication failed`** — the app is hitting a local PostgreSQL instead of the
  container. Point `DB_PORT` at the container's published port (e.g. `5433`).

## Testing

```powershell
npm test           # unit tests (Jest)
npm run test:e2e   # end-to-end tests (Supertest, hits a real Postgres)
npm run test:cov   # coverage
```

**E2E setup:** e2e tests run against a separate database (`template_test`) with schema
auto-sync, configured in [`.env.test`](./.env.test) (`NODE_ENV=test`). Create it once:

```powershell
docker exec template_postgres createdb -U postgres template_test
```

The suite seeds base roles/permissions itself and cleans up via unique per-run emails.
CI (GitHub Actions, [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs
`lint → build → unit → e2e` against a Postgres service on every push/PR.

## Project structure

```
src/
├── config/            # Namespaced, validated configuration (Joi)
├── common/            # Cross-cutting: filters, interceptors, guards, decorators, DTOs (Phase 3)
├── database/          # TypeORM data-source, migrations, seeds (Phase 2/4)
├── shared/            # Reusable providers/services across modules
├── modules/           # Feature modules (users, auth, ...) (Phase 4+)
├── app.controller.ts
├── app.module.ts
└── main.ts
```

## Roadmap

Phased delivery — **all 11 phases complete** ✅. Full checklist per phase in **[ROADMAP.md](./ROADMAP.md)**.

Foundation · Database · Common/CRUD base · Users · Auth (JWT + refresh) · RBAC/PBAC · OAuth ·
Observability (Pino/Terminus/Swagger) · Testing & CI · Redis blacklist · Multi-tenancy hooks.

## License

MIT
