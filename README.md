# template

Plantilla base para proyectos NestJS — arquitectura modular, autenticación JWT (access + refresh),
RBAC + permisos granulares (PBAC), TypeORM + PostgreSQL, TypeScript estricto y una configuración
completa de tooling/seguridad/observabilidad.

> Construida por fases. Consulta el **Roadmap** más abajo para ver qué está implementado y qué queda pendiente.

> 🧩 **¿Vas a arrancar un proyecto nuevo desde esta plantilla?** Lee **[USAGE.md](./USAGE.md)** — cómo
> renombrar, configurar los secretos, inicializar la BD y añadir tu primer módulo de feature.

## Stack tecnológico

| Aspecto            | Elección                                      |
| ------------------ | --------------------------------------------- |
| Framework          | NestJS 11                                     |
| Lenguaje           | TypeScript (modo estricto)                    |
| ORM / BD           | TypeORM + PostgreSQL                          |
| Auth               | Passport (JWT + local), hashing argon2, rotación de refresh multi-sesión |
| Autorización       | RBAC (`@Roles()`) + PBAC (`@RequirePermissions()`) |
| Validación de config | `@nestjs/config` + Joi                      |
| Logging            | Pino (`nestjs-pino`)                          |
| Docs               | Swagger / OpenAPI (apagado en producción por defecto) |
| Seguridad          | Helmet, CORS, `@nestjs/throttler`, límite de tamaño de body, validación estricta |
| Testing            | Jest (unit + e2e con Supertest)              |

## Requisitos

- Node.js >= 20 (un `.nvmrc` fija `20` — ejecuta `nvm use`)
- npm >= 10
- Docker (para PostgreSQL / Redis vía `docker-compose`, y la imagen de producción — ver [Despliegue](#despliegue))

## Primeros pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de entorno y ajustar los secretos
cp .env.example .env            # PowerShell: Copy-Item .env.example .env

# 3. Ejecutar en modo watch
npm run start:dev
```

La API se sirve bajo un prefijo versionado: `http://localhost:3000/api/v1`.

> **Usuarios de Windows:** consulta [Pruebas manuales (Windows / PowerShell)](#pruebas-manuales-windows--powershell)
> para un recorrido completo de configuración + pruebas usando PowerShell.

## Scripts disponibles

| Script                     | Descripción                                  |
| -------------------------- | -------------------------------------------- |
| `npm run start:dev`        | Arrancar en modo watch                       |
| `npm run build`            | Compilar a `dist/`                           |
| `npm run lint`             | Lint con auto-fix                            |
| `npm run format`           | Formatear con Prettier                       |
| `npm test`                 | Tests unitarios                              |
| `npm run test:e2e`         | Tests end-to-end                             |
| `npm run migration:run`    | Ejecutar migraciones TypeORM pendientes (Fase 2) |
| `npm run seed`             | Sembrar datos base (Fase 4)                  |

## Variables de entorno

Todas las variables están documentadas y validadas. Ver [`.env.example`](./.env.example) — la app
falla rápido al arrancar si falta una variable requerida o es inválida.

## Pruebas manuales (Windows / PowerShell)

> 🚀 **Swagger UI** está disponible en **`http://localhost:3000/api/docs`** — la forma más fácil de
> explorar y probar endpoints desde el navegador (haz clic en **Authorize** y pega un access token JWT).
> El JSON de OpenAPI está en `/api/docs-json`. Un **health check** vive en `/api/health`.
>
> ℹ️ Las docs están **deshabilitadas cuando `NODE_ENV=production`** (para que la superficie de la API no
> sea públicamente enumerable). Pon `SWAGGER_ENABLED=true` para forzarlas ahí — p. ej. detrás de un gateway interno.
>
> La autenticación está activa: **toda ruta requiere un access token Bearer** salvo las marcadas con
> `@Public()` (`GET /`, `/api/health`, `POST /auth/register`, `POST /auth/login`,
> `POST /auth/refresh`). Los endpoints de auth públicos además llevan **límites de tasa por minuto más
> estrictos** que el throttler global (`register` 5, `login` 10, `refresh` 20) para frenar la fuerza bruta
> y el registro automatizado. También puedes probar con PowerShell, Postman, o las extensiones de VS Code
> REST Client / Thunder Client como se muestra abajo.

⚠️ En PowerShell, `curl` es un **alias de `Invoke-WebRequest`** y se comporta distinto al curl real.
Usa **`Invoke-RestMethod`** (parsea JSON automáticamente) o llama a **`curl.exe`** explícitamente.

### 1. Levantar el stack

```powershell
docker compose up -d postgres   # PostgreSQL (publicado en el DB_PORT del .env)
npm install                     # solo la primera vez
npm run migration:run           # crear la tabla de usuarios
npm run seed                    # crear el usuario admin (admin@template.local)
npm run start:dev               # API en http://localhost:3000/api/v1
```

> **Nota sobre el puerto:** si un PostgreSQL local ya ocupa el `5432`, pon `DB_PORT=5433` en `.env`
> (docker-compose publica ese puerto). Compruébalo con:
> `Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue`

### 2. Lo más fácil: probar en el navegador (Swagger UI)

Sin herramientas — con la app corriendo, abre **http://localhost:3000/api/docs**.

1. Expande **`POST /auth/login`** → **Try it out** → inicia sesión como el admin sembrado:
   ```json
   { "email": "admin@template.local", "password": "Admin123!" }
   ```
   **Execute**, luego copia el `accessToken` de la respuesta.
2. Haz clic en **Authorize** 🔒 (arriba a la derecha), pega el token, **Authorize**, **Close**.
   Ahora cada petición protegida se envía con tu token `Bearer`.
3. Prueba cualquier endpoint — p. ej. `GET /users`, `POST /users`, `GET /users/me`, `POST /auth/logout`.
   Usa **Try it out → Execute** e inspecciona la respuesta, el código de estado y las cabeceras.

> ¿Prefieres la consola? Las secciones 3–5 de abajo hacen lo mismo desde PowerShell. El health check
> (`GET /api/health`, público) y el JSON de OpenAPI (`/api/docs-json`) no requieren auth.

### 3. PowerShell — autenticarse (obtener un token)

```powershell
$base = "http://localhost:3000/api/v1"

# Registrar una cuenta nueva (o inicia sesión con el admin sembrado más abajo)
$reg = @{ email = "test@example.com"; password = "Str0ng!Pass"; firstName = "Test" } | ConvertTo-Json
$auth = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body $reg

# O inicia sesión como el admin sembrado
$login = @{ email = "admin@template.local"; password = "Admin123!" } | ConvertTo-Json
$auth  = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body $login

# Construir la cabecera de auth usada en todas las llamadas protegidas de abajo
$token   = $auth.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

# ¿Quién soy?
Invoke-RestMethod "$base/auth/me" -Headers $headers
```

> El **refresh token** se establece como cookie httpOnly, así que `Invoke-RestMethod` no puede leerlo.
> Para probar `/auth/refresh` y `/auth/logout` de punta a punta, usa `curl.exe` con un cookie jar
> (`-c cookies.txt -b cookies.txt`) o Postman (que guarda las cookies automáticamente).

### 4. PowerShell — peticiones con `Invoke-RestMethod` (rutas protegidas)

```powershell
# La info de la app es pública (no necesita cabecera)
Invoke-RestMethod "$base"

# Crear un usuario (protegido — pasa $headers)
$body = @{ email = "someone@example.com"; password = "Str0ng!Pass"; firstName = "Sam" } | ConvertTo-Json
$created = Invoke-RestMethod "$base/users" -Method Post -Headers $headers -ContentType "application/json" -Body $body
$created.data
$id = $created.data.id      # guarda el id para las siguientes llamadas

# Listar (paginación + búsqueda + orden)
Invoke-RestMethod "$base/users?page=1&limit=10&sortBy=email&order=ASC&search=sam" -Headers $headers

# Obtener uno
Invoke-RestMethod "$base/users/$id" -Headers $headers

# Actualizar
$patch = @{ firstName = "Nuevo" } | ConvertTo-Json
Invoke-RestMethod "$base/users/$id" -Method Patch -Headers $headers -ContentType "application/json" -Body $patch

# Soft delete (204) y luego restaurar
Invoke-RestMethod "$base/users/$id" -Method Delete -Headers $headers
Invoke-RestMethod "$base/users/$id/restore" -Method Patch -Headers $headers

# Actualizar tu propio perfil
$mine = @{ firstName = "Me" } | ConvertTo-Json
Invoke-RestMethod "$base/users/me" -Method Patch -Headers $headers -ContentType "application/json" -Body $mine
```

Para ver el cuerpo de una respuesta de **error** (PowerShell lanza excepción en 4xx/5xx):

```powershell
try {
  $dup = @{ email = "someone@example.com"; password = "Str0ng!Pass" } | ConvertTo-Json
  Invoke-RestMethod "$base/users" -Method Post -Headers $headers -ContentType "application/json" -Body $dup
} catch {
  $_.ErrorDetails.Message   # estandarizado { statusCode, code, message, timestamp, path, method }
}
```

### 5. Flujo de auth completo con `curl.exe` (cookies para refresh/logout)

```powershell
$b = "http://localhost:3000/api/v1"
# login — guarda la cookie de refresh en cookies.txt
curl.exe -c cookies.txt -X POST "$b/auth/login" -H "Content-Type: application/json" -d '{\"email\":\"admin@template.local\",\"password\":\"Admin123!\"}'
# refresh — envía + actualiza la cookie (devuelve un nuevo access token)
curl.exe -b cookies.txt -c cookies.txt -X POST "$b/auth/refresh"
# logout — necesita el access token; limpia la cookie de refresh
curl.exe -b cookies.txt -X POST "$b/auth/logout" -H "Authorization: Bearer <accessToken>"
```

### 6. Checklist de features — qué verificar

Ejecuta esto (en Swagger o PowerShell) para confirmar que cada parte de la plantilla funciona:

| Feature | Cómo probarlo | Esperado |
| --- | --- | --- |
| Health check | `GET /api/health` (público) | `200`, `status: ok`, database `up` |
| Login | `POST /auth/login` como admin | `200` + `accessToken` |
| Guard de auth global | `GET /users` **sin** token | `401` |
| Guard de auth (caso feliz) | `GET /users` **con** un token válido | `200` |
| Credenciales incorrectas | login con contraseña mala | `401` `INVALID_CREDENTIALS` |
| Contraseña oculta | cualquier respuesta de usuario | nunca aparece el campo `password` |
| Validación de entrada | `POST /users` contraseña débil / campo extra | `400` + lista de errores |
| Email duplicado | registrar/crear un email existente | `409` `EMAIL_ALREADY_EXISTS` |
| RBAC/PBAC — denegado | como usuario **normal**, `POST /users` | `403` (solo tiene `users:read`) |
| RBAC/PBAC — permitido | como **admin**, `POST /users` | `201` |
| Paginación | `GET /users?page=1&limit=5&search=admin` | envoltorio `{ data, meta }` |
| Soft delete | `DELETE /users/:id` y luego `GET /users/:id` | `204`, luego `404` |
| Restore | `PATCH /users/:id/restore` | `200` |
| Revocación de token | `logout`, luego reusar ese access token | `401` `TOKEN_REVOKED` |
| Multi-sesión | inicia sesión dos veces, `refresh` con la cookie de la **primera** sesión | `200` (ambas sesiones vivas) |
| Logout por sesión | `logout` de una sesión; el access token de la otra | sigue `200` en `/auth/me` |
| Detección de reuse de refresh | rota vía `refresh`, luego reproduce la cookie **vieja** | `401` `TOKEN_REVOKED` (familia revocada) |
| Forma del error | provoca cualquier error | `{ statusCode, code, message, timestamp, path, method }` |

### 7. Inspeccionar la base de datos directamente

```powershell
docker exec -it template_postgres psql -U postgres -d template -c "select id, email, is_active, deleted_at from users;"
```

### Solución de problemas

- **La app no arranca / puerto 3000 ocupado** — puede haber un proceso Node zombi reteniéndolo. Encuéntralo y mátalo:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -Expand OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
  ```
- **`password authentication failed`** — la app está pegándole a un PostgreSQL local en vez de al
  contenedor. Apunta `DB_PORT` al puerto publicado del contenedor (p. ej. `5433`).

## Pruebas

```powershell
npm test           # tests unitarios (Jest)
npm run test:e2e   # tests end-to-end (Supertest, contra un Postgres real)
npm run test:cov   # cobertura
```

**Setup de E2E:** los tests e2e corren contra una base de datos separada (`template_test`) con
auto-sync de esquema, configurada en [`.env.test`](./.env.test) (`NODE_ENV=test`). Créala una vez:

```powershell
docker exec template_postgres createdb -U postgres template_test
```

La suite siembra los roles/permisos base por sí misma y limpia con emails únicos por corrida.
El CI (GitHub Actions, [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) ejecuta
`lint → build → unit → e2e` en cada push/PR contra servicios de Postgres **y** Redis — el job de e2e
corre con `REDIS_ENABLED=true` para que la blacklist de tokens en Redis (el default de producción)
se ejercite, no solo el fallback en Postgres.

## Despliegue

Un [`Dockerfile`](./Dockerfile) multi-stage construye una imagen de producción ligera (solo deps +
`dist/` compilado) que corre como usuario `node` no-root y arranca Node directamente, de modo que
`SIGTERM` llega al proceso y se disparan los hooks de apagado graceful.

```bash
docker build -t my-api .
docker run --rm -p 3000:3000 --env-file .env my-api
```

Pon `NODE_ENV=production` en el entorno del contenedor. Recuerda que Swagger está apagado en producción
salvo que `SWAGGER_ENABLED=true`, y limita el tamaño de las peticiones con `APP_BODY_LIMIT` (default `1mb`).

## Estructura del proyecto

```
src/
├── config/            # Configuración validada y por namespaces (Joi)
├── common/            # Transversal: filters, interceptors, guards, decorators, DTOs (Fase 3)
├── database/          # Data-source de TypeORM, migraciones, seeds (Fase 2/4)
├── shared/            # Providers/servicios reutilizables entre módulos
├── modules/           # Módulos de feature (users, auth, ...) (Fase 4+)
├── app.controller.ts
├── app.module.ts
└── main.ts
```

## Roadmap

Entrega por fases — **las 11 fases completas** ✅. Checklist completo por fase en **[ROADMAP.md](./ROADMAP.md)**.

Foundation · Database · Common/CRUD base · Users · Auth (JWT + refresh) · RBAC/PBAC · OAuth ·
Observabilidad (Pino/Terminus/Swagger) · Testing & CI · Blacklist en Redis · Hooks de multi-tenancy.

## Licencia

MIT
