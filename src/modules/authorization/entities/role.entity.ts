import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Permission } from './permission.entity';

/** A named role grouping a set of permissions (RBAC). */
@Entity('roles')
export class Role extends BaseEntity {
  @ApiProperty({ example: 'admin' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Eager: loading a role brings its permissions, so resolving a user's
  // permissions is a single relation load (see UsersService.findByEmailWithRoles).
  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];
}
