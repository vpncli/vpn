/** Reads per-channel traffic counters from xray's local gRPC stats API. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DEFAULT_PORTS } from "./types.ts";
import { xrayPath } from "./xray.ts";

const execFileAsync = promisify(execFile);

export interface ChannelTraffic {
  up: number;
  down: number;
}

export interface Stats {
  /** Keyed by inbound tag: socks, http. */
  inbound: Record<string, ChannelTraffic>;
  /** Keyed by outbound tag: proxy (VPN), direct, block. */
  outbound: Record<string, ChannelTraffic>;
}

interface RawStat {
  name?: string;
  value?: string | number;
}

function emptyChannel(): ChannelTraffic {
  return { up: 0, down: 0 };
}

/**
 * Query `xray api statsquery`. Returns null if xray/the API is unreachable
 * (e.g. VPN is off). Counters are cumulative since the xray process started.
 */
export async function getStatsAsync(apiPort: number = DEFAULT_PORTS.api): Promise<Stats | null> {
  const xray = xrayPath();
  if (!xray) return null;
  let raw: RawStat[];
  try {
    const { stdout } = await execFileAsync(xray, ["api", "statsquery", `--server=127.0.0.1:${apiPort}`], {
      timeout: 2000,
    });
    const parsed = JSON.parse(stdout) as { stat?: RawStat[] };
    raw = parsed.stat ?? [];
  } catch {
    return null;
  }

  const stats: Stats = { inbound: {}, outbound: {} };
  for (const s of raw) {
    if (!s.name) continue;
    // name = "<inbound|outbound>>>>tag>>>traffic>>>uplink|downlink"
    const parts = s.name.split(">>>");
    const [scope, tag, , link] = parts;
    if ((scope !== "inbound" && scope !== "outbound") || !tag || !link) continue;
    const bucket = scope === "inbound" ? stats.inbound : stats.outbound;
    bucket[tag] ??= emptyChannel();
    const value = Number(s.value ?? 0);
    if (link === "uplink") bucket[tag]!.up = value;
    else if (link === "downlink") bucket[tag]!.down = value;
  }
  return stats;
}

/** Sum of up+down across every channel (used for a quick total). */
export function totalBytes(stats: Stats): ChannelTraffic {
  const all = [...Object.values(stats.inbound), ...Object.values(stats.outbound)];
  return all.reduce<ChannelTraffic>((acc, c) => ({ up: acc.up + c.up, down: acc.down + c.down }), emptyChannel());
}
