/** Real vs. VPN public-IP probes (via curl, with fallback endpoints). */

import { execFile } from "node:child_process";
import { spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { DEFAULT_PORTS } from "./types.ts";

const ENDPOINTS = ["ifconfig.me", "icanhazip.com", "api.ipify.org"];
const execFileAsync = promisify(execFile);

// Direct probes are fast; proxied probes do remote DNS (socks5h) + tunnel setup,
// so they need a more generous timeout.
const DIRECT_TIMEOUT = "5";
const PROXY_TIMEOUT = "10";

function curl(timeout: string, extraArgs: string[]): string | null {
  for (const host of ENDPOINTS) {
    const res = spawnSync("curl", ["-s", "--max-time", timeout, ...extraArgs, host], { encoding: "utf8" });
    const out = (res.stdout ?? "").trim();
    if (res.status === 0 && out) return out;
  }
  return null;
}

async function curlAsync(timeout: string, extraArgs: string[]): Promise<string | null> {
  for (const host of ENDPOINTS) {
    try {
      const { stdout } = await execFileAsync("curl", ["-s", "--max-time", timeout, ...extraArgs, host]);
      const out = stdout.trim();
      if (out) return out;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

function proxyArgs(socksPort: number): string[] {
  return ["--proxy", `socks5h://127.0.0.1:${socksPort}`];
}

// Force a truly direct request: ignore any HTTP_PROXY/ALL_PROXY env vars that
// `vpn on` sets — otherwise the "real IP" probe would tunnel through the VPN.
const DIRECT_ARGS = ["--noproxy", "*"];

/** Public IP as seen without the proxy. */
export function getRealIp(): string | null {
  return curl(DIRECT_TIMEOUT, DIRECT_ARGS);
}

/** Public IP as seen through the local SOCKS proxy (i.e. the VPN exit). */
export function getVpnIp(socksPort: number = DEFAULT_PORTS.socks): string | null {
  return curl(PROXY_TIMEOUT, proxyArgs(socksPort));
}

export function getRealIpAsync(): Promise<string | null> {
  return curlAsync(DIRECT_TIMEOUT, DIRECT_ARGS);
}

export function getVpnIpAsync(socksPort: number = DEFAULT_PORTS.socks): Promise<string | null> {
  return curlAsync(PROXY_TIMEOUT, proxyArgs(socksPort));
}
