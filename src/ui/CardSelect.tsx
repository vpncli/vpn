/** A picker rendered as a grid of cards (replaces flat Select/MultiSelect lists). */

import React, { useState } from "react";
import { Box, Text } from "ink";
import { Widget } from "./Widget.tsx";
import { UI } from "./theme.ts";
import { CardGrid } from "./CardGrid.tsx";
import { BottomHint } from "./Hint.tsx";
import { CARD_WIDTH, useCardNav } from "./grid.ts";
import { t } from "../core/i18n.ts";

export interface CardOption<T> {
  label: string;
  value: T;
  /** Dim line under the label. */
  description?: string;
  /** Small yellow badge after the label (e.g. "★"). */
  badge?: string;
  /** Border color at rest. */
  color?: string;
  /** Pre-checked state (multi mode). */
  selected?: boolean;
}

export function CardSelect<T>({
  heading,
  items,
  multi = false,
  minHeight = 3,
  columns,
  openWithTab = false,
  onSelect,
  onConfirm,
  onCancel,
}: {
  heading?: string;
  items: CardOption<T>[];
  multi?: boolean;
  minHeight?: number;
  /** Force a column count (e.g. 1 for a vertical menu); auto-fits otherwise. */
  columns?: number;
  /** Open on Tab instead of Enter (for menus that navigate to a sub-screen). */
  openWithTab?: boolean;
  onSelect?: (value: T) => void;
  onConfirm?: (values: T[]) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const [checked, setChecked] = useState<boolean[]>(() => items.map((i) => !!i.selected));
  const { cur, columns: cols } = useCardNav(items.length, {
    columns,
    onKey: (input, key, i) => {
      if (key.escape || input === "q") return onCancel?.();
      if (multi) {
        if (input === " ") return setChecked((c) => c.map((v, k) => (k === i ? !v : v)));
        if (key.return) return onConfirm?.(items.filter((_, k) => checked[k]).map((it) => it.value));
      } else if (openWithTab ? key.tab : key.return) {
        return onSelect?.(items[i]!.value);
      }
    },
  });

  return (
    <Box flexDirection="column">
      {heading ? (
        <Text bold color="cyan">
          {heading}
        </Text>
      ) : null}
      <Box marginTop={heading ? 1 : 0}>
        <CardGrid
          count={items.length}
          columns={cols}
          render={(i) => {
            const it = items[i]!;
            const color = it.color ?? (multi && checked[i] ? "green" : UI.border);
            return (
              <Widget focused={cur === i} width={CARD_WIDTH} minHeight={minHeight} color={color}>
                <Box>
                  {multi ? <Text color={checked[i] ? "greenBright" : UI.muted}>{checked[i] ? "✓ " : "○ "}</Text> : null}
                  <Text bold wrap="truncate">{it.label}</Text>
                  {it.badge ? <Text color="yellow">{` ${it.badge}`}</Text> : null}
                </Box>
                {it.description ? (
                  <Text color={UI.muted} wrap="truncate">
                    {it.description}
                  </Text>
                ) : null}
              </Widget>
            );
          }}
        />
      </Box>
      <BottomHint
        hint={multi ? [t("Space toggle"), t("↵ apply")] : openWithTab ? [t("⇥ open")] : [t("↵ select")]}
        nav={t("↑↓←→/wasd navigate · q/Esc back")}
      />
    </Box>
  );
}
