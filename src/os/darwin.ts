/** macOS backend: system proxy via `networksetup`, app env via `launchctl`. */

import { spawnSync } from "node:child_process";
import type { Ports } from "../core/types.ts";
import type { OsLayer, ProxyEnv, StatusLine } from "./types.ts";

/** The network service to configure (e.g. "Wi-Fi"). Override with VPN_NET_SERVICE. */
function netService(): string {
  return process.env.VPN_NET_SERVICE?.trim() || "Wi-Fi";
}

function ns(...args: string[]): void {
  spawnSync("networksetup", args);
}

export const darwin: OsLayer = {
  name: "macOS (networksetup + launchctl)",

  proxyOn(ports: Ports, bypass: string[]): void {
    const svc = netService();
    ns("-setsocksfirewallproxy", svc, "127.0.0.1", String(ports.socks));
    ns("-setsocksfirewallproxystate", svc, "on");
    ns("-setwebproxy", svc, "127.0.0.1", String(ports.http));
    ns("-setwebproxystate", svc, "on");
    ns("-setsecurewebproxy", svc, "127.0.0.1", String(ports.http));
    ns("-setsecurewebproxystate", svc, "on");
    ns("-setproxybypassdomains", svc, ...bypass);
  },

  proxyOff(): void {
    const svc = netService();
    ns("-setsocksfirewallproxystate", svc, "off");
    ns("-setwebproxystate", svc, "off");
    ns("-setsecurewebproxystate", svc, "off");
  },

  appSetenv(env: ProxyEnv): void {
    spawnSync("launchctl", ["setenv", "HTTP_PROXY", env.httpProxy]);
    spawnSync("launchctl", ["setenv", "HTTPS_PROXY", env.httpsProxy]);
    spawnSync("launchctl", ["setenv", "ALL_PROXY", env.allProxy]);
    spawnSync("launchctl", ["setenv", "NO_PROXY", env.noProxy]);
  },

  appUnsetenv(): void {
    for (const k of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"]) {
      spawnSync("launchctl", ["unsetenv", k]);
    }
  },

  statusExtras(): StatusLine[] {
    const svc = netService();
    const res = spawnSync("networksetup", ["-getsocksfirewallproxy", svc], { encoding: "utf8" });
    const enabled = /^Enabled:\s*Yes/m.test(res.stdout ?? "");
    return [{ label: `System proxy (${svc})`, ok: enabled, value: enabled ? "on" : "off" }];
  },

  depsHint(): string {
    return "Restart GUI apps so they pick up the proxy env. Terminals: source ~/.config/vpn/proxy.env";
  },
};
