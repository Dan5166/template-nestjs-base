import { HashingService } from './hashing.service';

describe('HashingService', () => {
  const service = new HashingService();

  it('produces a hash that differs from the input', async () => {
    const hash = await service.hash('S3cret!');
    expect(hash).not.toEqual('S3cret!');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('S3cret!');
    await expect(service.verify(hash, 'S3cret!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('S3cret!');
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false (never throws) on a malformed hash', async () => {
    await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
  });
});
