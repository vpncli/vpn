/** Single-choice list navigated with ↑/↓ and Enter (Esc/q cancels). */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { t } from "../core/i18n.ts";

export interface SelectItem<T> {
  label: string;
  value: T;
  hint?: string;
  badge?: string;
}

export function Select<T>({
  items,
  heading,
  onSelect,
  onCancel,
}: {
  items: SelectItem<T>[];
  heading?: string;
  onSelect: (value: T) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") setIndex((i) => (i - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setIndex((i) => (i + 1) % items.length);
    else if (key.return) {
      const item = items[index];
      if (item) onSelect(item.value);
    } else if (key.escape || input === "q") onCancel?.();
  });

  return (
    <Box flexDirection="column">
      {heading ? (
        <Text bold color="cyan">
          {heading}
        </Text>
      ) : null}
      {items.map((item, i) => {
        const active = i === index;
        return (
          <Box key={i}>
            <Text color={active ? "cyan" : "gray"}>{active ? "❯ " : "  "}</Text>
            <Text color={active ? "white" : undefined} bold={active}>
              {item.label}
            </Text>
            {item.badge ? <Text color="yellow"> {item.badge}</Text> : null}
            {item.hint ? <Text color="gray">  {item.hint}</Text> : null}
          </Box>
        );
      })}
      <Text color="gray">  {t("↑/↓ move · Enter select · Esc cancel")}</Text>
    </Box>
  );
}
