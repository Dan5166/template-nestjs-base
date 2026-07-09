import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthorizationService } from './authorization.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

/**
 * Permissions are usually defined in code (the RBAC seeder) and stable, but this
 * lets an admin add/inspect them at runtime — e.g. when a new resource ships.
 */
@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get()
  @RequirePermissions('permissions:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.authorization.findPermissions(query);
  }

  @Post()
  @RequirePermissions('permissions:create')
  create(@Body() dto: CreatePermissionDto) {
    return this.authorization.createPermission(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('permissions:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.authorization.deletePermission(id);
  }
}
