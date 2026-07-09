import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ErrorCode,
  ResourceConflictException,
  ResourceNotFoundException,
  ValidationException,
} from '../../common/exceptions/business.exception';
import { paginate } from '../../common/helpers/pagination.helper';
import { Paginated } from '../../common/interfaces/paginated-result.interface';
import { User } from '../users/entities/user.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
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

  // --- Roles --------------------------------------------------------------

  findRoles(query: PaginationQueryDto): Promise<Paginated<Role>> {
    const qb = this.roleRepo.createQueryBuilder('role').leftJoinAndSelect('role.permissions', 'p');
    if (query.search) {
      qb.andWhere('role.name ILIKE :s', { s: `%${query.search}%` });
    }
    qb.orderBy('role.name', query.order);
    return paginate(qb, query);
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new ResourceNotFoundException('Role', id);
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roleRepo.exists({ where: { name: dto.name } });
    if (exists) {
      throw new ResourceConflictException(`Role "${dto.name}" already exists`);
    }
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions: await this.resolvePermissions(dto.permissions),
    });
    return this.roleRepo.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);
    if (dto.name && dto.name !== role.name) {
      const clash = await this.roleRepo.exists({ where: { name: dto.name } });
      if (clash) throw new ResourceConflictException(`Role "${dto.name}" already exists`);
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    // Only replace permissions when the field is explicitly provided.
    if (dto.permissions !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissions);
    }
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleById(id);
    await this.roleRepo.remove(role);
  }

  // --- Permissions --------------------------------------------------------

  findPermissions(query: PaginationQueryDto): Promise<Paginated<Permission>> {
    const qb = this.permissionRepo.createQueryBuilder('perm');
    if (query.search) {
      qb.andWhere('perm.name ILIKE :s', { s: `%${query.search}%` });
    }
    qb.orderBy('perm.name', query.order);
    return paginate(qb, query);
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const name = `${dto.resource}:${dto.action}`;
    const exists = await this.permissionRepo.exists({ where: { name } });
    if (exists) {
      throw new ResourceConflictException(`Permission "${name}" already exists`);
    }
    const permission = this.permissionRepo.create({
      name,
      resource: dto.resource,
      action: dto.action,
      description: dto.description ?? null,
    });
    return this.permissionRepo.save(permission);
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.permissionRepo.findOne({ where: { id } });
    if (!permission) throw new ResourceNotFoundException('Permission', id);
    await this.permissionRepo.remove(permission);
  }

  // --- User ↔ roles -------------------------------------------------------

  /** All role names assigned to a user. */
  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.getUserWithRoles(userId);
    return (user.roles ?? []).map((r) => r.name);
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

  /** Remove a single role (by name) from a user. */
  async removeRole(userId: string, roleName: string): Promise<void> {
    const user = await this.getUserWithRoles(userId);
    user.roles = (user.roles ?? []).filter((r) => r.name !== roleName);
    await this.userRepo.save(user);
  }

  private async getUserWithRoles(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!user) throw new ResourceNotFoundException('User', userId, ErrorCode.USER_NOT_FOUND);
    return user;
  }

  /** Map permission names to entities, failing if any name is unknown. */
  private async resolvePermissions(names?: string[]): Promise<Permission[]> {
    if (!names || names.length === 0) return [];
    const found = await this.permissionRepo.find({ where: { name: In(names) } });
    if (found.length !== names.length) {
      const missing = names.filter((n) => !found.some((p) => p.name === n));
      throw new ValidationException(`Unknown permissions: ${missing.join(', ')}`);
    }
    return found;
  }
}
