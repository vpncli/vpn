/** One VPN service rendered as a compact panel with live ping / flag / traffic. */

import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { Service } from "../core/services.ts";
import { tcpPing, cachedTcpPing, icmpPing } from "../core/ping.ts";
import { getStatsAsync } from "../core/stats.ts";
import { getInterfaceIpAsync } from "../core/ip.ts";
import { interfaceTraffic, type TunnelTraffic } from "../core/tunnels.ts";
import { useGeo, PingBadge } from "./Ping.tsx";
import { Widget } from "./Widget.tsx";
import { flagEmoji, humanBytes, humanRate } from "./format.ts";

function useServicePing(s: Service, exitIp: string | null): { ms: number | null; loading: boolean } {
  const [ms, setMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      let v: number | null = null;
      // xray: TCP handshake to the server. Tunnel apps mostly block ICMP, so once
      // we know the public exit IP, TCP-ping it (443); otherwise fall back to an
      // ICMP ping of the gateway (works for Check Point's public gateway).
      if (s.kind === "xray" && s.host) v = await cachedTcpPing(s.host, s.port ?? 443, 2500);
      else if (exitIp) v = await tcpPing(exitIp, 443, 2500);
      else if (s.gateway) v = await icmpPing(s.gateway);
      if (!alive) return;
      setMs(v);
      setLoading(false);
    };
    void tick();
    const id = setInterval(() => void tick(), 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [s.id, s.host, s.port, s.gateway, s.kind, exitIp]);
  return { ms, loading };
}

function useServiceTraffic(s: Service): { total: TunnelTraffic | null; rate: TunnelTraffic } {
  const [total, setTotal] = useState<TunnelTraffic | null>(null);
  const [rate, setRate] = useState<TunnelTraffic>({ up: 0, down: 0 });
  const prev = useRef<{ t: number; v: TunnelTraffic } | null>(null);
  useEffect(() => {
    if (s.status !== "up") {
      setTotal(null);
      prev.current = null;
      return;
    }
    let alive = true;
    const tick = async () => {
      let v: TunnelTraffic | null = null;
      if (s.kind === "xray") {
        const stats = await getStatsAsync();
        const p = stats?.outbound["proxy"];
        if (p) v = { up: p.up, down: p.down };
      } else if (s.iface) {
        v = interfaceTraffic(s.iface);
      }
      if (!alive || !v) return;
      const now = Date.now();
      if (prev.current) {
        const dt = Math.max(0.001, (now - prev.current.t) / 1000);
        setRate({
          up: Math.max(0, (v.up - prev.current.v.up) / dt),
          down: Math.max(0, (v.down - prev.current.v.down) / dt),
        });
      }
      prev.current = { t: now, v };
      setTotal(v);
    };
    void tick();
    const id = setInterval(() => void tick(), 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [s.id, s.status, s.iface, s.kind]);
  return { total, rate };
}

/** Public exit IP seen through a tunnel interface (full-tunnel only; null otherwise). */
function useExitIp(s: Service): string | null {
  const [ip, setIp] = useState<string | null>(null);
  useEffect(() => {
    if (s.status !== "up" || !s.iface) {
      setIp(null);
      return;
    }
    let alive = true;
    void getInterfaceIpAsync(s.iface).then((v) => alive && setIp(v));
    return () => {
      alive = false;
    };
  }, [s.status, s.iface]);
  return ip;
}

export interface ServiceRowProps {
  service: Service;
  focused: boolean;
  /** Fixed card width (for the wrapping grid); content-sized when omitted. */
  width?: number;
  /** Fixed content height — reserves space so cards align and don't jitter as data loads. */
  minHeight?: number;
  /** Class chip shown in the card header (e.g. tunnel vs proxy). */
  badge?: { text: string; color: string };
  /** Dim explanation line under the name (e.g. "captures all OS traffic"). */
  subtitle?: string;
}

export function ServiceRow({ service, focused, width, minHeight, badge, subtitle }: ServiceRowProps): React.JSX.Element {
  const exitIp = useExitIp(service);
  const ping = useServicePing(service, exitIp);
  // Subscription servers carry their country code (from the label flag) — reliable
  // even when they share a front address that can't be geolocated. Fall back to geo.
  const geo = useGeo(service.countryCode ? "" : exitIp || service.gateway || service.host || "");
  const countryCode = service.countryCode || geo?.countryCode;
  const traffic = useServiceTraffic(service);

  const up = service.status === "up";
  const connecting = service.status === "connecting";
  const statusColor = up ? "green" : connecting ? "yellow" : "gray";
  // Full tunnels keep their class color on the border so they read as "tunnel"
  // even at rest; focus brightens it; status tints xray/idle cards.
  const restColor = badge ? badge.color : up ? "green" : connecting ? "yellow" : "gray";
  const ipText = exitIp || service.host || service.gateway || "";

  return (
    <Widget focused={focused} width={width} minHeight={minHeight} color={restColor}>
      {badge ? (
          <Text backgroundColor={badge.color} color="black" bold wrap="truncate">
            {` ${badge.text} `}
          </Text>
        ) : null}
        <Box>
          {connecting ? (
            <Text color="yellow">
              <Spinner type="dots" />{" "}
            </Text>
          ) : (
            <Text color={statusColor}>● </Text>
          )}
          {countryCode ? <Text>{flagEmoji(countryCode)} </Text> : null}
          <Text bold color={up ? "white" : "gray"} wrap="truncate">
            {service.name}
          </Text>
          {service.active ? <Text color="yellow"> ★</Text> : null}
        </Box>
        {subtitle ? <Text color="gray" wrap="truncate">{subtitle}</Text> : null}
        {ipText ? (
          <Box>
            <Text color="gray" wrap="truncate">{ipText}</Text>
            <Text>
              {"   "}
              <PingBadge {...ping} />
            </Text>
            {service.note ? <Text color="gray" wrap="truncate">{`   ${service.note}`}</Text> : null}
          </Box>
        ) : service.note ? (
          <Text color="gray" wrap="truncate">{service.note}</Text>
        ) : null}
        {up && traffic.total ? (
          <>
            <Box>
              <Text color="green" wrap="truncate">{`↑ ${humanBytes(traffic.total.up)} `}</Text>
              <Text color="gray" wrap="truncate">{`(${humanRate(traffic.rate.up)})`}</Text>
            </Box>
            <Box>
              <Text color="cyan" wrap="truncate">{`↓ ${humanBytes(traffic.total.down)} `}</Text>
              <Text color="gray" wrap="truncate">{`(${humanRate(traffic.rate.down)})`}</Text>
            </Box>
          </>
        ) : null}
    </Widget>
  );
}
