/** Minimal controlled text input (typing, paste, backspace, Enter, Esc). */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { t } from "../core/i18n.ts";

export function TextInput({
  label,
  placeholder = "",
  initialValue = "",
  mask = false,
  onSubmit,
  onCancel,
}: {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  mask?: boolean;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.return) return onSubmit(value.trim());
    if (key.escape) return onCancel?.();
    if (key.backspace || key.delete) return setValue((v) => v.slice(0, -1));
    if (key.ctrl && input === "u") return setValue("");
    // Ignore navigation / modifier keys; append everything else (incl. pasted chunks).
    if (key.ctrl || key.meta || key.tab || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) return;
    if (input) setValue((v) => v + input);
  });

  const shown = mask ? "•".repeat(value.length) : value;

  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      <Box>
        <Text color="cyan">❯ </Text>
        {value ? <Text>{shown}</Text> : <Text color="gray">{placeholder}</Text>}
        <Text color="cyan">█</Text>
      </Box>
      <Text color="gray">  {t("Enter submit · Esc cancel · Ctrl-U clear")}</Text>
    </Box>
  );
}
