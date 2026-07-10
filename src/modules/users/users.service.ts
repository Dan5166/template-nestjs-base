import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { ResourceConflictException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/business.exception';
import { HashingService } from '../../shared/hashing/hashing.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthProvider, User } from './entities/user.entity';

@Injectable()
export class UsersService extends BaseCrudService<User> {
  protected readonly alias = 'user';
  protected override searchableFields = ['email', 'firstName', 'lastName'];
  protected override sortableFields = ['createdAt', 'updatedAt', 'email'];

  constructor(
    @InjectRepository(User) repository: Repository<User>,
    private readonly hashing: HashingService,
  ) {
    super(repository);
  }

  /** Create a user, hashing the password and enforcing email uniqueness. */
  override async create(dto: DeepPartial<User> | CreateUserDto): Promise<User> {
    const data = dto as CreateUserDto;
    await this.ensureEmailAvailable(data.email);
    const password = data.password ? await this.hashing.hash(data.password) : null;
    return super.create({ ...data, password });
  }

  /** Look up a user by email. Pass `withSecret` to include the password column. */
  async findByEmail(email: string, withSecret = false): Promise<User | null> {
    const qb = this.repository.createQueryBuilder('user').where('user.email = :email', { email });
    if (withSecret) {
      qb.addSelect(['user.password']);
    }
    return qb.getOne();
  }

  /** Load a user with roles and their permissions (for building the auth principal). */
  findByEmailWithRoles(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });
  }

  /** Update the caller's own profile (restricted field set). */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    return this.update(id, dto);
  }

  /** Find a user by OAuth provider + external id. */
  findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    return this.repository.findOne({ where: { provider, providerId } });
  }

  /** Create a passwordless account from an OAuth profile. */
  createOAuthUser(data: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    provider: AuthProvider;
    providerId: string;
  }): Promise<User> {
    const user = this.repository.create({ ...data, password: null, isActive: true });
    return this.repository.save(user);
  }

  /** Link an OAuth provider to an existing account. */
  async linkOAuthProvider(id: string, provider: AuthProvider, providerId: string): Promise<void> {
    await this.repository.update(id, { provider, providerId });
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const exists = await this.repository.exists({ where: { email } });
    if (exists) {
      throw new ResourceConflictException(
        `Email "${email}" is already registered`,
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }
  }
}
