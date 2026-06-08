/** Card-based server picker with a live availability ping per server. */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { ServerProfile } from "../core/types.ts";
import { PingBadge, useGeo, usePing } from "./Ping.tsx";
import { flagEmoji } from "./format.ts";
import { t } from "../core/i18n.ts";

function ServerCard({ s, active, focused }: { s: ServerProfile; active: boolean; focused: boolean }): React.JSX.Element {
  const ping = usePing(s.address, s.port);
  const geo = useGeo(s.address);
  const borderColor = focused ? "cyanBright" : active ? "yellow" : "gray";
  return (
    <Box flexDirection="column" borderStyle={focused ? "double" : "round"} borderColor={borderColor} paddingX={1}>
      <Box>
        <Text>{geo ? `${flagEmoji(geo.countryCode)} ` : "🌐 "}</Text>
        <Text bold color={focused ? "cyan" : undefined}>
          {s.name}
        </Text>
        {geo ? <Text color="gray">{`  ${geo.country}`}</Text> : null}
        {active ? <Text color="yellow"> {t("★ active")}</Text> : null}
      </Box>
      <Box>
        <Box width={22}>
          <Text color="gray">
            {s.address}:{s.port}
          </Text>
        </Box>
        <Box width={16}>
          <Text color="gray">
            {s.security}/{s.network}
          </Text>
        </Box>
        <PingBadge {...ping} />
      </Box>
    </Box>
  );
}

export function ServerCards({
  servers,
  activeName,
  onSelect,
  onCancel,
}: {
  servers: ServerProfile[];
  activeName?: string;
  onSelect: (value: string) => void; // "__add" or a server name
  onCancel: () => void;
}): React.JSX.Element {
  const count = servers.length + 1; // index 0 = "Add server"
  const [i, setI] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") setI((x) => (x - 1 + count) % count);
    else if (key.downArrow || input === "j") setI((x) => (x + 1) % count);
    else if (key.return || input === " ") onSelect(i === 0 ? "__add" : servers[i - 1]!.name);
    else if (key.escape || input === "q") onCancel();
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {t("Servers")}
      </Text>
      <Box>
        <Text color={i === 0 ? "cyan" : "gray"}>{i === 0 ? "❯ " : "  "}</Text>
        <Text bold={i === 0}>{t("➕ Add server")}</Text>
      </Box>
      {servers.map((s, idx) => (
        <ServerCard key={s.name} s={s} active={s.name === activeName} focused={i === idx + 1} />
      ))}
      <Text color="gray">  {t("↑/↓ move · Enter open · Esc back")}</Text>
    </Box>
  );
}
