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
| Auth               | Passport (JWT + local), argon2 hashing, multi-session refresh rotation |
| Authorization      | RBAC (`@Roles()`) + PBAC (`@RequirePermissions()`) |
| Config validation  | `@nestjs/config` + Joi                        |
| Logging            | Pino (`nestjs-pino`)                          |
| Docs               | Swagger / OpenAPI (off in production by default) |
| Security           | Helmet, CORS, `@nestjs/throttler`, request body-size limit, strict validation |
| Testing            | Jest (unit + e2e with Supertest)             |

## Requirements

- Node.js >= 20 (an `.nvmrc` pins `20` — run `nvm use`)
- npm >= 10
- Docker (for PostgreSQL / Redis via `docker-compose`, and the production image — see [Deployment](#deployment))

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
> ℹ️ Docs are **disabled when `NODE_ENV=production`** (so the API surface isn't publicly
> enumerable). Set `SWAGGER_ENABLED=true` to force them on there — e.g. behind an internal gateway.
>
> Authentication is live: **every route requires a Bearer access token** except those marked
> `@Public()` (`GET /`, `/api/health`, `POST /auth/register`, `POST /auth/login`,
> `POST /auth/refresh`). The public auth endpoints also carry **tighter per-minute rate limits**
> than the global throttler (`register` 5, `login` 10, `refresh` 20) to blunt brute-force and
> automated-signup abuse. You can also test with PowerShell, Postman, or the VS Code REST
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

### 2. Easiest: test in the browser (Swagger UI)

No tooling needed — with the app running, open **http://localhost:3000/api/docs**.

1. Expand **`POST /auth/login`** → **Try it out** → log in as the seeded admin:
   ```json
   { "email": "admin@template.local", "password": "Admin123!" }
   ```
   **Execute**, then copy the `accessToken` from the response.
2. Click **Authorize** 🔒 (top-right), paste the token, **Authorize**, **Close**.
   Now every protected request is sent with your `Bearer` token.
3. Try any endpoint — e.g. `GET /users`, `POST /users`, `GET /users/me`, `POST /auth/logout`.
   Use **Try it out → Execute** and inspect the response, status code, and headers.

> Prefer the console? Sections 3–5 below do the same from PowerShell. The health check
> (`GET /api/health`, public) and OpenAPI JSON (`/api/docs-json`) need no auth.

### 3. PowerShell — authenticate (get a token)

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

### 4. PowerShell — requests with `Invoke-RestMethod` (protected routes)

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

### 5. Full auth flow with `curl.exe` (cookies for refresh/logout)

```powershell
$b = "http://localhost:3000/api/v1"
# login — store the refresh cookie in cookies.txt
curl.exe -c cookies.txt -X POST "$b/auth/login" -H "Content-Type: application/json" -d '{\"email\":\"admin@template.local\",\"password\":\"Admin123!\"}'
# refresh — send + update the cookie (returns a new access token)
curl.exe -b cookies.txt -c cookies.txt -X POST "$b/auth/refresh"
# logout — needs the access token; clears the refresh cookie
curl.exe -b cookies.txt -X POST "$b/auth/logout" -H "Authorization: Bearer <accessToken>"
```

### 6. Feature checklist — what to verify

Run these (in Swagger or PowerShell) to confirm each part of the template works:

| Feature | How to test | Expected |
| --- | --- | --- |
| Health check | `GET /api/health` (public) | `200`, `status: ok`, database `up` |
| Login | `POST /auth/login` as admin | `200` + `accessToken` |
| Global auth guard | `GET /users` **without** a token | `401` |
| Auth guard (happy path) | `GET /users` **with** a valid token | `200` |
| Wrong credentials | login with a bad password | `401` `INVALID_CREDENTIALS` |
| Password hidden | any user response | no `password` field ever |
| Input validation | `POST /users` weak password / extra field | `400` + list of errors |
| Duplicate email | register/create an existing email | `409` `EMAIL_ALREADY_EXISTS` |
| RBAC/PBAC — denied | as a **regular** user, `POST /users` | `403` (only has `users:read`) |
| RBAC/PBAC — allowed | as **admin**, `POST /users` | `201` |
| Pagination | `GET /users?page=1&limit=5&search=admin` | envelope `{ data, meta }` |
| Soft delete | `DELETE /users/:id` then `GET /users/:id` | `204`, then `404` |
| Restore | `PATCH /users/:id/restore` | `200` |
| Token revocation | `logout`, then reuse that access token | `401` `TOKEN_REVOKED` |
| Multi-session | log in twice, `refresh` with the **first** session's cookie | `200` (both sessions live) |
| Per-session logout | `logout` one session; the other's access token | still `200` on `/auth/me` |
| Refresh reuse detection | rotate via `refresh`, then replay the **old** cookie | `401` `TOKEN_REVOKED` (family revoked) |
| Error shape | trigger any error | `{ statusCode, code, message, timestamp, path, method }` |

### 7. Inspect the database directly

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
`lint → build → unit → e2e` on every push/PR against Postgres **and** Redis services — the e2e
job runs with `REDIS_ENABLED=true` so the Redis-backed token blacklist (the production default)
is exercised, not just the Postgres fallback.

## Deployment

A multi-stage [`Dockerfile`](./Dockerfile) builds a lean production image (deps + compiled
`dist/` only) that runs as a non-root `node` user and starts Node directly, so `SIGTERM` reaches
the process and graceful shutdown hooks fire.

```bash
docker build -t my-api .
docker run --rm -p 3000:3000 --env-file .env my-api
```

Set `NODE_ENV=production` in the container's env. Remember Swagger is off in production unless
`SWAGGER_ENABLED=true`, and cap request size with `APP_BODY_LIMIT` (default `1mb`).

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
