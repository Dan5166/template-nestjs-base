# 🗺️ Roadmap — template (base NestJS)

La entrega es **por fases**. Cada fase es autocontenida, compila y (cuando aplica) levanta.
Leyenda: ✅ hecho · 🚧 en progreso · ⬜ pendiente

**Estado: 11 / 11 fases completas. 🎉**

**Decisiones (fijadas):** TypeORM · PostgreSQL · Joi · Pino · OAuth Google/GitHub · RBAC + **PBAC** (permisos granulares) · nombre del proyecto `template`.

---

## ✅ Fase 1 — Foundation

Esqueleto del proyecto, TypeScript estricto, tooling, config validada, bootstrap seguro.

- [x] Proyecto NestJS 11 (`package.json` con el set completo de dependencias)
- [x] TypeScript **modo estricto** (`noImplicitAny`, `noUnusedLocals/Parameters`, `noImplicitReturns`, `noImplicitOverride`, path alias `src/*`)
- [x] Estructura de carpetas: `config/`, `common/`, `database/`, `shared/`, `modules/`
- [x] `@nestjs/config` global + validación **Joi** (fail-fast)
- [x] Config tipada por namespaces: `app`, `database`, `jwt`, `throttle`, `redis`, `oauth`, `log`, `seed`
- [x] `main.ts`: Helmet · CORS · cookie-parser · versionado por URI (`/api/v1`) · prefijo global · `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) · `ClassSerializerInterceptor` · shutdown hooks
- [x] `@nestjs/throttler` como guard global de rate-limit
- [x] ESLint 9 (flat, type-checked) + Prettier + `.editorconfig`
- [x] Hooks de Husky v9: `pre-commit` (lint-staged) + `commit-msg` (commitlint / conventional commits)
- [x] `.env.example` + `.env`, `README.md`
- [x] **Verificado:** build OK, levanta, `GET /api/v1` responde, fail-fast de Joi probado

---

## ✅ Fase 2 — Database

TypeORM + PostgreSQL, base entity, migraciones, contenedores.

- [x] `TypeOrmModule.forRootAsync` cableado a la config (`DatabaseModule`, `autoLoadEntities`)
- [x] `src/database/data-source.ts` para el CLI de TypeORM (migraciones)
- [x] Builder de opciones compartido (`typeorm-options.ts`) para que runtime y CLI nunca se desincronicen
- [x] **`BaseEntity`** abstracta: `id` (UUID) · `createdAt` · `updatedAt` · `deletedAt` (soft delete) · `version`
- [x] Setup de migraciones + scripts npm (`migration:generate/run/revert`)
- [x] `docker-compose.yml`: PostgreSQL (+ servicio Redis, cableado en la Fase 10)
- [x] `.dockerignore`
- [x] Estrategia de naming snake_case + config de la tabla `migrations`
- [x] **Verificado:** build OK; conexión a la BD confirmada de verdad en la Fase 3 (Postgres en Docker en el puerto host **5433** — un PostgreSQL 18 nativo ocupa el 5432 en esta máquina)

---

## ✅ Fase 3 — Common / Shared

Bloques transversales reutilizados por cada módulo de feature.

- [x] `AllExceptionsFilter` global → forma estandarizada `{ statusCode, code, message, error, timestamp, path, method, requestId, details }` (maneja Business/Http/TypeORM/desconocido)
- [x] Excepciones de negocio personalizadas (`BusinessException` + enum `ErrorCode` + subclases de dominio)
- [x] Interceptor de transformación de respuesta → `{ data, meta }` (aplana `Paginated`), con opt-out `@RawResponse()`
- [x] Interceptor de logging (timing de request/response)
- [x] Interceptor de timeout (408 en peticiones lentas)
- [x] Paginación: `PaginationQueryDto` (page, limit, sortBy, order, search), helpers `paginate()`/`paginateArray()`, `Paginated<T>`
- [x] Parseo de query: search/sort con allow-list en el base service
- [x] Helper de Swagger `@ApiPaginatedResponse()`
- [x] **CRUD genérico**: `BaseCrudService<T>` abstracto + factory `BaseCrudController` (validación de DTO + seguro para Swagger)
- [x] Decorators comunes: `@CurrentUser()` (base), `@RawResponse()`
- [x] **Verificado:** build OK; envoltorio `{data,meta}` y 404 estandarizado confirmados contra una conexión real (Docker) a Postgres

---

## ✅ Fase 4 — Módulo de Users

- [x] Entity `User` (extiende `BaseEntity`), soft delete, campo `provider` listo para auth/OAuth
- [x] DTOs de request/response (`CreateUserDto`, `UpdateUserDto`, `UpdateProfileDto`, `UserResponseDto`) — separados de la entity
- [x] `UsersService` (extiende `BaseCrudService`) + encapsulación del repo, `findByEmail`, guardia de unicidad de email
- [x] `UsersController`: CRUD completo + paginación/filtros/orden vía el base controller genérico
- [x] Endpoints de perfil propio vía `MeController` (`GET/PATCH /users/me`) — 401 hasta que llegue auth (Fase 5)
- [x] `HashingService` (argon2) — módulo compartido y global
- [x] Primera migración (`CreateUsers`) generada + ejecutada (con extensión `uuid-ossp`)
- [x] Seeder de usuario admin + runner `npm run seed` (seed de roles/permisos diferido a la Fase 6)
- [x] **Verificado e2e** contra Postgres real: create (201, sin fuga de password), list (`{data,meta}` aplanado), get, update, duplicado→409, validación→400, soft delete→204, 404-tras-borrado, restore, `/me`→401, uuid-malo→400

---

## ✅ Fase 5 — Autenticación

- [x] Hashing de contraseñas `argon2` (vía el `HashingService` compartido)
- [x] Estrategias de Passport: `local`, `jwt` (access), `jwt-refresh` (cookie)
- [x] Endpoints: `register`, `login`, `refresh`, `logout`, `me`
- [x] Emisión de access + refresh token; refresh vía **cookie httpOnly**; **rotación** de refresh + detección de reuse (filas por sesión en `refresh_tokens` — multi-dispositivo, ver Hardening)
- [x] Decorator `@Public()` + **`JwtAuthGuard` global** (toda ruta protegida por defecto)
- [x] Revocación de tokens: abstracción `TokenBlacklistService` + impl en BD (`revoked_tokens`), intercambiable a Redis en la Fase 10
- [x] DTOs de auth (`RegisterDto`, `LoginDto`, `AuthResponseDto`) + anotaciones Swagger; throttle más estricto en login
- [x] Migración `CreateRevokedTokens` generada + ejecutada
- [x] **Verificado e2e**: login (200 + cookie), ruta protegida 401→200 con token, `/auth/me` y `/users/me` funcionan, pw incorrecta→401 `INVALID_CREDENTIALS`, refresh rota el token, logout→204, token revocado→401 `TOKEN_REVOKED`, refresh-tras-logout→401, register→201, duplicado→409

---

## ✅ Fase 6 — Autorización (RBAC + PBAC)

- [x] Entities `Role` y `Permission` (+ tablas de join `role_permissions`, `user_roles`; permisos eager en el rol)
- [x] Decorator `@Roles()` + `RolesGuard` global (any-of)
- [x] Decorator `@RequirePermissions()` + `PermissionsGuard` global (all-of, `resource:action`)
- [x] `BaseCrudController` acepta `permissions` por acción → PBAC declarativo para cualquier recurso
- [x] `AuthorizationService` (asignar roles) + rol `user` por defecto al registrarse
- [x] El principal del JWT ahora lleva `roles`/`permissions` reales (cargados vía `findByEmailWithRoles`)
- [x] Seed de roles base (`admin` = todo, `user` = solo lectura) + asignar `admin` al admin sembrado
- [x] Migración `CreateRbac` generada + ejecutada
- [x] **Verificado e2e**: admin (users:*) → GET 200 / POST 201 / DELETE 204; usuario normal (users:read) → GET 200, POST 403, DELETE 403 (`FORBIDDEN`, "Requires permission: users:create"), `/users/me` 200

---

## ✅ Fase 7 — OAuth (extensión)

- [x] Estrategia de Google (`passport-google-oauth20`), scope `email profile`
- [x] Estrategia de GitHub (`passport-github2`), scope `user:email`
- [x] `OAuthController`: rutas `/auth/{google,github}` (authorize) + `/callback`
- [x] Flujo de callback → `handleOAuthLogin`: buscar por providerId → enlazar email existente → si no, crear usuario sin contraseña (+ rol por defecto), luego emitir los JWT de la app + cookie de refresh
- [x] Estrategias registradas **solo cuando están activas + configuradas** (passport lanza con clientID vacío); los guards devuelven 404 cuando `OAUTH_ENABLED=false`
- [x] Reutiliza las columnas `provider`/`providerId` de la Fase 4 — **sin migración necesaria**
- [x] **Verificado**: apagado → la app levanta limpia, rutas 404; activado (creds dummy) → `/auth/google` y `/auth/github` redirigen 302 a los proveedores con redirect_uri/scope/client_id correctos (el callback completo necesita credenciales reales)

---

## ✅ Fase 8 — Observabilidad y Docs

- [x] Logging estructurado con **Pino** (`nestjs-pino`): `x-request-id` por petición (devuelto + usado por el filtro de excepciones), redacción de secretos, pretty en dev / JSON en prod
- [x] Logger del framework reemplazado por Pino (`app.useLogger`); peticiones a `/health` excluidas de los access logs
- [x] Health checks (`@nestjs/terminus`) en `/api/health` (version-neutral, público): ping a la BD + heap; forma nativa de Terminus vía `@RawResponse()`
- [x] **Swagger/OpenAPI** en `/api/docs` (+ `/api/docs-json`): auth bearer + cookie, `persistAuthorization`, tags, DTOs anotados
- [x] **Verificado**: `/api/health`→200 `{status:"ok", database:up}`, `/api/docs`→200 HTML, el spec de OpenAPI lista las rutas, cabecera `x-request-id` presente, logs estructurados con `responseTime`

---

## ✅ Fase 9 — Testing & CI

- [x] **Tests unitarios** con Jest (24): hashing, helpers de paginación, guards de roles/permisos, parser de duración, `extractAuthz`
- [x] **Tests e2e** (11) con Supertest: public/health, auth (register/login/me/dupe/bad-pw), RBAC/PBAC, refresh + revocación en logout
- [x] Estrategia de BD de test: `.env.test` (`NODE_ENV=test` → `template_test`, `DB_SYNCHRONIZE=true`, logs silenciosos); `ConfigModule` carga `.env.<NODE_ENV>` primero
- [x] `test/jest-e2e.json` + helper `createTestApp` (replica el middleware de `main.ts`) + `setup-e2e.ts`
- [x] Override de ESLint para archivos de test (relaja `no-unsafe-*` en los bodies de supertest)
- [x] CI en GitHub Actions (`.github/workflows/ci.yml`): servicio Postgres, `npm ci` → lint:check → build → unit → e2e
- [x] **Verificado localmente**: 24 unit + 11 e2e en verde, `lint:check` limpio, `build` limpio

---

## ✅ Fase 10 — Redis

- [x] `RedisModule` global (`ioredis`) que provee `REDIS_CLIENT` (o `null`) según `REDIS_ENABLED`; `quit()` graceful en el apagado
- [x] `RedisTokenBlacklistService` con **TTL nativo de claves** (sin cron de limpieza); `TokenBlacklistService` enlazado vía factory → Redis cuando está disponible, si no fallback a BD
- [x] Rotación de refresh + detección de reuse ya presentes (Fase 5); no afectadas por la elección de store
- [x] `/api/health` reporta `redis:up` cuando está activo
- [x] Servicio Redis de docker-compose usado
- [x] **Verificado**: activo → health muestra redis:up, logout escribe `bl:jti:*` (DBSIZE 0→1) con TTL ≈899s, token revocado→401 `TOKEN_REVOKED`; apagado → fallback a BD, e2e 11/11 en verde

---

## ✅ Fase 11 — Multi-tenancy (preparada, deshabilitada)

- [x] Contexto de petición con `AsyncLocalStorage` (`tenantStorage`) + `TenantContextService`
- [x] `TenantMiddleware` (header → subdominio → claim del JWT) — no-op mientras `MULTI_TENANT=false`
- [x] Decorator de parámetro `@Tenant()`
- [x] Hook de `tenantId` en `BaseEntity` → ahora un opt-in completo vía `TenantScopedEntity` + auto-scoping (ver Hardening post-1.0)
- [x] `TenancyModule` global; `GET /` devuelve el tenant resuelto cuando está activo (ruta de verificación)
- [x] USAGE.md → guía "Activar multi-tenancy" (pasos de columna + subscriber/scoping)
- [x] **Verificado en ambos estados**: apagado → respuesta sin cambios, `X-Tenant-ID` ignorado; activo → `tenant:"acme"` desde el header, `null` sin él; suite completa aún en verde (lint + 24 unit + 11 e2e)

---

## Extras (integrados en las fases de arriba)

- [x] Versionado de API (`/v1`) — Fase 1
- [ ] Envoltorio de respuesta `{ data, meta }` — Fase 3
- [x] Generador de módulos de feature (`npm run g:module -- <recurso>`) — scaffolding CRUD completo
      (entity/DTOs/service/controller/module) espejo de `modules/users`, con PBAC opcional. Ver USAGE §6

---

## ✅ Hardening post-1.0

- [x] **`Dockerfile`** multi-stage, no-root (solo deps + `dist/`; arranca Node directamente para apagado graceful)
- [x] **Swagger deshabilitado en producción** salvo que `SWAGGER_ENABLED=true`
- [x] **Límite de tamaño de body** de las peticiones (`APP_BODY_LIMIT`, default `1mb`) en los parsers json/urlencoded
- [x] Throttles por endpoint más estrictos en `auth/register` (5/min) y `auth/refresh` (20/min)
- [x] El CI corre un **servicio Redis** y e2e con `REDIS_ENABLED=true`, ejercitando el camino de blacklist en Redis
- [x] `.nvmrc` fija Node 20
- [x] **Refresh tokens multi-sesión**: tabla dedicada `refresh_tokens` (una fila por dispositivo), logins
      concurrentes, logout por sesión, y detección de reuse que revoca toda la familia de sesiones — los
      access tokens llevan un claim `sid` para que el logout apunte a la sesión exacta (migración `AddRefreshTokens`)
- [x] **Enforcement de tenant** (completar la Fase 11): `TenantScopedEntity` + `TenantSubscriber` (estampa
      `tenantId` en el insert) + auto-scoping de lecturas/updates/deletes en `BaseCrudService`. Opt-in por
      entidad, `tenantId` inmutable en update, y no-op mientras `MULTI_TENANT=false`
- [x] **Seam de reporte de errores**: `ErrorReporter` pluggable (token `ERROR_REPORTER`) consumido por el
      filtro de excepciones para errores 5xx; no-op por defecto, se cambia a Sentry/OTel sin tocar el filtro
- [x] **Verificado**: lint limpio, 33 unit + 14 e2e en verde (incl. multi-sesión/reuse, tenant-scoping y
      casos unit del error-reporter) contra Postgres, y 14/14 otra vez con `REDIS_ENABLED=true`
