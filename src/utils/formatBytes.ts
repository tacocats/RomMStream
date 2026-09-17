const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Human-readable file size, e.g. `formatBytes(678972030976)` -> "632.4 GB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : 1;

  return `${value.toFixed(decimals)} ${UNITS[exponent]}`;
}
