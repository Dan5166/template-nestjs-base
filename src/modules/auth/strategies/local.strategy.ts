import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuthService } from '../auth.service';

/** Validates email + password for the login endpoint. */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  validate(email: string, password: string): Promise<AuthenticatedUser> {
    return this.authService.validateUser(email, password);
  }
}
