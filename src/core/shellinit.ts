/** Idempotently wires the proxy-env auto-source into the user's shell rc. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MARKER = "# vpn proxy env";
const SOURCE_LINE = "[ -f ~/.config/vpn/proxy.env ] && source ~/.config/vpn/proxy.env";

function rcPath(): string {
  const shell = process.env.SHELL ?? "";
  return join(homedir(), shell.includes("bash") ? ".bashrc" : ".zshrc");
}

export interface ShellInitResult {
  changed: boolean;
  rc: string;
}

/**
 * Append the proxy-env auto-source block to the shell rc if it is not already
 * there. Idempotent and silent on repeat calls (safe to run on every `vpn on`).
 */
export function ensureShellInit(): ShellInitResult {
  const rc = rcPath();
  const content = existsSync(rc) ? readFileSync(rc, "utf8") : "";
  if (content.includes(MARKER)) return { changed: false, rc };

  const prefix = content.trimEnd();
  const sep = prefix ? "\n\n" : "";
  writeFileSync(rc, `${prefix}${sep}${MARKER}\n${SOURCE_LINE}\n`);
  return { changed: true, rc };
}
