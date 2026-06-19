/** Status dashboard: a boxed list of status rows + live real/VPN IP with spinners. */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { StatusLine } from "../os/index.ts";
import { statusLines } from "../core/lifecycle.ts";
import { isRunning } from "../core/xray.ts";
import { getRealIpAsync, getVpnIpAsync } from "../core/ip.ts";
import { UI } from "./theme.ts";
import { t } from "../core/i18n.ts";

function Row({ line }: { line: StatusLine }): React.JSX.Element {
  return (
    <Box>
      <Text color={line.ok ? "green" : "red"}>● </Text>
      <Box width={22}>
        <Text>{t(line.label)}</Text>
      </Box>
      <Text color={line.ok ? undefined : UI.muted}>{line.value ?? (line.ok ? "ok" : "—")}</Text>
    </Box>
  );
}

function IpRow({ label, ip, loading, color }: { label: string; ip: string | null; loading: boolean; color: string }): React.JSX.Element {
  return (
    <Box>
      <Box width={24}>
        <Text>{label}</Text>
      </Box>
      {loading ? (
        <Text color="cyan">
          <Spinner type="dots" /> {t("probing…")}
        </Text>
      ) : (
        <Text color={ip ? color : UI.muted}>{ip ?? t("unavailable")}</Text>
      )}
    </Box>
  );
}

export function StatusDashboard({ onDone }: { onDone?: () => void }): React.JSX.Element {
  // Compute the (sync, subprocess-spawning) status once — not on every spinner tick.
  const [lines] = useState(() => statusLines());
  const [running] = useState(() => isRunning());
  const [realIp, setRealIp] = useState<string | null>(null);
  const [vpnIp, setVpnIp] = useState<string | null>(null);
  const [loadingReal, setLoadingReal] = useState(true);
  const [loadingVpn, setLoadingVpn] = useState(running);

  useEffect(() => {
    let alive = true;
    getRealIpAsync().then((ip) => alive && (setRealIp(ip), setLoadingReal(false)));
    if (running) {
      getVpnIpAsync().then((ip) => alive && (setVpnIp(ip), setLoadingVpn(false)));
    }
    return () => {
      alive = false;
    };
  }, [running]);

  useEffect(() => {
    if (!loadingReal && !loadingVpn) onDone?.();
  }, [loadingReal, loadingVpn, onDone]);

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          {t("VPN status")}
        </Text>
        {lines.map((line, i) => (
          <Row key={i} line={line} />
        ))}
      </Box>
      <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1} marginTop={1}>
        <IpRow label={t("🏠 Real IP")} ip={realIp} loading={loadingReal} color="yellow" />
        {running ? (
          <IpRow label="🌍 VPN IP" ip={vpnIp} loading={loadingVpn} color="green" />
        ) : (
          <Text color={UI.muted}>🌍 VPN IP            ({t("xray stopped")})</Text>
        )}
      </Box>
    </Box>
  );
}
