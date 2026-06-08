/** Regenerates ~/.config/vpn/config.json from active server + routes + presets. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirs, paths } from "./paths.ts";
import { buildXrayConfig } from "./config.ts";
import { getActiveProfile } from "./servers.ts";
import { userRules } from "./routes.ts";
import { enabledPresetRules } from "./presets.ts";
import { validateConfig } from "./xray.ts";
import type { RouteRule } from "./types.ts";

/** User list rules first (higher precedence within a target), then preset rules. */
export function mergedRules(): RouteRule[] {
  return [...userRules(), ...enabledPresetRules()];
}

/** Optional user DNS override from ~/.config/vpn/dns.json (else neutral default). */
function loadDnsOverride(): Record<string, unknown> | undefined {
  if (!existsSync(paths.dns)) return undefined;
  try {
    return JSON.parse(readFileSync(paths.dns, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export interface RegenResult {
  ok: boolean;
  output: string;
}

/**
 * Build, validate (xray -test), and persist the config. On validation failure the
 * existing config.json is left untouched and `ok` is false with xray's message.
 */
export function regenerate(): RegenResult {
  const profile = getActiveProfile();
  if (!profile) {
    throw new Error("no active server. Add one with: vpn add <vless://...>");
  }
  ensureDirs();
  const config = buildXrayConfig(profile, mergedRules(), { dns: loadDnsOverride() });
  const { ok, output, json } = validateConfig(config);
  if (ok) writeFileSync(paths.config, json + "\n");
  return { ok, output };
}
