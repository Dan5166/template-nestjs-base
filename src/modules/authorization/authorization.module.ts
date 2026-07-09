import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuthorizationService } from './authorization.service';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { UserRolesController } from './user-roles.controller';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, User])],
  controllers: [RolesController, PermissionsController, UserRolesController],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
