/** Enabled-preset state and merging into routing rules. */

import { paths } from "./paths.ts";
import { readLines, writeLines } from "./lines.ts";
import type { Preset, RouteRule } from "./types.ts";
import { findPreset, PRESETS } from "../presets/data.ts";

export function getEnabled(): string[] {
  // Keep only names that still correspond to a known preset.
  return readLines(paths.presetsEnabled).filter((n) => findPreset(n) !== undefined);
}

export function isEnabled(name: string): boolean {
  return getEnabled().includes(name);
}

export function setEnabled(names: string[]): void {
  const valid = names.filter((n) => findPreset(n) !== undefined);
  const unique = [...new Set(valid)];
  writeLines(paths.presetsEnabled, unique, "# Enabled routing presets (one per line). Managed by `vpn preset`.");
}

export function enable(name: string): void {
  if (!findPreset(name)) throw new Error(`unknown preset "${name}"`);
  setEnabled([...getEnabled(), name]);
}

export function disable(name: string): void {
  setEnabled(getEnabled().filter((n) => n !== name));
}

/** All rules contributed by currently-enabled presets. */
export function enabledPresetRules(): RouteRule[] {
  return getEnabled().flatMap((n) => findPreset(n)?.rules ?? []);
}

/** All presets with their enabled state, for listing/pickers. */
export function listPresets(): Array<Preset & { enabled: boolean }> {
  const enabled = new Set(getEnabled());
  return PRESETS.map((p) => ({ ...p, enabled: enabled.has(p.name) }));
}
