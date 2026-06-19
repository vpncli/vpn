/** Shared focusable widget shell: a centered ❯ marker + a bordered box. */

import React from "react";
import { Box, Text } from "ink";
import { UI } from "./theme.ts";

export function Widget({
  focused = false,
  width,
  minHeight,
  color = UI.border,
  focusColor = "cyanBright",
  paddingX = 1,
  children,
}: {
  focused?: boolean;
  width?: number;
  minHeight?: number;
  /** Border color at rest. */
  color?: string;
  /** Border color when focused. */
  focusColor?: string;
  paddingX?: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box alignItems="center">
      <Text color="cyan" bold>
        {focused ? "❯ " : "  "}
      </Text>
      <Box
        flexDirection="column"
        borderStyle={focused ? "double" : "round"}
        borderColor={focused ? focusColor : color}
        paddingX={paddingX}
        width={width}
        minHeight={minHeight}
        flexShrink={0}
      >
        {children}
      </Box>
    </Box>
  );
}
