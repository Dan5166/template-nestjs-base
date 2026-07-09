export type TokenType = 'access' | 'refresh';

/** Claims embedded in the access/refresh JWTs. */
export interface JwtPayload {
  /** Subject: the user id. */
  sub: string;
  email: string;
  type: TokenType;
  /** Unique token id, used for blacklist-based revocation. */
  jti: string;
  iat?: number;
  exp?: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}
