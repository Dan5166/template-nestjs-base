#!/usr/bin/env node
/**
 * Feature-module generator for this template.
 *
 * Scaffolds a full CRUD module that mirrors `src/modules/users`:
 *   entities/<name>.entity.ts   (extends BaseEntity)
 *   dto/create-<name>.dto.ts
 *   dto/update-<name>.dto.ts     (PartialType of create)
 *   dto/<name>-response.dto.ts
 *   <plural>.service.ts          (extends BaseCrudService)
 *   <plural>.controller.ts       (BaseCrudController factory + PBAC permissions)
 *   <plural>.module.ts
 *
 * Usage:
 *   npm run g:module -- <name> [--force] [--no-permissions]
 *   node scripts/generate-module.mjs product
 *   node scripts/generate-module.mjs blog-post
 *
 * `<name>` is the SINGULAR resource name in any case (product, BlogPost,
 * blog_post). The generator derives every other form. It never overwrites an
 * existing file unless you pass --force, and it prints the manual wiring steps
 * (register the module, generate a migration, seed the PBAC permissions).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- CLI ---------------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positionals = argv.filter((a) => !a.startsWith('--'));
const force = flags.has('--force');
const withPermissions = !flags.has('--no-permissions');

const rawName = positionals[0];
if (!rawName) {
  fail(
    'Missing resource name.\n' +
      'Usage: npm run g:module -- <name> [--force] [--no-permissions]\n' +
      'Example: npm run g:module -- product',
  );
}

// --- Naming ------------------------------------------------------------------
/** Split any case (kebab, snake, camel, Pascal, spaced) into lowercase words. */
function words(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camel/Pascal boundary
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const pascal = (ws) => ws.map(cap).join('');
const camel = (ws) => ws.map((w, i) => (i === 0 ? w : cap(w))).join('');
const kebab = (ws) => ws.join('-');
const snake = (ws) => ws.join('_');

/** English pluralization of a single word — enough for resource names. */
function pluralizeWord(w) {
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
  return w + 's';
}

const singularWords = words(rawName);
if (singularWords.length === 0) fail(`Invalid resource name: "${rawName}"`);

const pluralWords = [...singularWords.slice(0, -1), pluralizeWord(singularWords.at(-1))];

const name = {
  // singular
  Entity: pascal(singularWords), // Product / BlogPost
  fileSingular: kebab(singularWords), // product / blog-post
  camelSingular: camel(singularWords), // product / blogPost
  human: singularWords.join(' '), // product / blog post
  // plural
  Class: pascal(pluralWords), // Products / BlogPosts
  dir: kebab(pluralWords), // products / blog-posts
  route: kebab(pluralWords), // products / blog-posts
  table: snake(pluralWords), // products / blog_posts
  resource: kebab(pluralWords), // products:create ...
};

const moduleDir = join(ROOT, 'src', 'modules', name.dir);

// --- Templates ---------------------------------------------------------------
const entityTs = `import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('${name.table}')
export class ${name.Entity} extends BaseEntity {
  @ApiProperty({ example: 'Sample ${name.human}' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;
}
`;

const createDtoTs = `import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class Create${name.Entity}Dto {
  @ApiProperty({ example: 'Sample ${name.human}' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
`;

const updateDtoTs = `import { PartialType } from '@nestjs/swagger';
import { Create${name.Entity}Dto } from './create-${name.fileSingular}.dto';

/** Update payload: every field from create, all optional. */
export class Update${name.Entity}Dto extends PartialType(Create${name.Entity}Dto) {}
`;

const responseDtoTs = `import { ApiProperty } from '@nestjs/swagger';

/** Shape returned to clients. Keep sensitive columns out of here. */
export class ${name.Entity}ResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Sample ${name.human}' })
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
`;

const serviceTs = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { ${name.Entity} } from './entities/${name.fileSingular}.entity';

@Injectable()
export class ${name.Class}Service extends BaseCrudService<${name.Entity}> {
  protected readonly alias = '${name.camelSingular}';
  protected override searchableFields = ['name', 'description'];
  protected override sortableFields = ['createdAt', 'updatedAt', 'name'];

  constructor(@InjectRepository(${name.Entity}) repository: Repository<${name.Entity}>) {
    super(repository);
  }
}
`;

const permissionsBlock = withPermissions
  ? `
  permissions: {
    create: '${name.resource}:create',
    read: '${name.resource}:read',
    update: '${name.resource}:update',
    delete: '${name.resource}:delete',
  },`
  : '';

const controllerTs = `import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { BaseCrudController } from '../../common/controllers/base-crud.controller';
import { Create${name.Entity}Dto } from './dto/create-${name.fileSingular}.dto';
import { Update${name.Entity}Dto } from './dto/update-${name.fileSingular}.dto';
import { ${name.Entity}ResponseDto } from './dto/${name.fileSingular}-response.dto';
import { ${name.Entity} } from './entities/${name.fileSingular}.entity';
import { ${name.Class}Service } from './${name.dir}.service';

/**
 * ${name.Class} CRUD, built on the generic {@link BaseCrudController}:
 *   POST /${name.route} · GET /${name.route} · GET /${name.route}/:id
 *   PATCH /${name.route}/:id · DELETE /${name.route}/:id (soft) · PATCH /${name.route}/:id/restore
 */
@ApiBearerAuth()
@ApiTags('${name.route}')
@ApiExtraModels(${name.Entity}ResponseDto)
@Controller('${name.route}')
export class ${name.Class}Controller extends BaseCrudController<
  ${name.Entity},
  Create${name.Entity}Dto,
  Update${name.Entity}Dto
>({
  createDto: Create${name.Entity}Dto,
  updateDto: Update${name.Entity}Dto,${permissionsBlock}
}) {
  constructor(protected readonly service: ${name.Class}Service) {
    super();
  }
}
`;

const moduleTs = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${name.Entity} } from './entities/${name.fileSingular}.entity';
import { ${name.Class}Controller } from './${name.dir}.controller';
import { ${name.Class}Service } from './${name.dir}.service';

@Module({
  imports: [TypeOrmModule.forFeature([${name.Entity}])],
  controllers: [${name.Class}Controller],
  providers: [${name.Class}Service],
  exports: [${name.Class}Service],
})
export class ${name.Class}Module {}
`;

// --- Emit --------------------------------------------------------------------
const files = [
  [join('entities', `${name.fileSingular}.entity.ts`), entityTs],
  [join('dto', `create-${name.fileSingular}.dto.ts`), createDtoTs],
  [join('dto', `update-${name.fileSingular}.dto.ts`), updateDtoTs],
  [join('dto', `${name.fileSingular}-response.dto.ts`), responseDtoTs],
  [`${name.dir}.service.ts`, serviceTs],
  [`${name.dir}.controller.ts`, controllerTs],
  [`${name.dir}.module.ts`, moduleTs],
];

const existing = files
  .map(([rel]) => join(moduleDir, rel))
  .filter((p) => existsSync(p));
if (existing.length > 0 && !force) {
  fail(
    `Refusing to overwrite existing files (pass --force to replace):\n` +
      existing.map((p) => '  ' + rel(p)).join('\n'),
  );
}

const written = [];
for (const [relPath, contents] of files) {
  const abs = join(moduleDir, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents, 'utf8');
  written.push(rel(abs));
}

// --- Report ------------------------------------------------------------------
console.log(`\n  Generated ${name.Class}Module (${written.length} files):\n`);
for (const p of written) console.log('   + ' + p);

console.log(`
  Next steps
  ----------
  1) Register the module in src/app.module.ts:
       import { ${name.Class}Module } from './modules/${name.dir}/${name.dir}.module';
       // then add ${name.Class}Module to the @Module({ imports: [...] })

  2) Generate + run the migration for the new table "${name.table}":
       npm run migration:generate -- src/database/migrations/Create${name.Class}
       npm run migration:run
`);

if (withPermissions) {
  console.log(`  3) Seed the PBAC permissions so roles can be granted them:
       ${name.resource}:create  ${name.resource}:read  ${name.resource}:update  ${name.resource}:delete
     (add them to your roles/permissions seed, e.g. grant all to "admin").
`);
}

console.log('  Done. Run `npm run lint` and `npm run build` to verify.\n');

// --- helpers -----------------------------------------------------------------
function rel(p) {
  return p.replace(ROOT + '\\', '').replace(ROOT + '/', '').replace(/\\/g, '/');
}

function fail(msg) {
  console.error('\n  ✖ ' + msg + '\n');
  process.exit(1);
}
