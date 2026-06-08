/** Live per-channel traffic panel with a spinner, polling xray's stats API. */

import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { getStatsAsync, type ChannelTraffic, type Stats } from "../core/stats.ts";
import { humanBytes, humanRate, flagEmoji } from "./format.ts";
import { PingBadge, useGeo, usePing } from "./Ping.tsx";
import { t } from "../core/i18n.ts";

export interface ActiveServer {
  name: string;
  host: string;
  port: number;
}

/** Top line of the panel: spinner + flag + country + IP + ping for the active server. */
function ServerHeader({ host, port }: ActiveServer): React.JSX.Element {
  const ping = usePing(host, port);
  const geo = useGeo(host);
  return (
    <Box>
      <Text color="green">
        <Spinner type="dots" />
      </Text>
      <Text>
        {"  "}
        {geo ? flagEmoji(geo.countryCode) : "🌐"}{" "}
      </Text>
      <Text bold color="green">
        {geo ? geo.country : t("locating…")}
      </Text>
      <Text color="gray">
        {"  ·  "}
        {host}
        {"  ·  "}
      </Text>
      <PingBadge {...ping} />
    </Box>
  );
}

const ZERO: ChannelTraffic = { up: 0, down: 0 };

function chan(stats: Stats | null, scope: "inbound" | "outbound", tag: string): ChannelTraffic {
  return stats?.[scope][tag] ?? ZERO;
}

interface Rates {
  proxy: ChannelTraffic;
  direct: ChannelTraffic;
}

const ZERO_RATES: Rates = { proxy: { ...ZERO }, direct: { ...ZERO } };

/** Poll the stats API on an interval and derive per-second rates from deltas. */
function useTraffic(intervalMs = 1000): { stats: Stats | null; rates: Rates } {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rates, setRates] = useState<Rates>(ZERO_RATES);
  const prev = useRef<{ stats: Stats; t: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const delta = (cur: ChannelTraffic, old: ChannelTraffic, dt: number): ChannelTraffic => ({
      up: Math.max(0, (cur.up - old.up) / dt),
      down: Math.max(0, (cur.down - old.down) / dt),
    });

    const tick = async () => {
      const s = await getStatsAsync();
      if (!alive || !s) return;
      const now = Date.now();
      if (prev.current) {
        const dt = Math.max(0.001, (now - prev.current.t) / 1000);
        setRates({
          proxy: delta(chan(s, "outbound", "proxy"), chan(prev.current.stats, "outbound", "proxy"), dt),
          direct: delta(chan(s, "outbound", "direct"), chan(prev.current.stats, "outbound", "direct"), dt),
        });
      }
      prev.current = { stats: s, t: now };
      setStats(s);
    };

    void tick();
    const id = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { stats, rates };
}

function Channel({
  icon,
  label,
  color,
  total,
  rate,
}: {
  icon: string;
  label: string;
  color: string;
  total: ChannelTraffic;
  rate: ChannelTraffic;
}): React.JSX.Element {
  return (
    <Box>
      <Box width={13}>
        <Text color={color}>
          {icon} {label}
        </Text>
      </Box>
      <Box width={12}>
        <Text color="green">↑ {humanBytes(total.up)}</Text>
      </Box>
      <Box width={13}>
        <Text color="gray">{humanRate(rate.up)}</Text>
      </Box>
      <Box width={12}>
        <Text color="cyan">↓ {humanBytes(total.down)}</Text>
      </Box>
      <Box>
        <Text color="gray">{humanRate(rate.down)}</Text>
      </Box>
    </Box>
  );
}

export function TrafficPanel({ server }: { server?: ActiveServer }): React.JSX.Element {
  const { stats, rates } = useTraffic();
  const proxy = chan(stats, "outbound", "proxy");
  const direct = chan(stats, "outbound", "direct");
  const total: ChannelTraffic = { up: proxy.up + direct.up, down: proxy.down + direct.down };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
      {server ? (
        <ServerHeader {...server} />
      ) : (
        <Box>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Text bold color="green">
            {" "}
            {t("VPN active")}
          </Text>
        </Box>
      )}
      <Box>
        <Text color="gray">  {t("traffic this session")}</Text>
      </Box>
      <Channel icon="🌍" label="VPN" color="magenta" total={proxy} rate={rates.proxy} />
      <Channel icon="🏃" label={t("Direct")} color="yellow" total={direct} rate={rates.direct} />
      <Channel icon="Σ" label={t("Total")} color="white" total={total} rate={{ up: rates.proxy.up + rates.direct.up, down: rates.proxy.down + rates.direct.down }} />
    </Box>
  );
}
