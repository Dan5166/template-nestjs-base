import { DataSource } from 'typeorm';
import { Role } from '../../modules/authorization/entities/role.entity';
import { AuthProvider, User } from '../../modules/users/entities/user.entity';
import { hashPassword } from '../../shared/hashing/hashing';
import { Seeder } from './seeder.interface';

/**
 * Creates the initial admin account from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * and assigns it the `admin` role (seeded by {@link RbacSeeder}, which must run
 * first). Idempotent.
 */
export class AdminUserSeeder implements Seeder {
  readonly name = 'AdminUserSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@template.local';

    let admin = await userRepo.findOne({ where: { email }, relations: { roles: true } });
    if (!admin) {
      const password = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!');
      admin = userRepo.create({
        email,
        password,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        provider: AuthProvider.LOCAL,
        roles: [],
      });
      console.log(`  ↳ created admin user "${email}"`);
    }

    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
    if (adminRole && !(admin.roles ?? []).some((r) => r.id === adminRole.id)) {
      admin.roles = [...(admin.roles ?? []), adminRole];
      console.log(`  ↳ assigned "admin" role to "${email}"`);
    }
    await userRepo.save(admin);
  }
}
