/** A hint line: pass the parts, they're joined by a uniform " · " separator. */

import React from "react";
import { Box, Text } from "ink";

export function Hint({
  parts,
  color = "cyanBright",
  bold = true,
}: {
  /** Hint fragments, e.g. ["↵ connect", "⇥ servers"]. Falsy entries are dropped. */
  parts: Array<string | false | null | undefined>;
  color?: string;
  bold?: boolean;
}): React.JSX.Element {
  const items = parts.filter(Boolean) as string[];
  return (
    <Text color={color} bold={bold}>
      {`  ${items.join("  ·  ")}`}
    </Text>
  );
}

/** Standard screen footer: a cyan contextual hint above the gray navigation line. */
export function BottomHint({ hint, nav }: { hint?: string[]; nav: string }): React.JSX.Element {
  return (
    <Box marginTop={1} flexDirection="column">
      {hint && hint.length ? <Hint parts={hint} /> : null}
      <Text color="gray">{`  ${nav}`}</Text>
    </Box>
  );
}
