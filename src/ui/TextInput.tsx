/** Bordered input-field block: title + field + blinking caret, with a hint below. */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { UI } from "./theme.ts";
import { t } from "../core/i18n.ts";

const FIELD_WIDTH = 52;

export function TextInput({
  label,
  description,
  error,
  placeholder = "",
  initialValue = "",
  mask = false,
  width = FIELD_WIDTH,
  onSubmit,
  onCancel,
}: {
  label?: string;
  description?: string;
  error?: string | null;
  placeholder?: string;
  initialValue?: string;
  mask?: boolean;
  width?: number;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [caret, setCaret] = useState(true);

  useInput((input, key) => {
    if (key.return) return onSubmit(value.trim());
    if (key.escape) return onCancel?.();
    if (key.backspace || key.delete) return setValue((v) => v.slice(0, -1));
    if (key.ctrl && input === "u") return setValue("");
    // Ignore navigation / modifier keys; append everything else (incl. pasted chunks).
    if (key.ctrl || key.meta || key.tab || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) return;
    if (input) setValue((v) => v + input);
  });

  // Blinking caret.
  useEffect(() => {
    const id = setInterval(() => setCaret((c) => !c), 500);
    return () => clearInterval(id);
  }, []);

  // Render the value (masked or plain), keeping the tail visible for long input.
  // Budget reserves room for the "↵" submit affordance on the right.
  const max = width - 10;
  const full = mask ? "•".repeat(value.length) : value;
  const shown = full.length > max ? `…${full.slice(-(max - 1))}` : full;

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width={width}>
        {label ? (
          <Text bold color="cyan" wrap="truncate">
            {label}
          </Text>
        ) : null}
        {description ? <Text color={UI.muted}>{description}</Text> : null}
        {error ? (
          <Text color="red" wrap="truncate">
            ✖ {error}
          </Text>
        ) : null}
        <Box justifyContent="space-between" marginTop={label || description || error ? 1 : 0}>
          <Box>
            <Text color="cyan">❯ </Text>
            {value ? <Text>{shown}</Text> : <Text color={UI.muted}>{placeholder}</Text>}
            <Text color="cyanBright">{caret ? "▌" : " "}</Text>
          </Box>
          {value ? (
            <Text bold color="cyanBright">
              ↵
            </Text>
          ) : null}
        </Box>
      </Box>
      <Text color={UI.muted}>{`  ${t("Enter submit · Esc cancel · Ctrl-U clear")}`}</Text>
    </Box>
  );
}
