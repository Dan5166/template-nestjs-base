import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

/** Resolve a user's effective permission names from their roles. */
export const extractAuthz = (user: User): { roles: string[]; permissions: string[] } => {
  const roles = user.roles?.map((role) => role.name) ?? [];
  const permissions = [
    ...new Set((user.roles ?? []).flatMap((role) => role.permissions?.map((p) => p.name) ?? [])),
  ];
  return { roles, permissions };
};

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find();
  }

  /** Assign roles (by name) to a user, merging with existing ones. Idempotent. */
  async assignRoles(userId: string, roleNames: string[]): Promise<void> {
    const roles = await this.roleRepo.find({ where: { name: In(roleNames) } });
    if (roles.length === 0) return;

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!user) return;

    const current = new Set((user.roles ?? []).map((r) => r.id));
    user.roles = [...(user.roles ?? []), ...roles.filter((r) => !current.has(r.id))];
    await this.userRepo.save(user);
  }
}
