/** Ping hook + badges (latency / availability) shared by the menu and server cards. */

import React, { useEffect, useState } from "react";
import { Text } from "ink";
import Spinner from "ink-spinner";
import { tcpPing } from "../core/ping.ts";
import { geolocate, type Geo } from "../core/geo.ts";
import { t } from "../core/i18n.ts";

export interface PingState {
  ms: number | null;
  loading: boolean;
}

/** Probe host:port on mount and every `intervalMs`. */
export function usePing(host: string, port: number, intervalMs = 5000): PingState {
  const [ms, setMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const v = await tcpPing(host, port);
      if (!alive) return;
      setMs(v);
      setLoading(false);
    };
    void tick();
    const id = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [host, port, intervalMs]);

  return { ms, loading };
}

/** Resolve the country of an IP once (cached); null until known/failed. */
export function useGeo(ip: string): Geo | null {
  const [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => {
    if (!ip) return;
    let alive = true;
    void geolocate(ip).then((g) => alive && setGeo(g));
    return () => {
      alive = false;
    };
  }, [ip]);
  return geo;
}

export function pingColor(ms: number | null): string {
  if (ms === null) return "red";
  if (ms <= 80) return "green";
  if (ms <= 150) return "cyan";
  if (ms <= 300) return "yellow";
  return "red";
}

export function PingBadge({ ms, loading }: PingState): React.JSX.Element {
  if (loading)
    return (
      <Text color="gray">
        <Spinner type="dots" /> {t("ping…")}
      </Text>
    );
  if (ms === null) return <Text color="red">✕ {t("offline")}</Text>;
  return <Text color={pingColor(ms)}>● {ms} ms</Text>;
}
