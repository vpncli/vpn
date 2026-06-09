/**
 * xray management panel (Tab on the xray card). Mirrors the main dashboard:
 * Real/VPN IP on top, then focusable widgets — server cards and a routes widget.
 * Enter acts (switch server / open routes); Tab dives (edit server / edit routes).
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { getActive } from "../core/servers.ts";
import { xrayServices } from "../core/services.ts";
import { isRunning } from "../core/xray.ts";
import { getRealIpAsync, getVpnIpAsync } from "../core/ip.ts";
import { ServiceRow } from "./ServiceRow.tsx";
import { RoutesSummary } from "./RoutesSummary.tsx";
import { Button } from "./Button.tsx";
import { BottomHint } from "./Hint.tsx";
import { CardGrid } from "./CardGrid.tsx";
import { CARD_WIDTH, useCardNav } from "./grid.ts";
import { t } from "../core/i18n.ts";

const WIDTH = CARD_WIDTH;

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

export function XrayPanel({
  onSwitch,
  onEditServer,
  onAddServer,
  onOpenRoutes,
  onBack,
}: {
  onSwitch: (name: string) => void;
  onEditServer: (name: string) => void;
  onAddServer: () => void;
  onOpenRoutes: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const [servers, setServers] = useState(() => xrayServices());
  useEffect(() => {
    const id = setInterval(() => setServers(xrayServices()), 2000);
    return () => clearInterval(id);
  }, []);

  // Focusable cells: [server grid…, addServer, routesWidget].
  const addIdx = servers.length;
  const routesIdx = servers.length + 1;
  const { cur, columns } = useCardNav(servers.length, {
    trailing: 2,
    onKey: (input, key, i) => {
      if (key.escape || input === "q") return onBack();
      if (key.tab) {
        if (i < servers.length) onEditServer(servers[i]!.name);
        else if (i === routesIdx) onOpenRoutes();
        return;
      }
      // Enter = final actions; routes widget opens with Tab only.
      if (key.return) {
        if (i < servers.length) onSwitch(servers[i]!.name);
        else if (i === addIdx) onAddServer();
      }
    },
  });

  const active = getActive();
  const actionParts: string[] =
    cur < servers.length
      ? [servers[cur]!.name === active ? t("↵ active") : t("↵ switch"), t("⇥ configure")]
      : cur === addIdx
        ? [t("↵ add server")]
        : [t("⇥ manage routing")];

  return (
    <Box flexDirection="column">
      <IpHeader />
      <Box marginTop={1}>
        <CardGrid
          count={servers.length}
          columns={columns}
          render={(k) => <ServiceRow service={servers[k]!} focused={cur === k} width={WIDTH} minHeight={6} />}
        />
      </Box>
      <Box marginTop={1}>
        <Button symbol="+" label={t("Add server")} color="green" focusColor="greenBright" focused={cur === addIdx} />
      </Box>
      <Box marginTop={1}>
        <RoutesSummary width={WIDTH} focused={cur === routesIdx} />
      </Box>
      <BottomHint hint={actionParts} nav={t("↑↓←→/wasd navigate · q/Esc back")} />
    </Box>
  );
}

