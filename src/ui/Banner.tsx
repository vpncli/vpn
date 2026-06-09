/** Gradient ASCII logo + brand block. Hardcoded so it survives `bun --compile`. */

import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { BRAND_GRADIENT } from "./theme.ts";
import { useTerminalWidth } from "./grid.ts";
import { t } from "../core/i18n.ts";
import pkg from "../../package.json";

const VERSION = (pkg as { version: string }).version;

export const WEBSITE = "https://vpncli.cc";
export const SUPPORT_EMAIL = "info@vpncli.cc";

const LOGO = [
  " █                 █",
  "  █████████████████",
  "  █████████████████",
  " █       ███      ██",
  " █     █  █    █  ██",
  " ██       █       ██",
  " █████    █    █████",
  " ████████  █████████",
  " ████████ █████████",
  " ████████ █████████",
  " ███████ █████████",
  " ██████ █████████",
  " ████  ████████",
  " █   ████████",
  "   ██████",
].join("\n");

const NAME = [
  "██╗   ██╗██████╗ ███╗   ██╗ ██████╗██╗     ██╗",
  "██║   ██║██╔══██╗████╗  ██║██╔════╝██║     ██║",
  "██║   ██║██████╔╝██╔██╗ ██║██║     ██║     ██║",
  "╚██╗ ██╔╝██╔═══╝ ██║╚██╗██║██║     ██║     ██║",
  " ╚████╔╝ ██║     ██║ ╚████║╚██████╗███████╗██║",
  "  ╚═══╝  ╚═╝     ╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝",
].join("\n");

export function Banner({ subtitle }: { subtitle?: string }): React.JSX.Element {
  const width = useTerminalWidth();
  // The big wordmark fits beside the logo from ~72 cols (20 + 3 + 46).
  const big = width >= 72;

  return (
    <Box marginBottom={1} alignItems="center">
      <Gradient colors={BRAND_GRADIENT}>
        <Text>{LOGO}</Text>
      </Gradient>
      {/* Right block tightened to ~9 lines so it matches the owl's height. */}
      <Box flexDirection="column" marginLeft={3}>
        <Box alignItems="flex-end">
          <Gradient colors={BRAND_GRADIENT}>
            <Text bold>{big ? NAME : "vpncli"}</Text>
          </Gradient>
          <Text dimColor>{`  v${VERSION}`}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">{subtitle ?? t("manage every VPN from your terminal")}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>
              <Text color="cyan">🌐 </Text>
              <Text color="cyanBright">{WEBSITE}</Text>
            </Text>
            <Text>
              <Text>📧 </Text>
              <Text color="gray">{SUPPORT_EMAIL}</Text>
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
