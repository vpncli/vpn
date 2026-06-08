/** Multi-choice list: ↑/↓ move, Space toggles, Enter confirms (Esc/q cancels). */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { t } from "../core/i18n.ts";

export interface MultiItem<T> {
  label: string;
  value: T;
  hint?: string;
  selected?: boolean;
}

export function MultiSelect<T>({
  items,
  heading,
  labelWidth,
  onConfirm,
  onCancel,
}: {
  items: MultiItem<T>[];
  heading?: string;
  /** Pad the label column to this width so hints line up. */
  labelWidth?: number;
  onConfirm: (selected: T[]) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(items.map((i) => Boolean(i.selected)));

  useInput((input, key) => {
    if (key.upArrow || input === "k") setIndex((i) => (i - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setIndex((i) => (i + 1) % items.length);
    else if (input === " ") setChecked((c) => c.map((v, i) => (i === index ? !v : v)));
    else if (key.return) onConfirm(items.filter((_, i) => checked[i]).map((i) => i.value));
    else if (key.escape || input === "q") onCancel?.();
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
        const on = checked[i];
        return (
          <Box key={i}>
            <Text color={active ? "cyan" : "gray"}>{active ? "❯ " : "  "}</Text>
            <Text color={on ? "green" : "gray"}>{on ? "◉ " : "◯ "}</Text>
            {labelWidth ? (
              <Box width={labelWidth}>
                <Text color={active ? "white" : undefined} bold={active} wrap="truncate">
                  {item.label}
                </Text>
              </Box>
            ) : (
              <Text color={active ? "white" : undefined} bold={active}>
                {item.label}
              </Text>
            )}
            {item.hint ? (
              <Text color="gray" wrap="truncate">
                {item.hint}
              </Text>
            ) : null}
          </Box>
        );
      })}
      <Text color="gray">  {t("↑/↓ move · Space toggle · Enter confirm · Esc cancel")}</Text>
    </Box>
  );
}
