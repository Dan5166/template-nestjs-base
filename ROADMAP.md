# 🗺️ Roadmap — template (NestJS base)

Delivery is **phased**. Each phase is self-contained, compiles, and (where applicable) boots.
Legend: ✅ done · 🚧 in progress · ⬜ pending

**Status: 11 / 11 phases complete. 🎉**

**Decisions (locked):** TypeORM · PostgreSQL · Joi · Pino · OAuth Google/GitHub · RBAC + **PBAC** (granular permissions) · project name `template`.

---

## ✅ Phase 1 — Foundation

Project skeleton, strict TypeScript, tooling, validated config, secure bootstrap.

- [x] NestJS 11 project (`package.json` with full dependency set)
- [x] TypeScript **strict mode** (`noImplicitAny`, `noUnusedLocals/Parameters`, `noImplicitReturns`, `noImplicitOverride`, path alias `src/*`)
- [x] Folder structure: `config/`, `common/`, `database/`, `shared/`, `modules/`
- [x] `@nestjs/config` global + **Joi** validation (fail-fast)
- [x] Namespaced typed config: `app`, `database`, `jwt`, `throttle`, `redis`, `oauth`, `log`, `seed`
- [x] `main.ts`: Helmet · CORS · cookie-parser · URI versioning (`/api/v1`) · global prefix · `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) · `ClassSerializerInterceptor` · shutdown hooks
- [x] `@nestjs/throttler` as global rate-limit guard
- [x] ESLint 9 (flat, type-checked) + Prettier + `.editorconfig`
- [x] Husky v9 hooks: `pre-commit` (lint-staged) + `commit-msg` (commitlint / conventional commits)
- [x] `.env.example` + `.env`, `README.md`
- [x] **Verified:** build OK, boots, `GET /api/v1` responds, Joi fail-fast tested

---

## ✅ Phase 2 — Database

TypeORM + PostgreSQL, base entity, migrations, containers.

- [x] `TypeOrmModule.forRootAsync` wired to config (`DatabaseModule`, `autoLoadEntities`)
- [x] `src/database/data-source.ts` for the TypeORM CLI (migrations)
- [x] Shared options builder (`typeorm-options.ts`) so runtime & CLI never drift
- [x] Abstract **`BaseEntity`**: `id` (UUID) · `createdAt` · `updatedAt` · `deletedAt` (soft delete) · `version`
- [x] Migrations setup + npm scripts (`migration:generate/run/revert`)
- [x] `docker-compose.yml`: PostgreSQL (+ Redis service, wired in Phase 10)
- [x] `.dockerignore`
- [x] Snake_case naming strategy + `migrations` table config
- [x] **Verified:** build OK; DB connection genuinely confirmed in Phase 3 (Docker Postgres on host port **5433** — a native PostgreSQL 18 owns 5432 on this machine)

---

## ✅ Phase 3 — Common / Shared

Cross-cutting building blocks reused by every feature module.

- [x] Global `AllExceptionsFilter` → standardized shape `{ statusCode, code, message, error, timestamp, path, method, requestId, details }` (handles Business/Http/TypeORM/unknown)
- [x] Custom business exceptions (`BusinessException` + `ErrorCode` enum + domain subclasses)
- [x] Response transform interceptor → `{ data, meta }` (flattens `Paginated`), with `@RawResponse()` opt-out
- [x] Logging interceptor (request/response timing)
- [x] Timeout interceptor (408 on slow requests)
- [x] Pagination: `PaginationQueryDto` (page, limit, sortBy, order, search), `paginate()`/`paginateArray()` helpers, `Paginated<T>`
- [x] Query parsing: allow-listed search/sort in base service
- [x] `@ApiPaginatedResponse()` Swagger helper
- [x] **Generic CRUD**: abstract `BaseCrudService<T>` + `BaseCrudController` factory (DTO validation + Swagger safe)
- [x] Common decorators: `@CurrentUser()` (foundation), `@RawResponse()`
- [x] **Verified:** build OK; envelope `{data,meta}` and standardized 404 confirmed against a real (Docker) Postgres connection

---

## ✅ Phase 4 — Users module

- [x] `User` entity (extends `BaseEntity`), soft delete, `provider` field ready for auth/OAuth
- [x] Request/response DTOs (`CreateUserDto`, `UpdateUserDto`, `UpdateProfileDto`, `UserResponseDto`) — separated from entity
- [x] `UsersService` (extends `BaseCrudService`) + repo encapsulation, `findByEmail`, email-uniqueness guard
- [x] `UsersController`: full CRUD + pagination/filters/sort via the generic base controller
- [x] Own-profile endpoints via `MeController` (`GET/PATCH /users/me`) — 401 until auth lands (Phase 5)
- [x] `HashingService` (argon2) — shared, global module
- [x] First migration (`CreateUsers`) generated + run (with `uuid-ossp` extension)
- [x] Admin user seeder + `npm run seed` runner (roles/permissions seed deferred to Phase 6)
- [x] **Verified e2e** against real Postgres: create (201, no password leak), list (flattened `{data,meta}`), get, update, duplicate→409, validation→400, soft delete→204, 404-after-delete, restore, `/me`→401, bad-uuid→400

---

## ✅ Phase 5 — Authentication

- [x] `argon2` password hashing (via shared `HashingService`)
- [x] Passport strategies: `local`, `jwt` (access), `jwt-refresh` (cookie)
- [x] Endpoints: `register`, `login`, `refresh`, `logout`, `me`
- [x] Access + refresh token issuance; refresh via **httpOnly cookie**; refresh **rotation** + reuse detection (per-session rows in `refresh_tokens` — multi-device, see Hardening)
- [x] `@Public()` decorator + **global `JwtAuthGuard`** (every route protected by default)
- [x] Token revocation: `TokenBlacklistService` abstraction + DB impl (`revoked_tokens`), swappable to Redis in Phase 10
- [x] Auth DTOs (`RegisterDto`, `LoginDto`, `AuthResponseDto`) + Swagger annotations; tighter throttle on login
- [x] Migration `CreateRevokedTokens` generated + run
- [x] **Verified e2e**: login (200 + cookie), protected route 401→200 with token, `/auth/me` & `/users/me` work, wrong pw→401 `INVALID_CREDENTIALS`, refresh rotates token, logout→204, revoked token→401 `TOKEN_REVOKED`, refresh-after-logout→401, register→201, duplicate→409

---

## ✅ Phase 6 — Authorization (RBAC + PBAC)

- [x] `Role` and `Permission` entities (+ `role_permissions`, `user_roles` join tables; permissions eager on role)
- [x] `@Roles()` decorator + global `RolesGuard` (any-of)
- [x] `@RequirePermissions()` decorator + global `PermissionsGuard` (all-of, `resource:action`)
- [x] `BaseCrudController` accepts per-action `permissions` → declarative PBAC for any resource
- [x] `AuthorizationService` (assign roles) + default `user` role on registration
- [x] JWT principal now carries real `roles`/`permissions` (loaded via `findByEmailWithRoles`)
- [x] Seed base roles (`admin` = all, `user` = read-only) + assign `admin` to seeded admin
- [x] Migration `CreateRbac` generated + run
- [x] **Verified e2e**: admin (users:*) → GET 200 / POST 201 / DELETE 204; regular user (users:read) → GET 200, POST 403, DELETE 403 (`FORBIDDEN`, "Requires permission: users:create"), `/users/me` 200

---

## ✅ Phase 7 — OAuth (extension)

- [x] Google strategy (`passport-google-oauth20`), scope `email profile`
- [x] GitHub strategy (`passport-github2`), scope `user:email`
- [x] `OAuthController`: `/auth/{google,github}` (authorize) + `/callback` routes
- [x] Callback flow → `handleOAuthLogin`: find by providerId → link existing email → else create passwordless user (+ default role), then issue app JWTs + refresh cookie
- [x] Strategies registered **only when enabled + configured** (passport throws on empty clientID); guards return 404 when `OAUTH_ENABLED=false`
- [x] Reuses `provider`/`providerId` columns from Phase 4 — **no migration needed**
- [x] **Verified**: disabled → app boots clean, routes 404; enabled (dummy creds) → `/auth/google` & `/auth/github` 302-redirect to the providers with correct redirect_uri/scope/client_id (full callback needs real credentials)

---

## ✅ Phase 8 — Observability & Docs

- [x] **Pino** structured logging (`nestjs-pino`): per-request `x-request-id` (echoed + used by the exceptions filter), secret redaction, pretty in dev / JSON in prod
- [x] Framework logger replaced by Pino (`app.useLogger`); `/health` requests excluded from access logs
- [x] Health checks (`@nestjs/terminus`) at `/api/health` (version-neutral, public): DB ping + heap; native Terminus shape via `@RawResponse()`
- [x] **Swagger/OpenAPI** at `/api/docs` (+ `/api/docs-json`): bearer + cookie auth, `persistAuthorization`, tags, annotated DTOs
- [x] **Verified**: `/api/health`→200 `{status:"ok", database:up}`, `/api/docs`→200 HTML, OpenAPI spec lists routes, `x-request-id` header present, logs structured with `responseTime`

---

## ✅ Phase 9 — Testing & CI

- [x] Jest **unit tests** (24): hashing, pagination helpers, roles/permissions guards, duration parser, `extractAuthz`
- [x] **e2e tests** (11) with Supertest: public/health, auth (register/login/me/dupe/bad-pw), RBAC/PBAC, refresh + logout revocation
- [x] Test DB strategy: `.env.test` (`NODE_ENV=test` → `template_test`, `DB_SYNCHRONIZE=true`, silent logs); `ConfigModule` loads `.env.<NODE_ENV>` first
- [x] `test/jest-e2e.json` + `createTestApp` helper (mirrors `main.ts` middleware) + `setup-e2e.ts`
- [x] ESLint override for test files (relax `no-unsafe-*` on supertest bodies)
- [x] GitHub Actions CI (`.github/workflows/ci.yml`): Postgres service, `npm ci` → lint:check → build → unit → e2e
- [x] **Verified locally**: 24 unit + 11 e2e green, `lint:check` clean, `build` clean

---

## ✅ Phase 10 — Redis

- [x] Global `RedisModule` (`ioredis`) providing `REDIS_CLIENT` (or `null`) behind `REDIS_ENABLED`; graceful `quit()` on shutdown
- [x] `RedisTokenBlacklistService` with **native key TTL** (no cleanup cron); `TokenBlacklistService` bound via factory → Redis when available, else DB fallback
- [x] Refresh rotation + reuse detection already in place (Phase 5); unaffected by store choice
- [x] `/api/health` reports `redis:up` when enabled
- [x] docker-compose Redis service used
- [x] **Verified**: enabled → health shows redis:up, logout writes `bl:jti:*` (DBSIZE 0→1) with TTL ≈899s, revoked token→401 `TOKEN_REVOKED`; disabled → DB fallback, e2e 11/11 green

---

## ✅ Phase 11 — Multi-tenancy (prepared, disabled)

- [x] `AsyncLocalStorage` request context (`tenantStorage`) + `TenantContextService`
- [x] `TenantMiddleware` (header → subdomain → JWT claim) — no-op while `MULTI_TENANT=false`
- [x] `@Tenant()` param decorator
- [x] `tenantId` hook on `BaseEntity` → now a full opt-in via `TenantScopedEntity` + auto-scoping (see Post-1.0 hardening)
- [x] Global `TenancyModule`; `GET /` echoes the resolved tenant when enabled (verification path)
- [x] USAGE.md → "Enabling multi-tenancy" guide (column + subscriber/scoping steps)
- [x] **Verified both states**: disabled → response unchanged, `X-Tenant-ID` ignored; enabled → `tenant:"acme"` from header, `null` without; full suite still green (lint + 24 unit + 11 e2e)

---

## Extras (folded into phases above)

- [x] API versioning (`/v1`) — Phase 1
- [ ] Response envelope `{ data, meta }` — Phase 3
- [ ] Custom schematics / module generator — optional, post-1.0

---

## ✅ Post-1.0 hardening

- [x] Multi-stage, non-root **`Dockerfile`** (deps + `dist/` only; starts Node directly for graceful shutdown)
- [x] **Swagger disabled in production** unless `SWAGGER_ENABLED=true`
- [x] Request **body-size limit** (`APP_BODY_LIMIT`, default `1mb`) on the json/urlencoded parsers
- [x] Tighter per-endpoint throttles on `auth/register` (5/min) and `auth/refresh` (20/min)
- [x] CI runs a **Redis service** and e2e with `REDIS_ENABLED=true`, exercising the Redis blacklist path
- [x] `.nvmrc` pins Node 20
- [x] **Multi-session refresh tokens**: dedicated `refresh_tokens` table (one row per device), concurrent
      logins, per-session logout, and reuse detection that revokes the whole session family — access
      tokens carry a `sid` claim so logout targets the exact session (migration `AddRefreshTokens`)
- [x] **Tenant enforcement** (Phase 11 completion): `TenantScopedEntity` + `TenantSubscriber` (stamps
      `tenantId` on insert) + `BaseCrudService` auto-scoping reads/updates/deletes. Opt-in per entity,
      immutable `tenantId` on update, and a no-op while `MULTI_TENANT=false`
- [x] **Verified**: lint clean, 30 unit + 14 e2e green (incl. multi-session/reuse + tenant-scoping unit
      cases) against Postgres, and 14/14 again with `REDIS_ENABLED=true`
