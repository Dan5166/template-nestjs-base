import { Injectable } from '@nestjs/common';
import { hashPassword, verifyPassword } from './hashing';

/** Injectable wrapper around the argon2 hashing helpers. */
@Injectable()
export class HashingService {
  hash(plain: string): Promise<string> {
    return hashPassword(plain);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return verifyPassword(hash, plain);
  }
}
