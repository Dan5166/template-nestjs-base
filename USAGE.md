# Using this repo as a template

A step-by-step guide to spin up a **new project** from this base. Commands are shown for
**Windows / PowerShell** (the environment this template was built on); bash equivalents are
noted where they differ.

> The template is **complete (all 11 phases)** — see [ROADMAP.md](./ROADMAP.md) for the full
> feature list. This guide covers taking it as a base for a new project: rename, configure,
> initialize the DB, add a feature module, and turn on the optional pieces (OAuth, Redis,
> multi-tenancy). For day-to-day API testing (auth flow, Swagger, PowerShell examples) see the
> [README](./README.md).

---

## 1. Get the code into a fresh project

Copy the template and start a clean git history (so your new project doesn't carry this repo's
commits):

```powershell
# Copy the folder (or clone, then remove .git)
Copy-Item -Recurse .\template .\my-new-api
cd .\my-new-api
Remove-Item -Recurse -Force .git
git init
```

> bash: `cp -r template my-new-api && cd my-new-api && rm -rf .git && git init`

---

## 2. Rename the project

The name `template` appears in a few places. Replace it with your project name (e.g. `my-api`):

| File | What to change |
| --- | --- |
| `package.json` | `"name"`, `"description"`, `"author"` |
| `README.md` | Title and description |
| `docker-compose.yml` | `container_name: template_postgres` / `template_redis` → your prefix |
| `.env` / `.env.example` | `APP_NAME`, `DB_DATABASE` |

Quick find of remaining references:

```powershell
Select-String -Path .\src\*, .\*.json, .\*.yml -Pattern "template" -SimpleMatch
```

> bash: `grep -rn "template" src *.json *.yml`

Nothing in `src/` hard-codes the name (it reads `APP_NAME` from config), so renaming is mostly
cosmetic + Docker container names + the database name.

---

## 3. Create and configure your `.env`

```powershell
Copy-Item .env.example .env
```

Then edit `.env`. The variables you'll almost always touch:

| Variable | Notes |
| --- | --- |
| `APP_NAME` | Your app's name (shown in logs and `GET /`) |
| `APP_PORT` | HTTP port (default `3000`) |
| `CORS_ORIGINS` | `*` in dev; a comma-separated allow-list in prod |
| `DB_DATABASE` | Your database name |
| `DB_PORT` | `5432` by default; use `5433` if a local Postgres already owns 5432 |
| `DB_USERNAME` / `DB_PASSWORD` | DB credentials |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Generate strong secrets — see below** |

The app **validates every variable on startup (Joi)** and refuses to boot if one is missing or
invalid — so a misconfigured `.env` fails fast with a clear message.

### Generate JWT secrets

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it twice and paste the values into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
Never commit `.env` (it's git-ignored); commit only `.env.example`.

---

## 4. Start the database and initialize

```powershell
docker compose up -d postgres   # or: docker compose up -d   (also starts Redis)
npm install
npm run migration:run           # apply migrations
npm run seed                    # seed base roles/permissions + admin user (SEED_ADMIN_*)
```

> If you renamed `DB_DATABASE`, the container creates that database automatically on first run
> (it reads `DB_DATABASE` via docker-compose). If you had already started the container under
> the old name, recreate it: `docker compose down -v; docker compose up -d postgres`
> (⚠️ `-v` wipes the volume/data).

---

## 5. Run it

```powershell
npm run start:dev
```

API: `http://localhost:3000/api/v1`. See the
[Manual testing section in the README](./README.md#manual-testing-windows--powershell) for how
to exercise the endpoints from PowerShell.

---

## 6. Add your first feature module

The template gives you generic CRUD so a new resource is mostly wiring. Example — a `Product`
resource:

**1) Entity** — extend `BaseEntity` (gives `id`, timestamps, soft delete, version):

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

**2) DTOs** — request DTOs separate from the entity:

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

**3) Service** — extend `BaseCrudService` and declare searchable/sortable fields:

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

**4) Controller** — extend the generic `BaseCrudController`. Optionally guard each
action with a granular permission (PBAC):

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

You get for free: `POST /products`, `GET /products` (paginated + `?search=&sortBy=&order=`),
`GET /products/:id`, `PATCH /products/:id`, `DELETE /products/:id` (soft), `PATCH /products/:id/restore`.

**Authorization:** every route already requires a valid access token (global `JwtAuthGuard`).
Add `@Public()` to open a route, `@Roles('admin')` to gate by role, or
`@RequirePermissions('products:create')` for granular control. Seed baseline permissions in the
RBAC seeder (`src/database/seeds/rbac.seeder.ts`) so a fresh DB has them; at runtime you can also
manage roles and permissions through the API (below).

### Managing roles & permissions via the API

The `admin` role can manage RBAC through REST endpoints (all require the matching
`roles:*` / `permissions:*` / `users:assign-roles` permission):

| Endpoint | Purpose |
| --- | --- |
| `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id` | CRUD roles; `POST`/`PATCH` accept `permissions: string[]` (names) to set the role's grants |
| `GET/POST /permissions`, `DELETE /permissions/:id` | List/create/delete permissions (`{ resource, action }` → `resource:action`) |
| `GET/POST /users/:userId/roles`, `DELETE /users/:userId/roles/:roleName` | Read / assign / remove a user's roles |

> Permission changes take effect on the user's **next login** (the principal's roles/permissions
> are baked into the access token at sign-in and resolved fresh each request from the token's
> identity). Seed defaults still live in code so a new environment is reproducible.

**5) Module + register** — `TypeOrmModule.forFeature([Product])`, then add `ProductsModule` to
`AppModule`.

**6) Migration** — generate and run:

```powershell
npm run migration:generate -- src/database/migrations/CreateProducts
npm run migration:run
```

> `MeController` in the users module shows how to add **custom** routes alongside the generic
> ones (and why literal routes like `/me` are registered before `/:id`).

---

## 7. Enabling multi-tenancy (optional)

The template ships **tenancy scaffolding that is off by default** (`MULTI_TENANT=false`), so it
adds zero behavior until you opt in. What's already wired:

- `TenantMiddleware` — establishes an AsyncLocalStorage context per request; when enabled it
  resolves the tenant from the `X-Tenant-ID` header → sub-domain → JWT `tenantId` claim.
- `TenantContextService` — inject anywhere to read the active tenant (`getTenantId()`).
- `@Tenant()` — param decorator to inject the tenant id into a handler.
- A documented hook on `BaseEntity` for adding a `tenantId` column.

To turn it into real data isolation (shared-DB, `tenantId` column strategy):

1. **Enable the flag:** `MULTI_TENANT=true` in `.env`.
2. **Add the column** to the entities that need it (or to `BaseEntity` for all):

   ```ts
   @Index()
   @Column({ type: 'uuid', nullable: true })
   tenantId: string | null;
   ```
   Then generate + run a migration.

3. **Scope writes and reads** by the current tenant. The clean way is a TypeORM
   `EntitySubscriber` that stamps `tenantId` on insert and a base-service filter that adds
   `WHERE tenant_id = :tenantId` using `TenantContextService.getTenantId()`. For a quick start,
   filter explicitly in your service:

   ```ts
   const tenantId = this.tenantContext.getTenantId();
   qb.andWhere('entity.tenantId = :tenantId', { tenantId });
   ```

4. **Choose how tenants are identified** — override `TenantMiddleware.resolveTenant()` if you
   don't use the `X-Tenant-ID` header (e.g. always the JWT claim).

Verify quickly: with `MULTI_TENANT=true`, `GET /api/v1` echoes the resolved tenant
(`curl -H "X-Tenant-ID: acme" http://localhost:3000/api/v1` → `"tenant":"acme"`).

## 8. Optional features (feature flags)

Everything below is **off by default** and flips on via `.env` — no code changes needed:

| Feature | Enable with | Then |
| --- | --- | --- |
| **Redis** token blacklist (native TTL) | `REDIS_ENABLED=true` (+ `docker compose up -d redis`) | Logout/revocation moves from Postgres to Redis automatically; `/api/health` reports `redis`. |
| **OAuth** (Google / GitHub) | `OAUTH_ENABLED=true` + provider `*_CLIENT_ID` / `*_CLIENT_SECRET` / `*_CALLBACK_URL` | `/api/v1/auth/google` and `/auth/github` become live (302 → provider). |
| **Multi-tenancy** | `MULTI_TENANT=true` | See §7 above. |

## 9. Where to look for common tasks

| I want to… | Look at |
| --- | --- |
| Get a token / test the auth flow | [README → Manual testing](./README.md#manual-testing-windows--powershell) |
| Explore endpoints in the browser | Swagger UI at `http://localhost:3000/api/docs` |
| Add a protected resource | §6 above (generic CRUD + `@RequirePermissions`) |
| Add roles/permissions | `src/database/seeds/rbac.seeder.ts`, then `npm run seed` |
| Change token lifetimes / secrets | `.env` (`JWT_*`) |
| Run tests | `npm test` (unit) · `npm run test:e2e` — see [README → Testing](./README.md#testing) |
| See what's implemented | [ROADMAP.md](./ROADMAP.md) |

## 10. Before going to production (checklist)

- [ ] Real, unique `JWT_*` secrets (not the `.env.example` placeholders).
- [ ] `DB_SYNCHRONIZE=false` (always use migrations — it's the default).
- [ ] `CORS_ORIGINS` set to your real front-end origin(s), not `*`.
- [ ] `LOG_PRETTY=false` (JSON logs) and an appropriate `LOG_LEVEL`.
- [ ] Rotate `SEED_ADMIN_PASSWORD` or delete the seeded admin after creating real accounts.
- [ ] Review rate limits (`THROTTLE_*`).
- [ ] `NODE_ENV=production`.

---

## Where things live

```
src/
├── config/     # env validation (Joi) + typed config namespaces
├── common/     # base entity, exception filter, interceptors, pagination, BaseCrud*
├── database/   # data-source, migrations, seeds
├── shared/     # cross-module providers (e.g. HashingService)
└── modules/    # your feature modules (users, ...)
```

For the full picture of what's implemented vs pending, see [ROADMAP.md](./ROADMAP.md).
