/**
 * xray management panel (Tab on the xray card). Real/VPN IP on top, then the
 * servers: loose servers as cards, and each subscription as a block you Tab into
 * to pick a server. A "+ Add server" button and a routes widget round it out.
 * Subscriptions are refreshed (fetched) on open, without touching the running xray.
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { getActive } from "../core/servers.ts";
import { xrayServices, type Service } from "../core/services.ts";
import { refreshSubscriptions } from "../core/subscriptions.ts";
import { isRunning } from "../core/xray.ts";
import { getRealIpAsync, getVpnIpAsync } from "../core/ip.ts";
import { cachedTcpPing } from "../core/ping.ts";
import { flagEmoji } from "./format.ts";
import { pingColor } from "./Ping.tsx";
import { ServiceRow } from "./ServiceRow.tsx";
import { RoutesSummary } from "./RoutesSummary.tsx";
import { Widget } from "./Widget.tsx";
import { Button } from "./Button.tsx";
import { BottomHint } from "./Hint.tsx";
import { CardGrid } from "./CardGrid.tsx";
import { CARD_WIDTH, useTerminalWidth, columnsFor, gridRows, moveSel, arrowDir } from "./grid.ts";
import { t } from "../core/i18n.ts";

const WIDTH = CARD_WIDTH;
/** How often the collapsed subscription block re-pings its servers for the min/max range. */
const SUB_PING_INTERVAL_MS = 8000;
/** Max country flags shown in a collapsed subscription block before eliding with "…". */
const MAX_SUB_FLAGS = 8;

function IpHeader(): React.JSX.Element {
  const active = getActive();
  const [running] = useState(() => isRunning());
  const [real, setReal] = useState<string | null>(null);
  const [vpn, setVpn] = useState<string | null>(null);
  const [loadingReal, setLoadingReal] = useState(true);
  const [loadingVpn, setLoadingVpn] = useState(running);

  useEffect(() => {
    let alive = true;
    getRealIpAsync().then((ip) => alive && (setReal(ip), setLoadingReal(false)));
    if (running) getVpnIpAsync().then((ip) => alive && (setVpn(ip), setLoadingVpn(false)));
    return () => {
      alive = false;
    };
    // Re-probe the exit IP whenever the active server changes.
  }, [running, active]);

  const value = (ip: string | null, loading: boolean, color: string) =>
    loading ? (
      <Text color="cyan">
        <Spinner type="dots" /> {t("probing…")}
      </Text>
    ) : (
      <Text color={ip ? color : "gray"}>{ip ?? t("unavailable")}</Text>
    );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} width={WIDTH}>
      <Box>
        <Box width={18}>
          <Text>{t("🏠 Real IP")}</Text>
        </Box>
        {value(real, loadingReal, "yellow")}
      </Box>
      <Box>
        <Box width={18}>
          <Text>🌍 VPN IP</Text>
        </Box>
        {running ? value(vpn, loadingVpn, "green") : <Text color="gray">({t("xray stopped")})</Text>}
      </Box>
    </Box>
  );
}

/** Unique country flags of a subscription's servers, straight from their labels (no network). */
function subFlags(items: Service[]): string[] {
  const seen: string[] = [];
  for (const s of items) if (s.countryCode && !seen.includes(s.countryCode)) seen.push(s.countryCode);
  return seen.map(flagEmoji);
}

/** TCP-ping every server in a subscription and report the min / max latency seen. */
function useSubPingRange(items: Service[]): { min: number; max: number } | null {
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const key = items.map((s) => `${s.host}:${s.port}`).join(",");
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const targets = items.filter((s) => s.host);
      const pings = await Promise.all(targets.map((s) => cachedTcpPing(s.host!, s.port ?? 443, 2500)));
      if (!alive) return;
      const ok = pings.filter((p): p is number => p !== null);
      setRange(ok.length ? { min: Math.min(...ok), max: Math.max(...ok) } : null);
    };
    void tick();
    const id = setInterval(() => void tick(), SUB_PING_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return range;
}

/** A subscription shown as one block: name + server count + country flags + ping range. */
function SubBlock({ sub, active, focused }: { sub: { name: string; items: Service[] }; active?: string; focused: boolean }): React.JSX.Element {
  const activeHere = sub.items.find((s) => s.name === active);
  const flags = subFlags(sub.items);
  const range = useSubPingRange(sub.items);
  return (
    <Widget focused={focused} width={WIDTH} minHeight={6} color="cyan">
      <Text bold color="cyan">{`📡 ${sub.name}`}</Text>
      <Text color="gray">{`${sub.items.length} ${t("servers")}`}</Text>
      {flags.length ? <Text wrap="truncate">{flags.slice(0, MAX_SUB_FLAGS).join(" ")}{flags.length > MAX_SUB_FLAGS ? " …" : ""}</Text> : null}
      {range ? (
        <Box>
          <Text color="gray">{`${t("ping")} `}</Text>
          <Text color={pingColor(range.min)}>{`${range.min}`}</Text>
          <Text color="gray">{" – "}</Text>
          <Text color={pingColor(range.max)}>{`${range.max} ms`}</Text>
        </Box>
      ) : (
        <Text color="gray">{t("pinging…")}</Text>
      )}
      {activeHere ? <Text color="green" wrap="truncate">{`● ${activeHere.name}`}</Text> : null}
    </Widget>
  );
}

/** Group xray servers into loose ones (no subscription) + one block per subscription. */
function groupServers(servers: Service[]): { loose: Service[]; subs: { name: string; items: Service[] }[] } {
  const loose = servers.filter((s) => !s.subscription);
  const order: string[] = [];
  const map = new Map<string, Service[]>();
  for (const s of servers) {
    if (!s.subscription) continue;
    if (!map.has(s.subscription)) {
      map.set(s.subscription, []);
      order.push(s.subscription);
    }
    map.get(s.subscription)!.push(s);
  }
  return { loose, subs: order.map((name) => ({ name, items: map.get(name)! })) };
}

export function XrayPanel({
  onSwitch,
  onEditServer,
  onAddServer,
  onOpenRoutes,
  onRenameSub,
  onDeleteSub,
  onBack,
}: {
  onSwitch: (name: string) => void;
  onEditServer: (name: string) => void;
  onAddServer: () => void;
  onOpenRoutes: () => void;
  onRenameSub: (name: string) => void;
  onDeleteSub: (name: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const [servers, setServers] = useState(() => xrayServices());
  // Fetch the latest subscription servers on open (no xray restart), then poll.
  useEffect(() => {
    void refreshSubscriptions().finally(() => setServers(xrayServices()));
  }, []);
  useEffect(() => {
    const id = setInterval(() => setServers(xrayServices()), 2000);
    return () => clearInterval(id);
  }, []);

  const { loose, subs } = groupServers(servers);
  const L = loose.length;
  const cells = L + subs.length; // [loose…, subs…]
  const addIdx = cells;
  const routesIdx = cells + 1;
  const total = cells + 2;

  const [sel, setSel] = useState(0);
  const [dived, setDived] = useState<string | null>(null);
  const [innerSel, setInnerSel] = useState(0);

  const columns = columnsFor(useTerminalWidth());
  const rows = gridRows(0, cells, 2, columns);
  const cur = Math.min(sel, total - 1);
  const active = getActive();
  const divedSub = dived ? subs.find((s) => s.name === dived) ?? null : null;

  useInput((input, key) => {
    // --- inner level: pick a server inside a subscription block, or rename/delete it ---
    if (divedSub) {
      const n = divedSub.items.length;
      const renameInner = n;
      const deleteInner = n + 1;
      const innerTotal = n + 2;
      const drows = gridRows(0, n, 2, columns);
      const d = arrowDir(input, key);
      const ic = Math.min(innerSel, innerTotal - 1);
      if (key.escape || input === "q") setDived(null);
      else if (key.return) {
        if (ic < n) {
          onSwitch(divedSub.items[ic]!.name);
          setDived(null);
        } else if (ic === renameInner) {
          onRenameSub(divedSub.name);
          setDived(null);
        } else if (ic === deleteInner) {
          onDeleteSub(divedSub.name);
          setDived(null);
        }
      } else if (d) setInnerSel((x) => moveSel(drows, Math.min(x, innerTotal - 1), d));
      return;
    }

    // --- top level: loose servers + subscription blocks + add + routes ---
    if (key.escape || input === "q") return onBack();
    if (key.tab) {
      if (cur < L) onEditServer(loose[cur]!.name);
      else if (cur < cells) {
        setDived(subs[cur - L]!.name);
        setInnerSel(0);
      } else if (cur === routesIdx) onOpenRoutes();
      return;
    }
    if (key.return) {
      if (cur < L) onSwitch(loose[cur]!.name);
      else if (cur < cells) {
        // A subscription is a block: Enter opens it too (then pick a server).
        setDived(subs[cur - L]!.name);
        setInnerSel(0);
      } else if (cur === addIdx) onAddServer();
      return;
    }
    const d = arrowDir(input, key);
    if (d) setSel((x) => moveSel(rows, Math.min(x, total - 1), d));
  });

  const actionParts: string[] =
    cur < L
      ? [loose[cur]!.name === active ? t("↵ active") : t("↵ switch"), t("⇥ configure")]
      : cur < cells
        ? [t("⇥ servers")]
        : cur === addIdx
          ? [t("↵ add server / subscription")]
          : [t("⇥ manage routing")];

  // Dived view: the chosen subscription's servers (pick to switch) + rename / delete.
  if (divedSub) {
    const n = divedSub.items.length;
    const renameInner = n;
    const deleteInner = n + 1;
    const ic = Math.min(innerSel, n + 1);
    const innerHint = ic < n ? [t("↵ switch")] : ic === renameInner ? [t("↵ rename")] : [t("↵ delete subscription")];
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">{`❮ 📡 ${divedSub.name} (${n})`}</Text>
        <Box marginTop={1}>
          <CardGrid
            count={n}
            columns={columns}
            render={(k) => <ServiceRow service={divedSub.items[k]!} focused={ic === k} width={WIDTH} minHeight={6} />}
          />
        </Box>
        <Box marginTop={1}>
          <Button symbol="✎" label={t("Rename subscription")} color="blue" focusColor="blueBright" focused={ic === renameInner} />
        </Box>
        <Box marginTop={1}>
          <Button symbol="✕" label={t("Delete subscription")} color="red" focusColor="redBright" focused={ic === deleteInner} />
        </Box>
        <BottomHint hint={innerHint} nav={t("↑↓←→/wasd navigate · q/Esc back")} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <IpHeader />
      {cells > 0 ? (
        <Box marginTop={1}>
          <CardGrid
            count={cells}
            columns={columns}
            render={(k) =>
              k < L ? (
                <ServiceRow service={loose[k]!} focused={cur === k} width={WIDTH} minHeight={6} />
              ) : (
                <SubBlock sub={subs[k - L]!} active={active} focused={cur === k} />
              )
            }
          />
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Button symbol="+" label={t("Add server or subscription")} color="green" focusColor="greenBright" focused={cur === addIdx} />
      </Box>
      <Box marginTop={1}>
        <RoutesSummary width={WIDTH} focused={cur === routesIdx} />
      </Box>
      <BottomHint hint={actionParts} nav={t("↑↓←→/wasd navigate · q/Esc back")} />
    </Box>
  );
}
