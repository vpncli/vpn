/** Shared action button: a focusable Widget with a symbol + inverse-filled label. */

import React from "react";
import { Box, Text } from "ink";
import { Widget } from "./Widget.tsx";

export function Button({
  symbol,
  label,
  color,
  focusColor,
  focused,
  keyHint = "↵",
}: {
  /** Leading glyph, e.g. "⏻" or "+". */
  symbol: string;
  label: string;
  color: string;
  /** Border + accent color when focused. */
  focusColor: string;
  focused: boolean;
  /** Key affordance shown on focus (e.g. "↵" for Enter, "⇥" for Tab). */
  keyHint?: string;
}): React.JSX.Element {
  return (
    <Widget focused={focused} color={color} focusColor={focusColor} paddingX={2}>
      <Box>
        <Text color={color} bold>
          {symbol}
          {"  "}
        </Text>
        <Text backgroundColor={color} color="black" bold>
          {` ${label} `}
        </Text>
        {focused ? (
          <Text color={focusColor} bold>
            {`   ${keyHint}`}
          </Text>
        ) : null}
      </Box>
    </Widget>
  );
}
