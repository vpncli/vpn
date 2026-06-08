/** Human-readable byte / rate formatting. */

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  let i = 0;
  let v = n;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? Math.round(v) : v.toFixed(1)} ${UNITS[i]}`;
}

export function humanRate(bytesPerSec: number): string {
  return `${humanBytes(bytesPerSec)}/s`;
}

/** Convert an ISO country code (e.g. "FI") into its flag emoji (🇫🇮). */
export function flagEmoji(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return "🏳️";
  const base = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((ch) => base + ch.charCodeAt(0) - 65));
}
