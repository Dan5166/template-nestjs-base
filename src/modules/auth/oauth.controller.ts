import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AppConfigTree } from '../../config';
import { AuthService } from './auth.service';
import { setRefreshTokenCookie } from './cookie.util';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GithubOAuthGuard } from './guards/github-oauth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { OAuthProfile } from './interfaces/oauth-profile.interface';

/**
 * OAuth sign-in (Google / GitHub). All routes are behind `OAUTH_ENABLED`
 * (enforced by the guards). The `/authorize` routes redirect to the provider;
 * the provider then calls back into `/callback`, which issues app JWTs.
 *
 * For a browser SPA you'd typically redirect back to the front-end with the
 * token; here we return JSON (+ refresh cookie) so it's testable as an API.
 */
@ApiTags('auth')
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfigTree, true>,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  googleAuthorize(): void {
    // The guard redirects to Google; this body never runs.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.complete(req, res);
  }

  @Public()
  @Get('github')
  @UseGuards(GithubOAuthGuard)
  @ApiExcludeEndpoint()
  githubAuthorize(): void {
    // The guard redirects to GitHub; this body never runs.
  }

  @Public()
  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @ApiExcludeEndpoint()
  githubCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.complete(req, res);
  }

  private async complete(req: Request, res: Response): Promise<AuthResponseDto> {
    const profile = req.user as OAuthProfile;
    const result = await this.authService.handleOAuthLogin(profile);
    setRefreshTokenCookie(
      res,
      result.tokens.refreshToken,
      this.config.get('app', { infer: true }).env === 'production',
      this.authService.refreshCookieMaxAgeMs,
    );
    return {
      accessToken: result.tokens.accessToken,
      tokenType: 'Bearer',
      user: result.user as unknown as AuthResponseDto['user'],
    };
  }
}
