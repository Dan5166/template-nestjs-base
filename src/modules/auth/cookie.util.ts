import { Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';

/** Set the httpOnly refresh-token cookie. Shared by the local + OAuth flows. */
export const setRefreshTokenCookie = (
  res: Response,
  token: string,
  secure: boolean,
  maxAgeMs: number,
): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
};
