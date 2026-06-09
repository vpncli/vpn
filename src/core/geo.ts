/** IP geolocation (country) via a free HTTPS lookup, cached per IP. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isDemo, demoGeo } from "./demo.ts";

const execFileAsync = promisify(execFile);

export interface Geo {
  country: string;
  /** ISO 3166-1 alpha-2 code, e.g. "FI". */
  countryCode: string;
}

const cache = new Map<string, Geo | null>();

/**
 * Resolve the country of an IP. Uses `curl --noproxy` so the lookup is direct
 * (not tunneled). Returns null on failure; results are cached for the session.
 */
export async function geolocate(ip: string): Promise<Geo | null> {
  if (isDemo()) return demoGeo(ip);
  const cached = cache.get(ip);
  if (cached !== undefined) return cached;

  let result: Geo | null = null;
  try {
    const { stdout } = await execFileAsync("curl", ["-s", "--noproxy", "*", "--max-time", "5", `https://ipwho.is/${ip}`]);
    const j = JSON.parse(stdout) as { success?: boolean; country?: string; country_code?: string };
    if (j.success !== false && j.country_code) {
      result = { country: j.country ?? j.country_code, countryCode: j.country_code };
    }
  } catch {
    result = null;
  }
  cache.set(ip, result);
  return result;
}
