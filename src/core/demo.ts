/**
 * Demo mode for the README GIFs (`VPN_DEMO=1`). Replaces every real probe —
 * service detection, IPs, geo, ping, traffic — with canned data so a recording
 * never touches the network/OS or shows a real server. All addresses are from
 * the RFC 5737 / documentation ranges and are never real hosts.
 */

import type { Service } from "./services.ts";
import type { Geo } from "./geo.ts";
import type { TunnelTraffic } from "./tunnels.ts";
import type { Stats } from "./stats.ts";

export function isDemo(): boolean {
  return process.env.VPN_DEMO === "1";
}

export const DEMO_REAL_IP = "94.130.10.8";
const DEMO_VPN_IP = "203.0.113.42"; // active xray exit (NL)
const DEMO_OUTLINE_IP = "198.51.100.24"; // Outline tunnel exit (DE)

const GEO: Record<string, Geo> = {
  "203.0.113.42": { country: "Netherlands", countryCode: "NL" },
  "198.51.100.24": { country: "Germany", countryCode: "DE" },
  "94.130.10.8": { country: "Poland", countryCode: "PL" },
  "192.0.2.10": { country: "Germany", countryCode: "DE" },
  "192.0.2.20": { country: "Netherlands", countryCode: "NL" },
  "192.0.2.30": { country: "Japan", countryCode: "JP" },
};

export function demoGeo(ip: string): Geo {
  return GEO[ip] ?? { country: "Netherlands", countryCode: "NL" };
}

export const demoRealIp = (): string => DEMO_REAL_IP;
export const demoVpnIp = (): string => DEMO_VPN_IP;
export const demoInterfaceIp = (iface: string): string =>
  iface.includes("outline") ? DEMO_OUTLINE_IP : DEMO_VPN_IP;

/** Stable pseudo-latency 12–60 ms per host. */
export function demoPing(host: string): number {
  let h = 0;
  for (const ch of host) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 12 + (h % 48);
}

const startedAt = Date.now();
function grow(up0: number, down0: number, upPerSec: number, downPerSec: number): TunnelTraffic {
  const s = (Date.now() - startedAt) / 1000;
  return { up: Math.round(up0 + upPerSec * s), down: Math.round(down0 + downPerSec * s) };
}

export function demoTunnelTraffic(): TunnelTraffic {
  return grow(1_500_000, 12_000_000, 9_000, 60_000);
}

export function demoStats(): Stats {
  return { inbound: {}, outbound: { proxy: grow(2_400_000, 18_000_000, 22_000, 140_000), direct: { up: 0, down: 0 } } };
}

/** Synthetic full-tunnels shown next to the demo-config xray servers.
 *  VPN_DEMO_FRESH=1 hides them — a clean first-run with nothing configured. */
export function demoTunnels(): Service[] {
  if (process.env.VPN_DEMO_FRESH === "1") return [];
  return [
    { id: "demo:outline", kind: "scutil", type: "Outline", name: "Outline", fullTunnel: true, status: "up", iface: "utun-demo-outline" },
    { id: "demo:wg", kind: "scutil", type: "WireGuard", name: "Office", fullTunnel: true, status: "down" },
    { id: "demo:cp", kind: "checkpoint", type: "Check Point", name: "mycorp.example", fullTunnel: true, status: "down" },
  ];
}
