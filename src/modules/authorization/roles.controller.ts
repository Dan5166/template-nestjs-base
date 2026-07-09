import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthorizationService } from './authorization.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get()
  @RequirePermissions('roles:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.authorization.findRoles(query);
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.authorization.findRoleById(id);
  }

  @Post()
  @RequirePermissions('roles:create')
  create(@Body() dto: CreateRoleDto) {
    return this.authorization.createRole(dto);
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.authorization.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('roles:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.authorization.deleteRole(id);
  }
}
