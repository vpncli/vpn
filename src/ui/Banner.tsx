/** Gradient ASCII wordmark. Hardcoded (no runtime font files) so it survives `bun --compile`. */

import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { BRAND_GRADIENT } from "./theme.ts";
import pkg from "../../package.json";

const VERSION = (pkg as { version: string }).version;

const WORDMARK = [
  "██╗   ██╗██████╗ ███╗   ██╗",
  "██║   ██║██╔══██╗████╗  ██║",
  "██║   ██║██████╔╝██╔██╗ ██║",
  "╚██╗ ██╔╝██╔═══╝ ██║╚██╗██║",
  " ╚████╔╝ ██║     ██║ ╚████║",
  "  ╚═══╝  ╚═╝     ╚═╝  ╚═══╝",
].join("\n");

export function Banner({ subtitle }: { subtitle?: string }): React.JSX.Element {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Gradient colors={BRAND_GRADIENT}>
        <Text>{WORDMARK}</Text>
      </Gradient>
      <Text color="gray">
        {subtitle ? `  ${subtitle}  ` : "  "}
        <Text dimColor>v{VERSION}</Text>
      </Text>
    </Box>
  );
}
