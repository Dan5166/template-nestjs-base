import { parseDurationToMs } from './auth.constants';

describe('parseDurationToMs', () => {
  it.each([
    ['15m', 900_000],
    ['7d', 604_800_000],
    ['1h', 3_600_000],
    ['30s', 30_000],
    ['500ms', 500],
    ['1000', 1000], // bare number = ms
  ])('parses %s -> %d ms', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it('returns 0 for an unparseable value', () => {
    expect(parseDurationToMs('not-a-duration')).toBe(0);
  });
});
