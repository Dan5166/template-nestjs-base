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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthorizationService } from './authorization.service';
import { AssignRolesDto } from './dto/assign-roles.dto';

/**
 * Manage which roles a user holds. Guarded by `users:assign-roles` since it is a
 * privilege-granting operation.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users/:userId/roles')
export class UserRolesController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get()
  @RequirePermissions('users:assign-roles')
  list(@Param('userId', ParseUUIDPipe) userId: string): Promise<string[]> {
    return this.authorization.getUserRoles(userId);
  }

  @Post()
  @RequirePermissions('users:assign-roles')
  async assign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRolesDto,
  ): Promise<{ roles: string[] }> {
    await this.authorization.assignRoles(userId, dto.roles);
    return { roles: await this.authorization.getUserRoles(userId) };
  }

  @Delete(':roleName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:assign-roles')
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    return this.authorization.removeRole(userId, roleName);
  }
}
