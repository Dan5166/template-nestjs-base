import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { RbacSeeder } from '../src/database/seeds/rbac.seeder';
import { AuthorizationService } from '../src/modules/authorization/authorization.service';

describe('Template API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const stamp = Date.now();
  const userEmail = `e2e-user-${stamp}@test.com`;
  const adminEmail = `e2e-admin-${stamp}@test.com`;
  const password = 'Str0ng!Pass';

  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    // Seed base roles/permissions into the test database.
    await new RbacSeeder().run(app.get(DataSource));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public endpoints', () => {
    it('GET /api/v1 returns app info wrapped in { data, meta }', async () => {
      const res = await request(http).get('/api/v1').expect(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.meta.timestamp).toBeDefined();
    });

    it('GET /api/health reports the database is up', async () => {
      const res = await request(http).get('/api/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info.database.status).toBe('up');
    });
  });

  describe('authentication', () => {
    it('rejects protected routes without a token (401)', async () => {
      await request(http).get('/api/v1/users').expect(401);
    });

    it('registers a new user and returns an access token', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({ email: userEmail, password, firstName: 'E2E' })
        .expect(201);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(userEmail);
      userToken = res.body.data.accessToken as string;
    });

    it('rejects duplicate registration (409)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({ email: userEmail, password })
        .expect(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects login with a wrong password (401)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'wrong-password' })
        .expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns the current user from /auth/me', async () => {
      const res = await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(userEmail);
    });
  });

  describe('authorization (RBAC/PBAC)', () => {
    it('lets a regular user read (has users:read)', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(1);
    });

    it('forbids a regular user from creating (lacks users:create)', async () => {
      const res = await request(http)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: `nope-${stamp}@test.com`, password })
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows an admin to create a user', async () => {
      const reg = await request(http)
        .post('/api/v1/auth/register')
        .send({ email: adminEmail, password })
        .expect(201);
      await app.get(AuthorizationService).assignRoles(reg.body.data.user.id as string, ['admin']);

      const login = await request(http)
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password })
        .expect(200);
      adminToken = login.body.data.accessToken as string;

      await request(http)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `created-${stamp}@test.com`, password })
        .expect(201);
    });
  });

  describe('refresh & logout (cookies)', () => {
    it('refreshes and then revokes the token on logout', async () => {
      const login = await request(http)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password })
        .expect(200);
      const cookie = login.headers['set-cookie'];
      const token = login.body.data.accessToken as string;

      const refreshed = await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);
      expect(refreshed.body.data.accessToken).toBeDefined();

      await request(http)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookie)
        .expect(204);

      // The access token used at logout is now revoked.
      const after = await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(after.body.code).toBe('TOKEN_REVOKED');
    });
  });

  describe('multi-session refresh tokens', () => {
    const login = () =>
      request(http).post('/api/v1/auth/login').send({ email: userEmail, password }).expect(200);

    it('keeps existing sessions alive after logging in again (multi-device)', async () => {
      const first = await login();
      const firstCookie = first.headers['set-cookie'];

      // A second login opens a separate session; it must NOT invalidate the first.
      await login();

      await request(http).post('/api/v1/auth/refresh').set('Cookie', firstCookie).expect(200);
    });

    it('logging out one session leaves the others usable', async () => {
      const a = await login();
      const b = await login();
      const cookieA = a.headers['set-cookie'];
      const tokenB = b.body.data.accessToken as string;
      const cookieB = b.headers['set-cookie'];

      // Log out session B.
      await request(http)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('Cookie', cookieB)
        .expect(204);

      // B's access token is now revoked...
      await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(401);
      // ...while session A keeps working.
      await request(http).post('/api/v1/auth/refresh').set('Cookie', cookieA).expect(200);
    });

    it('detects reuse of a rotated refresh token and revokes the session family', async () => {
      const session = await login();
      const oldCookie = session.headers['set-cookie'];

      // Rotate once: the old cookie is now spent, a new one is issued.
      const rotated = await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie)
        .expect(200);
      const newCookie = rotated.headers['set-cookie'];

      // Replaying the OLD cookie is treated as reuse.
      const replay = await request(http)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie)
        .expect(401);
      expect(replay.body.code).toBe('TOKEN_REVOKED');

      // Reuse detection revokes the whole family, so the rotated cookie dies too.
      await request(http).post('/api/v1/auth/refresh').set('Cookie', newCookie).expect(401);
    });
  });
});
