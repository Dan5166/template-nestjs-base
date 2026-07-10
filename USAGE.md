# Usar este repo como plantilla

Guía paso a paso para arrancar un **proyecto nuevo** desde esta base. Los comandos se muestran para
**Windows / PowerShell** (el entorno en el que se construyó esta plantilla); se anotan los equivalentes
en bash donde difieren.

> La plantilla está **completa (las 11 fases)** — ver [ROADMAP.md](./ROADMAP.md) para la lista completa
> de features. Esta guía cubre tomarla como base para un proyecto nuevo: renombrar, configurar,
> inicializar la BD, añadir un módulo de feature y activar las piezas opcionales (OAuth, Redis,
> multi-tenancy). Para las pruebas del día a día de la API (flujo de auth, Swagger, ejemplos de PowerShell)
> ver el [README](./README.md).

---

## 1. Meter el código en un proyecto nuevo

Copia la plantilla y arranca un historial de git limpio (para que tu proyecto nuevo no arrastre los
commits de este repo):

```powershell
# Copia la carpeta (o clona y luego elimina .git)
Copy-Item -Recurse .\template .\my-new-api
cd .\my-new-api
Remove-Item -Recurse -Force .git
git init
```

> bash: `cp -r template my-new-api && cd my-new-api && rm -rf .git && git init`

---

## 2. Renombrar el proyecto

El nombre `template` aparece en algunos sitios. Reemplázalo con el nombre de tu proyecto (p. ej. `my-api`):

| Archivo | Qué cambiar |
| --- | --- |
| `package.json` | `"name"`, `"description"`, `"author"` |
| `README.md` | Título y descripción |
| `docker-compose.yml` | `container_name: template_postgres` / `template_redis` → tu prefijo |
| `.env` / `.env.example` | `APP_NAME`, `DB_DATABASE` |

Búsqueda rápida de referencias restantes:

```powershell
Select-String -Path .\src\*, .\*.json, .\*.yml -Pattern "template" -SimpleMatch
```

> bash: `grep -rn "template" src *.json *.yml`

Nada en `src/` codifica el nombre a mano (lo lee de `APP_NAME` en la config), así que renombrar es
mayormente cosmético + los nombres de contenedores Docker + el nombre de la base de datos.

---

## 3. Crear y configurar tu `.env`

```powershell
Copy-Item .env.example .env
```

Luego edita `.env`. Las variables que casi siempre vas a tocar:

| Variable | Notas |
| --- | --- |
| `APP_NAME` | El nombre de tu app (se muestra en los logs y en `GET /`) |
| `APP_PORT` | Puerto HTTP (default `3000`) |
| `CORS_ORIGINS` | `*` en dev; una allow-list separada por comas en prod |
| `DB_DATABASE` | El nombre de tu base de datos |
| `DB_PORT` | `5432` por defecto; usa `5433` si un Postgres local ya ocupa el 5432 |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciales de la BD |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Genera secretos fuertes — ver abajo** |

La app **valida cada variable al arrancar (Joi)** y se niega a levantar si falta una o es inválida —
así un `.env` mal configurado falla rápido con un mensaje claro.

### Generar secretos JWT

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Ejecútalo dos veces y pega los valores en `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.
Nunca commitees `.env` (está en gitignore); commitea solo `.env.example`.

---

## 4. Arrancar la base de datos e inicializar

```powershell
docker compose up -d postgres   # o: docker compose up -d   (también arranca Redis)
npm install
npm run migration:run           # aplicar migraciones
npm run seed                    # sembrar roles/permisos base + usuario admin (SEED_ADMIN_*)
```

> Si renombraste `DB_DATABASE`, el contenedor crea esa base de datos automáticamente en el primer
> arranque (lee `DB_DATABASE` vía docker-compose). Si ya habías arrancado el contenedor con el nombre
> viejo, recréalo: `docker compose down -v; docker compose up -d postgres`
> (⚠️ `-v` borra el volumen/los datos).

---

## 5. Ejecutarlo

```powershell
npm run start:dev
```

API: `http://localhost:3000/api/v1`. Ver la
[sección de Pruebas manuales en el README](./README.md#pruebas-manuales-windows--powershell) para saber
cómo ejercitar los endpoints desde PowerShell.

---

## 6. Añadir tu primer módulo de feature

La plantilla te da un CRUD genérico, así que un recurso nuevo es mayormente cableado. Ejemplo — un
recurso `Product`:

**1) Entity** — extiende `BaseEntity` (te da `id`, timestamps, soft delete, version):

```ts
// src/modules/products/entities/product.entity.ts
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int', default: 0 })
  stock: number;
}
```

**2) DTOs** — DTOs de request separados de la entity:

```ts
// create-product.dto.ts
import { IsInt, IsString, Min } from 'class-validator';
export class CreateProductDto {
  @IsString() name: string;
  @IsInt() @Min(0) stock: number;
}
// update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**3) Service** — extiende `BaseCrudService` y declara los campos buscables/ordenables:

```ts
@Injectable()
export class ProductsService extends BaseCrudService<Product> {
  protected readonly alias = 'product';
  protected override searchableFields = ['name'];
  protected override sortableFields = ['createdAt', 'name', 'stock'];
  constructor(@InjectRepository(Product) repo: Repository<Product>) {
    super(repo);
  }
}
```

**4) Controller** — extiende el `BaseCrudController` genérico. Opcionalmente protege cada
acción con un permiso granular (PBAC):

```ts
@ApiBearerAuth()
@ApiTags('products')
@Controller('products')
export class ProductsController extends BaseCrudController<Product, CreateProductDto, UpdateProductDto>({
  createDto: CreateProductDto,
  updateDto: UpdateProductDto,
  permissions: {
    read: 'products:read',
    create: 'products:create',
    update: 'products:update',
    delete: 'products:delete',
  },
}) {
  constructor(protected readonly service: ProductsService) {
    super();
  }
}
```

Obtienes gratis: `POST /products`, `GET /products` (paginado + `?search=&sortBy=&order=`),
`GET /products/:id`, `PATCH /products/:id`, `DELETE /products/:id` (soft), `PATCH /products/:id/restore`.

**Autorización:** toda ruta ya requiere un access token válido (`JwtAuthGuard` global).
Añade `@Public()` para abrir una ruta, `@Roles('admin')` para restringir por rol, o
`@RequirePermissions('products:create')` para control granular. Siembra los permisos base en el
seeder de RBAC (`src/database/seeds/rbac.seeder.ts`) para que una BD nueva los tenga; en runtime también
puedes gestionar roles y permisos a través de la API (abajo).

### Gestionar roles y permisos vía la API

El rol `admin` puede gestionar RBAC a través de endpoints REST (todos requieren el permiso
`roles:*` / `permissions:*` / `users:assign-roles` correspondiente):

| Endpoint | Propósito |
| --- | --- |
| `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id` | CRUD de roles; `POST`/`PATCH` aceptan `permissions: string[]` (nombres) para fijar los grants del rol |
| `GET/POST /permissions`, `DELETE /permissions/:id` | Listar/crear/borrar permisos (`{ resource, action }` → `resource:action`) |
| `GET/POST /users/:userId/roles`, `DELETE /users/:userId/roles/:roleName` | Leer / asignar / quitar los roles de un usuario |

> Los cambios de permisos surten efecto en el **siguiente login** del usuario (los roles/permisos del
> principal se incrustan en el access token al iniciar sesión y se resuelven en fresco en cada petición
> desde la identidad del token). Los defaults sembrados siguen viviendo en código para que un entorno
> nuevo sea reproducible.

**5) Module + registro** — `TypeOrmModule.forFeature([Product])`, luego añade `ProductsModule` a
`AppModule`.

**6) Migración** — genera y ejecuta:

```powershell
npm run migration:generate -- src/database/migrations/CreateProducts
npm run migration:run
```

> El `MeController` en el módulo de usuarios muestra cómo añadir rutas **personalizadas** junto a las
> genéricas (y por qué rutas literales como `/me` se registran antes que `/:id`).

---

## 7. Activar multi-tenancy (opcional)

La plantilla trae **tenancy apagado por defecto** (`MULTI_TENANT=false`), así que no añade ningún
comportamiento hasta que optas por él. Lo que ya está cableado:

- `TenantMiddleware` — establece un contexto de AsyncLocalStorage por petición; cuando está activo
  resuelve el tenant desde la cabecera `X-Tenant-ID` → sub-dominio → claim `tenantId` del JWT.
- `TenantContextService` (`getTenantId()`) / helper `getTenantId()` — lee el tenant activo desde
  cualquier lado, con o sin DI.
- `@Tenant()` — decorator de parámetro para inyectar el id del tenant en un handler.
- `TenantScopedEntity` — extiéndela (en vez de `BaseEntity`) para hacer un recurso tenant-scoped.
- `TenantSubscriber` — estampa `tenantId` en el insert de las entidades scoped.
- `BaseCrudService` — filtra automáticamente lecturas/updates/deletes al tenant activo para las
  entidades scoped.

Activar el aislamiento de datos real (BD compartida, estrategia de columna `tenantId`) son ahora dos pasos:

1. **Activa el flag:** `MULTI_TENANT=true` en `.env`.
2. **Haz el recurso tenant-scoped** — extiende `TenantScopedEntity` en vez de `BaseEntity`:

   ```ts
   @Entity('invoices')
   export class Invoice extends TenantScopedEntity {
     @Column() amount: number;
   }
   ```
   Genera + ejecuta una migración (añade la columna `tenant_id` + índice). Eso es todo — cualquier
   service que extienda `BaseCrudService` ahora estampa el tenant en el create y limita cada
   `findAll/findOne/update/remove/restore` a él. Las tablas globales (users, roles, permissions) siguen
   extendiendo `BaseEntity` y se mantienen compartidas.

3. **Elige cómo se identifican los tenants** — sobreescribe `TenantMiddleware.resolveTenant()` si no
   usas la cabecera `X-Tenant-ID` (p. ej. siempre el claim del JWT).

> **Queries personalizadas:** solo el CRUD que pasa por `BaseCrudService` se auto-scopea. Si escribes tus
> propias llamadas de repository/query-builder contra una entidad scoped, añade el filtro tú mismo con
> `getTenantId()` (o `TenantContextService`) — p. ej. `qb.andWhere('e.tenantId = :t', { t })`.

Verifícalo rápido: con `MULTI_TENANT=true`, `GET /api/v1` devuelve el tenant resuelto
(`curl -H "X-Tenant-ID: acme" http://localhost:3000/api/v1` → `"tenant":"acme"`).

## 8. Features opcionales (feature flags)

Todo lo de abajo está **apagado por defecto** y se activa vía `.env` — sin cambios de código:

| Feature | Activar con | Entonces |
| --- | --- | --- |
| **Redis** blacklist de tokens (TTL nativo) | `REDIS_ENABLED=true` (+ `docker compose up -d redis`) | Logout/revocación se mueve de Postgres a Redis automáticamente; `/api/health` reporta `redis`. |
| **OAuth** (Google / GitHub) | `OAUTH_ENABLED=true` + `*_CLIENT_ID` / `*_CLIENT_SECRET` / `*_CALLBACK_URL` del proveedor | `/api/v1/auth/google` y `/auth/github` se activan (302 → proveedor). |
| **Multi-tenancy** | `MULTI_TENANT=true` | Ver §7 arriba. |

### Reporte de errores / observabilidad

Los errores de servidor (5xx) siempre se loguean, y el `AllExceptionsFilter` además los pasa a un
`ErrorReporter` pluggable. El default es un **no-op** (nada sale de la app), así que cablear un tracker
externo es solo enlazar tu propia implementación al token `ERROR_REPORTER` — sin cambios en el filtro.

1. Instala tu SDK (p. ej. `npm i @sentry/node`) e inicialízalo una vez en `main.ts` antes de `listen()`.
2. Implementa el reporter y reenlaza el token en `ObservabilityModule`:

   ```ts
   // src/common/observability/sentry-error-reporter.ts
   import * as Sentry from '@sentry/node';
   import { ErrorContext, ErrorReporter } from './error-reporter';

   export class SentryErrorReporter implements ErrorReporter {
     report(error: unknown, context: ErrorContext): void {
       Sentry.withScope((scope) => {
         scope.setTags({ path: context.path, method: context.method, code: context.code });
         if (context.requestId) scope.setTag('requestId', context.requestId);
         Sentry.captureException(error);
       });
     }
   }
   ```

   ```ts
   // observability.module.ts
   providers: [{ provide: ERROR_REPORTER, useClass: SentryErrorReporter }],
   ```

Solo `statusCode >= 500` llega al reporter (los errores de cliente 4xx esperados no son ruido), y un
reporter que lance excepción se captura para que nunca rompa la respuesta.

## 9. Dónde buscar tareas comunes

| Quiero… | Mira |
| --- | --- |
| Obtener un token / probar el flujo de auth | [README → Pruebas manuales](./README.md#pruebas-manuales-windows--powershell) |
| Explorar endpoints en el navegador | Swagger UI en `http://localhost:3000/api/docs` |
| Añadir un recurso protegido | §6 arriba (CRUD genérico + `@RequirePermissions`) |
| Añadir roles/permisos | `src/database/seeds/rbac.seeder.ts`, luego `npm run seed` |
| Cambiar tiempos de vida / secretos de tokens | `.env` (`JWT_*`) |
| Ejecutar tests | `npm test` (unit) · `npm run test:e2e` — ver [README → Pruebas](./README.md#pruebas) |
| Ver qué está implementado | [ROADMAP.md](./ROADMAP.md) |

## 10. Antes de ir a producción (checklist)

- [ ] Secretos `JWT_*` reales y únicos (no los placeholders de `.env.example`).
- [ ] `DB_SYNCHRONIZE=false` (siempre usa migraciones — es el default).
- [ ] `CORS_ORIGINS` apuntando a tu(s) origen(es) de front-end real(es), no `*`.
- [ ] `LOG_PRETTY=false` (logs en JSON) y un `LOG_LEVEL` apropiado.
- [ ] Rotar `SEED_ADMIN_PASSWORD` o borrar el admin sembrado tras crear cuentas reales.
- [ ] Revisar los límites de tasa — `THROTTLE_*` global más los límites por endpoint en `auth/*`.
- [ ] `NODE_ENV=production` (esto además **deshabilita Swagger** salvo que `SWAGGER_ENABLED=true`).
- [ ] Poner `APP_BODY_LIMIT` en el tamaño más pequeño que tu API necesite (default `1mb`).
- [ ] Construir y desplegar la imagen de producción — `docker build -t my-api .` (ver
      [README → Despliegue](./README.md#despliegue)).

---

## Dónde vive cada cosa

```
src/
├── config/     # validación de env (Joi) + namespaces de config tipados
├── common/     # base entity, exception filter, interceptors, paginación, BaseCrud*
├── database/   # data-source, migraciones, seeds
├── shared/     # providers entre módulos (p. ej. HashingService)
└── modules/    # tus módulos de feature (users, ...)
```

Para el panorama completo de lo implementado vs pendiente, ver [ROADMAP.md](./ROADMAP.md).
