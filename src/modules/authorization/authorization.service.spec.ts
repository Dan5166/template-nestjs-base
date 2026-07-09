import { AuthProvider, User } from '../users/entities/user.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { extractAuthz } from './authorization.service';

const perm = (name: string): Permission => Object.assign(new Permission(), { name });
const role = (name: string, permissions: Permission[]): Role =>
  Object.assign(new Role(), { name, permissions });

const userWith = (roles: Role[]): User =>
  Object.assign(new User(), {
    email: 'a@b.com',
    provider: AuthProvider.LOCAL,
    roles,
  });

describe('extractAuthz', () => {
  it('returns empty arrays when the user has no roles', () => {
    expect(extractAuthz(userWith([]))).toEqual({ roles: [], permissions: [] });
  });

  it('collects role names and flattens permissions', () => {
    const user = userWith([
      role('admin', [perm('users:read'), perm('users:delete')]),
      role('editor', [perm('users:read'), perm('users:update')]),
    ]);
    const { roles, permissions } = extractAuthz(user);
    expect(roles).toEqual(['admin', 'editor']);
    // deduplicated across roles
    expect([...permissions].sort()).toEqual(['users:delete', 'users:read', 'users:update']);
  });
});
