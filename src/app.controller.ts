import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { AppConfigTree } from './config';
import { Tenant } from './common/tenancy/tenant.decorator';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly config: ConfigService<AppConfigTree, true>) {}

  @Public()
  @Get()
  getInfo(@Tenant() tenantId: string | null) {
    const app = this.config.get('app', { infer: true });
    return {
      name: app.name,
      environment: app.env,
      version: app.apiVersion,
      status: 'ok',
      // Only meaningful when MULTI_TENANT=true; null otherwise.
      ...(app.multiTenant ? { tenant: tenantId } : {}),
    };
  }
}
