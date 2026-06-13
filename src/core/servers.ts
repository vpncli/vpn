/** Server-profile CRUD and the "active" selection. */

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { paths, ensureDirs } from "./paths.ts";
import { parseVless, slugifyName } from "./vless.ts";
import type { ServerProfile } from "./types.ts";

export function listNames(): string[] {
  if (!existsSync(paths.serversDir)) return [];
  return readdirSync(paths.serversDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

export function getServer(name: string): ServerProfile | undefined {
  const file = paths.serverFile(name);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as ServerProfile;
}

export function listServers(): ServerProfile[] {
  return listNames()
    .map((n) => getServer(n))
    .filter((p): p is ServerProfile => p !== undefined);
}

export function saveServer(profile: ServerProfile): void {
  ensureDirs();
  writeFileSync(paths.serverFile(profile.name), JSON.stringify(profile, null, 2) + "\n");
}

export function removeServer(name: string): void {
  const file = paths.serverFile(name);
  if (existsSync(file)) rmSync(file);
  if (getActive() === name) {
    const remaining = listNames();
    if (remaining[0]) setActive(remaining[0]);
    else clearActive();
  }
}

export function getActive(): string | undefined {
  if (!existsSync(paths.active)) return undefined;
  const name = readFileSync(paths.active, "utf8").trim();
  return name && existsSync(paths.serverFile(name)) ? name : undefined;
}

export function setActive(name: string): void {
  if (!existsSync(paths.serverFile(name))) throw new Error(`unknown server "${name}"`);
  ensureDirs();
  writeFileSync(paths.active, name + "\n");
}

export function clearActive(): void {
  if (existsSync(paths.active)) rmSync(paths.active);
}

export function getActiveProfile(): ServerProfile | undefined {
  const name = getActive();
  return name ? getServer(name) : undefined;
}

/**
 * Parse a vless:// link, persist the profile, and make it active if it is the first.
 * Returns the saved profile (its `name` may be derived/deduped).
 */
export function addFromLink(link: string, name?: string): ServerProfile {
  const profile = parseVless(link, name);
  if (name) profile.name = name;
  profile.name = uniqueName(profile.name);
  const first = listNames().length === 0;
  saveServer(profile);
  if (first) setActive(profile.name);
  return profile;
}

/** Return `base`, or `base-2`, `base-3`, … — the first variant not already in `taken`. */
export function dedupe(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function uniqueName(base: string): string {
  return dedupe(base, new Set(listNames()));
}

/** Rename a server profile (moves its file, updates active). Returns the final name. */
export function renameServer(oldName: string, newName: string): string {
  const profile = getServer(oldName);
  if (!profile) throw new Error(`unknown server "${oldName}"`);

  let slug = slugifyName(newName);
  const others = new Set(listNames().filter((n) => n !== oldName));
  if (others.has(slug)) {
    for (let i = 2; ; i++) {
      if (!others.has(`${slug}-${i}`)) {
        slug = `${slug}-${i}`;
        break;
      }
    }
  }
  if (slug === oldName) return oldName;

  const wasActive = getActive() === oldName;
  profile.name = slug;
  saveServer(profile);
  rmSync(paths.serverFile(oldName));
  if (wasActive) setActive(slug);
  return slug;
}
