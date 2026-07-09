import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';

/**
 * Wires the tenant AsyncLocalStorage context for every request.
 *
 * The middleware is always applied but is a no-op while `MULTI_TENANT=false`
 * (it just establishes an empty context), so there is zero behavior change until
 * you opt in. See USAGE.md → "Enabling multi-tenancy".
 *
 * Global so `TenantContextService` can be injected anywhere.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
