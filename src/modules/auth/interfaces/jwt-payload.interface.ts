export type TokenType = 'access' | 'refresh';

/** Claims embedded in the access/refresh JWTs. */
export interface JwtPayload {
  /** Subject: the user id. */
  sub: string;
  email: string;
  type: TokenType;
  /** Unique token id. On refresh tokens it also keys the session row. */
  jti: string;
  /** Session id (the paired refresh token's jti), present on access tokens so
   *  logout can revoke that exact session. */
  sid?: string;
  iat?: number;
  exp?: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}
