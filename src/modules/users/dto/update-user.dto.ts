import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Admin update. All fields optional; password is intentionally excluded — it is
 * changed through the dedicated auth flow (Phase 5), never via generic update.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
