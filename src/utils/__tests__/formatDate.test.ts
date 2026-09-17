import { formatReleaseDate } from '../formatDate';

describe('formatReleaseDate', () => {
  it('formats a unix-seconds timestamp as "Mon D, YYYY"', () => {
    // 2000-09-19T00:00:00Z
    expect(formatReleaseDate(969321600)).toBe('Sep 19, 2000');
  });

  it('formats the start of the year', () => {
    // 2024-01-01T00:00:00Z
    expect(formatReleaseDate(1704067200)).toBe('Jan 1, 2024');
  });
});
