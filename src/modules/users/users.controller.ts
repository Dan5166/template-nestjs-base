import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { BaseCrudController } from '../../common/controllers/base-crud.controller';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * User management CRUD, built on the generic {@link BaseCrudController}:
 *   POST /users · GET /users · GET /users/:id · PATCH /users/:id
 *   DELETE /users/:id (soft) · PATCH /users/:id/restore
 *
 * Each action is guarded by a granular `users:*` permission (PBAC). The seeded
 * `admin` role holds all of them; the `user` role only has `users:read`.
 */
@ApiBearerAuth()
@ApiTags('users')
@ApiExtraModels(UserResponseDto)
@Controller('users')
export class UsersController extends BaseCrudController<User, CreateUserDto, UpdateUserDto>({
  createDto: CreateUserDto,
  updateDto: UpdateUserDto,
  permissions: {
    create: 'users:create',
    read: 'users:read',
    update: 'users:update',
    delete: 'users:delete',
  },
}) {
  constructor(protected readonly service: UsersService) {
    super();
  }
}
