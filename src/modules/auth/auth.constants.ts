/** Cookie that carries the refresh token (httpOnly). */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Parse a duration string like `15m`, `7d`, `3600s`, `1h`, `500ms` into
 * milliseconds. Plain numbers are treated as milliseconds.
 */
export const parseDurationToMs = (value: string): number => {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) return 0;
  const amount = parseInt(match[1], 10);
  const unit = match[2] ?? 'ms';
  const factors: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * factors[unit];
};
