import { DataSource, Repository } from 'typeorm';
import { Permission } from '../../modules/authorization/entities/permission.entity';
import { Role } from '../../modules/authorization/entities/role.entity';
import { Seeder } from './seeder.interface';

/** Base permissions shipped with the template (extend per your resources). */
const BASE_PERMISSIONS: Array<{ resource: string; action: string }> = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
];

/**
 * Seeds base permissions and the `admin` / `user` roles. Idempotent.
 *   - admin → all permissions
 *   - user  → read-only
 */
export class RbacSeeder implements Seeder {
  readonly name = 'RbacSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);

    const permissions: Permission[] = [];
    for (const { resource, action } of BASE_PERMISSIONS) {
      const name = `${resource}:${action}`;
      let perm = await permRepo.findOne({ where: { name } });
      if (!perm) {
        perm = await permRepo.save(
          permRepo.create({ name, resource, action, description: `Can ${action} ${resource}` }),
        );
        console.log(`  ↳ created permission "${name}"`);
      }
      permissions.push(perm);
    }

    await this.upsertRole(roleRepo, 'admin', 'Full administrative access', permissions);
    await this.upsertRole(
      roleRepo,
      'user',
      'Standard user',
      permissions.filter((p) => p.action === 'read'),
    );
  }

  private async upsertRole(
    roleRepo: Repository<Role>,
    name: string,
    description: string,
    permissions: Permission[],
  ): Promise<void> {
    let role = await roleRepo.findOne({ where: { name }, relations: { permissions: true } });
    if (!role) {
      role = roleRepo.create({ name, description });
      console.log(`  ↳ created role "${name}"`);
    }
    role.permissions = permissions;
    await roleRepo.save(role);
  }
}
