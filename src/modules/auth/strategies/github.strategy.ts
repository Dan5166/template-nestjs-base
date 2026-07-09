import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AppConfigTree } from '../../../config';
import { AuthProvider } from '../../users/entities/user.entity';
import { OAuthProfile } from '../interfaces/oauth-profile.interface';

type GithubVerifyCallback = (err: Error | null, user?: OAuthProfile) => void;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService<AppConfigTree, true>) {
    const github = config.get('oauth', { infer: true }).github;
    super({
      clientID: github.clientId,
      clientSecret: github.clientSecret,
      callbackURL: github.callbackUrl,
      // `user:email` is required to receive the account's email.
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: GithubVerifyCallback,
  ): void {
    const displayName = profile.displayName ?? profile.username ?? '';
    const [firstName, ...rest] = displayName.split(' ');
    const oauthProfile: OAuthProfile = {
      provider: AuthProvider.GITHUB,
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      firstName: firstName || null,
      lastName: rest.length ? rest.join(' ') : null,
    };
    done(null, oauthProfile);
  }
}
