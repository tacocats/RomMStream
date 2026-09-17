const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * "Sep 19, 2000" for a unix-seconds timestamp, without relying on the JS
 * engine's Intl/locale support (Hermes doesn't ship it everywhere).
 */
export function formatReleaseDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return `${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
