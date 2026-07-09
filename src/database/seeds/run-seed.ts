import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { AdminUserSeeder } from './admin-user.seeder';
import { RbacSeeder } from './rbac.seeder';
import { Seeder } from './seeder.interface';

/** Ordered list of seeders. RBAC first so the admin seeder can assign the role. */
const seeders: Seeder[] = [new RbacSeeder(), new AdminUserSeeder()];

async function runSeeders(): Promise<void> {
  console.log('🌱 Seeding database...');
  await AppDataSource.initialize();

  try {
    for (const seeder of seeders) {
      console.log(`→ ${seeder.name}`);
      await seeder.run(AppDataSource);
    }
    console.log('✅ Seeding complete.');
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeders().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
