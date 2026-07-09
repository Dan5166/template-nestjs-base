import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { AppConfigTree } from '../../config';
import { tenantStorage } from './tenant-context';

export const TENANT_HEADER = 'x-tenant-id';

/**
 * Resolves the active tenant for each request and runs the rest of the request
 * inside an AsyncLocalStorage context carrying it.
 *
 * When `MULTI_TENANT=false` (default) this is a pass-through: the store is set
 * with `tenantId: null`, so nothing downstream changes. Enable the flag and the
 * tenant is read from (in order):
 *   1. the `X-Tenant-ID` header
 *   2. the sub-domain (e.g. `acme.api.example.com` → `acme`)
 *   3. a `tenantId` claim on the authenticated user (populated by the JWT strategy)
 *
 * Extend {@link resolveTenant} to fit your routing/identity model.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService<AppConfigTree, true>) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const enabled = this.config.get('app', { infer: true }).multiTenant;
    const tenantId = enabled ? this.resolveTenant(req) : null;

    if (tenantId) res.setHeader('x-tenant-id', tenantId);
    tenantStorage.run({ tenantId }, () => next());
  }

  protected resolveTenant(req: Request): string | null {
    const header = req.headers[TENANT_HEADER];
    if (typeof header === 'string' && header.trim()) return header.trim();

    const fromSubdomain = this.tenantFromHost(req.headers.host);
    if (fromSubdomain) return fromSubdomain;

    const user = (req as Request & { user?: { tenantId?: string } }).user;
    return user?.tenantId ?? null;
  }

  /** Extract a sub-domain tenant, ignoring `localhost`, IPs and bare domains. */
  private tenantFromHost(host?: string): string | null {
    if (!host) return null;
    const hostname = host.split(':')[0];
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
    const parts = hostname.split('.');
    // Need at least sub.domain.tld to treat the first label as a tenant.
    return parts.length >= 3 ? parts[0] : null;
  }
}
