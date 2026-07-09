import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Type,
} from '@nestjs/common';
import { ApiBody, ApiParam } from '@nestjs/swagger';
import { DeepPartial, ObjectLiteral } from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { BaseEntity } from '../entities/base.entity';
import { Paginated } from '../interfaces/paginated-result.interface';
import { BaseCrudService } from '../services/base-crud.service';

/** Optional `resource:action` permission required per CRUD action (PBAC). */
export interface CrudPermissions {
  create?: string;
  read?: string;
  update?: string;
  delete?: string;
}

export interface CrudControllerOptions<C, U> {
  createDto: Type<C>;
  updateDto: Type<U>;
  /** When set, the matching routes are guarded by `@RequirePermissions(...)`. */
  permissions?: CrudPermissions;
}

export interface ICrudController<T, C, U> {
  create(dto: C): Promise<T>;
  findAll(query: PaginationQueryDto): Promise<Paginated<T>>;
  findOne(id: string): Promise<T>;
  update(id: string, dto: U): Promise<T>;
  remove(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

/**
 * Factory that builds an abstract CRUD controller wired to a {@link BaseCrudService}.
 * Because it injects the concrete DTO classes into the route metadata, the global
 * ValidationPipe and Swagger work correctly despite the generics.
 *
 * Usage:
 * ```ts
 * @ApiTags('users')
 * @Controller('users')
 * export class UsersController extends BaseCrudController<User, CreateUserDto, UpdateUserDto>({
 *   createDto: CreateUserDto,
 *   updateDto: UpdateUserDto,
 * }) {
 *   constructor(protected readonly service: UsersService) {
 *     super();
 *   }
 * }
 * ```
 * Subclasses add their own guards/decorators and may override any method.
 */
export function BaseCrudController<T extends BaseEntity & ObjectLiteral, C, U>(
  options: CrudControllerOptions<C, U>,
): Type<ICrudController<T, C, U>> {
  abstract class CrudControllerHost implements ICrudController<T, C, U> {
    protected abstract readonly service: BaseCrudService<T>;

    @Post()
    create(@Body() dto: C): Promise<T> {
      return this.service.create(dto as DeepPartial<T>);
    }

    @Get()
    findAll(@Query() query: PaginationQueryDto): Promise<Paginated<T>> {
      return this.service.findAll(query);
    }

    @Get(':id')
    @ApiParam({ name: 'id', format: 'uuid' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<T> {
      return this.service.findOne(id);
    }

    @Patch(':id')
    @ApiParam({ name: 'id', format: 'uuid' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: U): Promise<T> {
      return this.service.update(id, dto as DeepPartial<T>);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({ name: 'id', format: 'uuid' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
      return this.service.remove(id);
    }

    @Patch(':id/restore')
    @ApiParam({ name: 'id', format: 'uuid' })
    restore(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
      return this.service.restore(id);
    }
  }

  // Inject concrete DTO types so the ValidationPipe (which reads reflected param
  // types) and Swagger produce correct behavior for the generic body params.
  Reflect.defineMetadata(
    'design:paramtypes',
    [options.createDto],
    CrudControllerHost.prototype,
    'create',
  );
  Reflect.defineMetadata(
    'design:paramtypes',
    [String, options.updateDto],
    CrudControllerHost.prototype,
    'update',
  );
  ApiBody({ type: options.createDto })(
    CrudControllerHost.prototype,
    'create',
    Object.getOwnPropertyDescriptor(CrudControllerHost.prototype, 'create')!,
  );
  ApiBody({ type: options.updateDto })(
    CrudControllerHost.prototype,
    'update',
    Object.getOwnPropertyDescriptor(CrudControllerHost.prototype, 'update')!,
  );

  // Apply per-action permission requirements (enforced by the global PermissionsGuard).
  const perms = options.permissions;
  if (perms) {
    const apply = (method: keyof ICrudController<T, C, U>, permission?: string): void => {
      if (!permission) return;
      RequirePermissions(permission)(
        CrudControllerHost.prototype,
        method,
        Object.getOwnPropertyDescriptor(CrudControllerHost.prototype, method)!,
      );
    };
    apply('create', perms.create);
    apply('findAll', perms.read);
    apply('findOne', perms.read);
    apply('update', perms.update);
    apply('remove', perms.delete);
    apply('restore', perms.delete);
  }

  return CrudControllerHost as unknown as Type<ICrudController<T, C, U>>;
}
