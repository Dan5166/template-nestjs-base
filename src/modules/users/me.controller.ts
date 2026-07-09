import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedBusinessException } from '../../common/exceptions/business.exception';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * Self-service profile endpoints. Registered under `users/me` and BEFORE the
 * `users/:id` routes in the module so the literal segment wins over the param.
 *
 * These become fully functional once the JWT guard populates `request.user`
 * (Phase 5); until then they reject with 401.
 */
@ApiTags('profile')
@Controller('users/me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserResponseDto })
  getProfile(@CurrentUser() user: AuthenticatedUser | undefined): Promise<User> {
    return this.usersService.findOne(this.requireUserId(user));
  }

  @Patch()
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(this.requireUserId(user), dto);
  }

  private requireUserId(user: AuthenticatedUser | undefined): string {
    if (!user?.id) {
      throw new UnauthorizedBusinessException();
    }
    return user.id;
  }
}
