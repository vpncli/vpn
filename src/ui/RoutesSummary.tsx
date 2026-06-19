/** Pretty read-only summary of the active routing: enabled presets + rule lists. */

import React from "react";
import { Box, Text } from "ink";
import { listPresets } from "../core/presets.ts";
import { readList } from "../core/routes.ts";
import type { RouteTarget } from "../core/types.ts";
import { Widget } from "./Widget.tsx";
import { UI } from "./theme.ts";
import { t } from "../core/i18n.ts";

/** One target's rules, listed in a column under a colored header. */
function RuleBlock({ label, color, target }: { label: string; color: string; target: RouteTarget }): React.JSX.Element {
  const rules = readList(target);
  return (
    <Box flexDirection="column">
      <Text color={color} bold>
        {`${label} (${rules.length})`}
      </Text>
      {rules.length === 0 ? (
        <Text color={UI.muted}>{"  —"}</Text>
      ) : (
        rules.map((r, i) => (
          <Text key={i} color={UI.muted} wrap="truncate">
            {`  ${r}`}
          </Text>
        ))
      )}
    </Box>
  );
}

export function RoutesSummary({ width, focused }: { width?: number; focused?: boolean }): React.JSX.Element {
  const enabled = listPresets().filter((p) => p.enabled);
  return (
    <Widget focused={focused} width={width} color="green">
      <Text bold color="green">
        {t("Routing")}
      </Text>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          {t("presets")}
        </Text>
        {enabled.length === 0 ? (
          <Text color={UI.muted}>{"  —"}</Text>
        ) : (
          enabled.map((p) => (
            <Text key={p.name} color="greenBright" wrap="truncate">
              {`  ✓ ${t(p.title)}`}
            </Text>
          ))
        )}
      </Box>
      <RuleBlock label={t("direct")} color="blueBright" target="direct" />
      <RuleBlock label={t("proxy")} color="greenBright" target="proxy" />
      <RuleBlock label={t("block")} color="red" target="block" />
    </Widget>
  );
}
