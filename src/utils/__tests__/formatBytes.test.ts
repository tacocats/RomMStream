import { formatBytes } from '../formatBytes';

describe('formatBytes', () => {
  it('formats bytes without decimals', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats larger sizes with one decimal', () => {
    expect(formatBytes(679034329497)).toBe('632.4 GB');
  });

  it('formats an exact power of 1024 unit', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('treats zero and negative values as 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });
});
