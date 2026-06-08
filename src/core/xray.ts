/** Locating, validating, and running the xray binary. */

import { spawn, spawnSync } from "node:child_process";
import { openSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths } from "./paths.ts";

let cachedPath: string | null | undefined;

/** Absolute path to the xray binary, or null if not installed. */
export function xrayPath(): string | null {
  if (cachedPath !== undefined) return cachedPath;
  const res = spawnSync("sh", ["-c", "command -v xray"], { encoding: "utf8" });
  cachedPath = res.status === 0 ? res.stdout.trim() : null;
  return cachedPath;
}

export function requireXray(): string {
  const p = xrayPath();
  if (!p) {
    throw new Error(
      "xray binary not found in PATH.\n" +
        "  macOS:  brew install xray\n" +
        "  Ubuntu: bash -c \"$(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh)\"",
    );
  }
  return p;
}

export function isRunning(): boolean {
  return spawnSync("pgrep", ["-x", "xray"]).status === 0;
}

export function pids(): string {
  const res = spawnSync("pgrep", ["-d,", "-x", "xray"], { encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : "";
}

export interface ValidationResult {
  ok: boolean;
  output: string;
}

/** Run `xray run -test -c <file>` and capture combined output. */
export function validateConfigFile(file: string): ValidationResult {
  const xray = requireXray();
  const res = spawnSync(xray, ["run", "-test", "-c", file], { encoding: "utf8" });
  return {
    ok: res.status === 0,
    output: `${res.stdout ?? ""}${res.stderr ?? ""}`.trim(),
  };
}

/**
 * Write a config object to a temp file and validate it. Returns the result plus
 * the serialized JSON so the caller can persist it on success.
 */
export function validateConfig(config: unknown): ValidationResult & { json: string } {
  const json = JSON.stringify(config, null, 2);
  const tmp = join(tmpdir(), `vpn-config-${process.pid}.json`);
  writeFileSync(tmp, json);
  return { ...validateConfigFile(tmp), json };
}

/** Start xray detached, logging to paths.log. No-op safety: caller should stop first. */
export function start(configFile = paths.config): void {
  const xray = requireXray();
  const fd = openSync(paths.log, "a");
  const child = spawn(xray, ["run", "-c", configFile], {
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  child.unref();
}

export function stop(): boolean {
  if (!isRunning()) return false;
  spawnSync("pkill", ["-x", "xray"]);
  return true;
}
