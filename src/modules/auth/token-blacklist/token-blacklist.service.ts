/**
 * Abstraction over token revocation storage. The DB implementation
 * ({@link DbTokenBlacklistService}) is used now; Phase 10 swaps in a Redis
 * implementation (native TTL) by changing a single `useClass` binding.
 */
export abstract class TokenBlacklistService {
  /** Mark a token id as revoked until `expiresAt`. */
  abstract revoke(jti: string, expiresAt: Date): Promise<void>;

  /** Whether a token id is currently revoked. */
  abstract isRevoked(jti: string): Promise<boolean>;
}
