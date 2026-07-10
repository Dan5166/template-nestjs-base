import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppConfigTree } from '../../config';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService, AuthResult } from './auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from './cookie.util';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService<AppConfigTree, true>,
  ) {}

  @Public()
  // Tighter rate limit on registration to curb automated account creation.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOkResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.buildResponse(await this.authService.register(dto), res);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  // Tighter rate limit on login to slow brute-force attempts.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @CurrentUser() principal: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.buildResponse(await this.authService.login(principal), res);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  // Tighter rate limit on refresh to bound abuse of a stolen refresh cookie.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @CurrentUser() principal: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.buildResponse(await this.authService.refresh(principal), res);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() principal: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(principal);
    this.clearRefreshCookie(res);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOkResponse({ type: User })
  me(@CurrentUser() principal: AuthenticatedUser): Promise<User> {
    return this.usersService.findOne(principal.id);
  }

  private buildResponse(result: AuthResult, res: Response): AuthResponseDto {
    setRefreshTokenCookie(
      res,
      result.tokens.refreshToken,
      this.config.get('app', { infer: true }).env === 'production',
      this.authService.refreshCookieMaxAgeMs,
    );
    return {
      accessToken: result.tokens.accessToken,
      tokenType: 'Bearer',
      user: result.user,
    };
  }

  private clearRefreshCookie(res: Response): void {
    clearRefreshTokenCookie(res);
  }
}
