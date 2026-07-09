import { ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { AppConfigTree } from '../../../config';

/** Only activates when OAuth is enabled; otherwise the route behaves as absent. */
@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly config: ConfigService<AppConfigTree, true>) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    if (!this.config.get('oauth', { infer: true }).enabled) {
      throw new NotFoundException('OAuth sign-in is not enabled');
    }
    return super.canActivate(context);
  }
}
