/** Resolves all on-disk locations used by vpn (XDG-compliant). */

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

function xdgConfigHome(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim() !== "") return xdg;
  return join(homedir(), ".config");
}

const root = join(xdgConfigHome(), "vpn");

export const paths = {
  root,
  serversDir: join(root, "servers"),
  routesDir: join(root, "routes"),
  directList: join(root, "routes", "direct.list"),
  proxyList: join(root, "routes", "proxy.list"),
  blockList: join(root, "routes", "block.list"),
  presetsEnabled: join(root, "presets.enabled"),
  active: join(root, "active"),
  lang: join(root, "lang"),
  dns: join(root, "dns.json"),
  config: join(root, "config.json"),
  log: join(root, "xray.log"),
  proxyEnv: join(root, "proxy.env"),

  serverFile(name: string): string {
    return join(root, "servers", `${name}.json`);
  },
} as const;

/** Creates the config directory tree if it does not exist yet. Idempotent. */
export function ensureDirs(): void {
  mkdirSync(paths.serversDir, { recursive: true });
  mkdirSync(paths.routesDir, { recursive: true });
}
