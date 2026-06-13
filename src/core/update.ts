/**
 * Update notifier. Uses the "check in the background, notify from cache" pattern
 * so it never blocks the command the user actually ran:
 *
 *   - `notifyUpdate()` reads a cached "latest version" and, if it is newer than
 *     the running build, prints a yellow notice with the upgrade command.
 *   - `maybeScheduleCheck()` spawns a detached child (at most once per day) that
 *     fetches the latest GitHub release and rewrites the cache for the next run.
 *   - `runUpdateCheck()` is what that detached child executes.
 *
 * Honors NO_UPDATE_NOTIFIER / VPN_NO_UPDATE_NOTIFIER and stays silent off a TTY.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirs, paths } from "./paths.ts";
import { t } from "./i18n.ts";
import { c } from "../ui/theme.ts";

const REPO = "vpncli/vpn";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const FETCH_TIMEOUT_MS = 5000;

/** Set by `maybeScheduleCheck` on the detached child so it knows to just refresh. */
export const CHECK_ENV = "VPN_UPDATE_CHECK";

type Cache = { latest: string; checkedAt: number };

function notifierDisabled(): boolean {
  return Boolean(process.env.VPN_NO_UPDATE_NOTIFIER || process.env.NO_UPDATE_NOTIFIER);
}

function readCache(): Cache | null {
  try {
    if (!existsSync(paths.updateCheck)) return null;
    const d = JSON.parse(readFileSync(paths.updateCheck, "utf8")) as Partial<Cache>;
    if (typeof d.latest === "string" && typeof d.checkedAt === "number") {
      return { latest: d.latest, checkedAt: d.checkedAt };
    }
  } catch {
    // corrupt cache → treat as missing
  }
  return null;
}

function writeCache(cache: Cache): void {
  try {
    writeFileSync(paths.updateCheck, JSON.stringify(cache));
  } catch {
    // best-effort; a failed write just means we re-check next run
  }
}

/** Numeric, dotted version compare. "1.0.10" > "1.0.9", leading "v" ignored. */
function parseVer(v: string): number[] {
  return (v.replace(/^v/, "").split("-")[0] ?? "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

export function isNewer(latest: string, current: string): boolean {
  const a = parseVer(latest);
  const b = parseVer(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Pick the upgrade command based on how this binary was installed. */
function updateCommand(): string {
  const exe = process.execPath;
  // Homebrew (macOS `…/Cellar/…`, Linuxbrew `/home/linuxbrew/…`).
  if (/cellar|homebrew|linuxbrew/i.test(exe)) return "brew upgrade vpn";
  // The .deb installs to /usr/bin; the curl installer uses /usr/local/bin or ~/.local/bin.
  if (process.platform === "linux" && exe.startsWith("/usr/bin/")) {
    return "sudo apt-get update && sudo apt-get install --only-upgrade vpn";
  }
  return "curl -fsSL https://raw.githubusercontent.com/vpncli/vpn/main/install.sh | bash";
}

/**
 * Print the yellow "new version available" notice if the cache says one exists.
 * Reads only local state — safe to call at the end of any command.
 */
export function notifyUpdate(current: string): void {
  if (notifierDisabled() || !process.stdout.isTTY) return;
  const cache = readCache();
  if (!cache?.latest || !isNewer(cache.latest, current)) return;

  const cmd = updateCommand();
  console.log();
  console.log(
    c.yellow(`▲ ${t("vpn {latest} is available — you have {current}", { latest: cache.latest, current })}`),
  );
  console.log(c.yellow(`  ${t("update:")} ${c.bold(cmd)}`));
  console.log();
}

/**
 * If the cache is stale (or missing), spawn a detached child to refresh it in
 * the background and return immediately. Never blocks the current command.
 */
export function maybeScheduleCheck(): void {
  if (notifierDisabled()) return;
  const cache = readCache();
  if (cache && Date.now() - cache.checkedAt < CHECK_INTERVAL_MS) return;

  try {
    // In dev we run `bun src/cli.tsx …`; in the compiled binary execPath is `vpn`
    // itself. Re-pass the script path only when launched through an interpreter.
    const script =
      process.argv[1] && /\.(tsx?|m?js)$/.test(process.argv[1]) ? [process.argv[1]] : [];
    const child = spawn(process.execPath, script, {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, [CHECK_ENV]: "1" },
    });
    child.unref();
  } catch {
    // spawning is best-effort; we just won't refresh this run
  }
}

/** Fetch the latest release tag from GitHub and rewrite the cache. */
export async function runUpdateCheck(): Promise<void> {
  ensureDirs();
  let latest = readCache()?.latest ?? "";
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "vpncli" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = (await res.json()) as { tag_name?: string };
      if (data.tag_name) latest = data.tag_name.replace(/^v/, "");
    }
  } catch {
    // offline / timeout / rate-limited: keep the previous `latest`, just bump the
    // timestamp below so we don't re-spawn a checker on every command.
  }
  writeCache({ latest, checkedAt: Date.now() });
}
