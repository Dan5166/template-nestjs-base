import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Triggers the local strategy (email + password) for the login endpoint. */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
