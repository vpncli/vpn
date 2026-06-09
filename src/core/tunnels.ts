/** Low-level OS probes for VPN tunnels (interfaces + Check Point trac). */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isDemo, demoTunnelTraffic } from "./demo.ts";

export interface TunnelTraffic {
  up: number;
  down: number;
}

export interface InetInterface {
  iface: string;
  ip: string;
  peer: string;
}

export interface CheckpointInfo {
  up: boolean;
  /** Raw per-gateway status ("Connected"/"Connecting"). */
  status?: string;
  gateway?: string;
  site?: string;
  user?: string;
  note?: string;
}

export const CHECK_POINT_TRAC = "/Library/Application Support/Checkpoint/Endpoint Connect/trac";

function sh(cmd: string, args: string[], timeout = 4000): string {
  const res = spawnSync(cmd, args, { encoding: "utf8", timeout });
  return res.status === 0 ? (res.stdout ?? "") : "";
}

function isLinkLocal(ip: string): boolean {
  return ip.startsWith("169.254.");
}

/** Cumulative byte counters of an interface (Linux sysfs, else `netstat -ibn`). */
export function interfaceTraffic(iface: string): TunnelTraffic | null {
  if (isDemo()) return demoTunnelTraffic();
  if (process.platform === "linux") {
    try {
      const base = `/sys/class/net/${iface}/statistics`;
      const up = Number(readFileSync(`${base}/tx_bytes`, "utf8").trim());
      const down = Number(readFileSync(`${base}/rx_bytes`, "utf8").trim());
      return Number.isFinite(up) && Number.isFinite(down) ? { up, down } : null;
    } catch {
      return null;
    }
  }
  for (const line of sh("netstat", ["-ibn"]).split("\n")) {
    const f = line.trim().split(/\s+/);
    // Name Mtu Network(<Link#NN>) Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll
    if (f[0] === iface && f[2]?.startsWith("<Link#")) {
      const down = Number(f[5]);
      const up = Number(f[8]);
      if (Number.isFinite(down) && Number.isFinite(up)) return { up, down };
    }
  }
  return null;
}

/** utun/ipsec interfaces that are UP+RUNNING with a real (non-link-local) IPv4. */
export function inetInterfaces(): InetInterface[] {
  if (process.platform !== "darwin") return [];
  const names = sh("ifconfig", ["-l"]).trim().split(/\s+/).filter((n) => /^(utun|ipsec)\d/.test(n));
  const out: InetInterface[] = [];
  for (const iface of names) {
    const info = sh("ifconfig", [iface]);
    if (!/\bUP\b/.test(info) || !/\bRUNNING\b/.test(info)) continue;
    const m = info.match(/\n\s*inet (\d+\.\d+\.\d+\.\d+) --> (\d+\.\d+\.\d+\.\d+)/);
    if (!m || isLinkLocal(m[1]!)) continue;
    out.push({ iface, ip: m[1]!, peer: m[2]! });
  }
  return out;
}

/** Routes installed via an interface (destination prefixes), from `netstat -rn`. */
export function interfaceRoutes(iface: string): string[] {
  return sh("netstat", ["-rn"])
    .split("\n")
    .filter((l) => l.trim().endsWith(iface))
    .map((l) => l.trim().split(/\s+/)[0]!)
    .filter(Boolean);
}

/** Check Point status via its own `trac info`. null if the client isn't installed. */
export function checkpointInfo(): CheckpointInfo | null {
  if (!existsSync(CHECK_POINT_TRAC)) return null;
  const out = sh(CHECK_POINT_TRAC, ["info"]);
  const gateway = out.match(/^\s*gw:\s*(\S+)/m)?.[1];
  if (!gateway) return { up: false };

  // `active site: true` only means a site profile is configured — it stays true
  // even when disconnected (status: Idle). The real signals: the connection
  // `status:` (Connected/Connecting/Idle), a gateway marked `(Connected)`, and a
  // `remaining time:` (only present on a live session).
  const status = out.match(/status:\s*(\w+)/i)?.[1];
  const remaining = out.match(/remaining time:\s*([\d:]+)/)?.[1];
  const gwConnected = /\(Connected\)/i.test(out);
  const gwConnecting = /\(Connecting\)/i.test(out);

  const connected = /connected/i.test(status ?? "") || gwConnected || Boolean(remaining);
  const connecting = !connected && (/connecting/i.test(status ?? "") || gwConnecting);
  const up = connected;

  const site = out.match(/^Conn\s+(.+?):\s*$/m)?.[1]?.trim();
  const user = out.match(/(?:with )?username[:\s]+(\S+)/i)?.[1];

  return {
    up,
    status: connecting ? "Connecting" : status,
    gateway,
    site,
    user,
    note: remaining ? `${remaining.split(":")[0]}h left` : undefined,
  };
}
