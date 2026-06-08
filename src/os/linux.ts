/** Linux (Ubuntu 22.04+) backend: GNOME system proxy via `gsettings` + env file. */

import { spawnSync } from "node:child_process";
import type { Ports } from "../core/types.ts";
import type { OsLayer, ProxyEnv, StatusLine } from "./types.ts";

function hasGsettings(): boolean {
  return spawnSync("sh", ["-c", "command -v gsettings"]).status === 0;
}

function gset(schema: string, key: string, value: string): void {
  spawnSync("gsettings", ["set", schema, key, value]);
}

function ignoreHostsLiteral(bypass: string[]): string {
  const base = ["localhost", "127.0.0.0/8", "::1"];
  const all = [...new Set([...base, ...bypass])];
  return "[" + all.map((h) => `'${h.replace(/'/g, "")}'`).join(", ") + "]";
}

export const linux: OsLayer = {
  name: "Linux (gsettings + env file)",

  proxyOn(ports: Ports, bypass: string[]): void {
    if (!hasGsettings()) return; // env file (written by lifecycle) still covers terminals
    gset("org.gnome.system.proxy.socks", "host", "127.0.0.1");
    gset("org.gnome.system.proxy.socks", "port", String(ports.socks));
    gset("org.gnome.system.proxy.http", "host", "127.0.0.1");
    gset("org.gnome.system.proxy.http", "port", String(ports.http));
    gset("org.gnome.system.proxy.https", "host", "127.0.0.1");
    gset("org.gnome.system.proxy.https", "port", String(ports.http));
    gset("org.gnome.system.proxy", "ignore-hosts", ignoreHostsLiteral(bypass));
    gset("org.gnome.system.proxy", "mode", "manual");
  },

  proxyOff(): void {
    if (!hasGsettings()) return;
    gset("org.gnome.system.proxy", "mode", "none");
  },

  // On Linux there is no launchctl equivalent; GUI apps read GNOME settings, and
  // terminals source ~/.config/vpn/proxy.env (written by the lifecycle layer).
  appSetenv(_env: ProxyEnv): void {},
  appUnsetenv(): void {},

  statusExtras(): StatusLine[] {
    if (!hasGsettings()) {
      return [{ label: "System proxy", ok: false, value: "gsettings n/a (env file only)" }];
    }
    const res = spawnSync("gsettings", ["get", "org.gnome.system.proxy", "mode"], { encoding: "utf8" });
    const mode = (res.stdout ?? "").trim().replace(/'/g, "");
    return [{ label: "System proxy (GNOME)", ok: mode === "manual", value: mode || "unknown" }];
  },

  depsHint(): string {
    return "Terminals: source ~/.config/vpn/proxy.env (auto with `vpn init`). GUI: GNOME proxy set via gsettings.";
  },
};
