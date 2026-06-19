/** Card-based routing editor: target cards → rule cards (+ add), and preset toggles. */

import React from "react";
import { Box, Text } from "ink";
import { listPresets } from "../core/presets.ts";
import { readList } from "../core/routes.ts";
import type { RouteTarget } from "../core/types.ts";
import { Widget } from "./Widget.tsx";
import { Button } from "./Button.tsx";
import { CardGrid } from "./CardGrid.tsx";
import { BottomHint } from "./Hint.tsx";
import { CARD_WIDTH, useCardNav } from "./grid.ts";
import { UI } from "./theme.ts";
import { t } from "../core/i18n.ts";

const NAV = "↑↓←→/wasd navigate · q/Esc back";
const TARGET_COLOR: Record<string, string> = { presets: "cyan", direct: "blueBright", proxy: "greenBright", block: "red" };

// --- 1) Targets overview: Presets / Direct / Proxy / Block as cards ----------

const TARGETS: Array<{ key: string; title: string }> = [
  { key: "presets", title: "Presets" },
  { key: "direct", title: "Direct" },
  { key: "proxy", title: "Proxy" },
  { key: "block", title: "Block" },
];

function targetSummary(key: string): { count: number; items: string[] } {
  if (key === "presets") {
    const en = listPresets().filter((p) => p.enabled);
    return { count: en.length, items: en.map((p) => `✓ ${t(p.title)}`) };
  }
  const rules = readList(key as RouteTarget);
  return { count: rules.length, items: rules };
}

export function RouteTargets({ onOpen, onBack }: { onOpen: (key: string) => void; onBack: () => void }): React.JSX.Element {
  const { cur, columns } = useCardNav(TARGETS.length, {
    onKey: (input, key, i) => {
      if (key.escape || input === "q") return onBack();
      if (key.tab) return onOpen(TARGETS[i]!.key);
    },
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{`❮ ${t("Manage routing")}`}</Text>
      <Box marginTop={1}>
        <CardGrid
          count={TARGETS.length}
          columns={columns}
          render={(i) => {
            const ti = TARGETS[i]!;
            const color = TARGET_COLOR[ti.key]!;
            const { count, items } = targetSummary(ti.key);
            return (
              <Widget focused={cur === i} width={CARD_WIDTH} minHeight={7} color={color}>
                <Text bold color={color}>{`${ti.title} (${count})`}</Text>
                {count === 0 ? (
                  <Text color={UI.muted}>—</Text>
                ) : (
                  items.slice(0, 3).map((r, k) => (
                    <Text key={k} color={UI.muted} wrap="truncate">{`  ${r}`}</Text>
                  ))
                )}
                {count > 3 ? <Text color={UI.muted}>{`  …+${count - 3}`}</Text> : null}
              </Widget>
            );
          }}
        />
      </Box>
      <BottomHint hint={[t("⇥ open")]} nav={t(NAV)} />
    </Box>
  );
}

// --- 2) Rules of one target: each rule a card + an Add button ----------------

export function RouteRules({
  target,
  onAdd,
  onRemove,
  onBack,
}: {
  target: RouteTarget;
  onAdd: () => void;
  onRemove: (rule: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const rules = readList(target);
  const addIdx = rules.length;
  const color = TARGET_COLOR[target]!;
  const { cur, columns } = useCardNav(rules.length, {
    trailing: 1,
    onKey: (input, key, i) => {
      if (key.escape || input === "q") return onBack();
      // Delete is on Backspace/Delete so Enter can't wipe a rule by accident.
      if ((key.backspace || key.delete) && i < rules.length) return onRemove(rules[i]!);
      if (key.return && i === addIdx) return onAdd();
    },
  });

  const hint = cur === addIdx ? [t("↵ add rule")] : [t("⌫ remove")];
  return (
    <Box flexDirection="column">
      <Text bold color={color}>{`❮ ${t(target)} (${rules.length})`}</Text>
      {rules.length > 0 ? (
        <Box marginTop={1}>
          <CardGrid
            count={rules.length}
            columns={columns}
            render={(i) => (
              <Widget focused={cur === i} width={CARD_WIDTH} minHeight={3} color={color}>
                <Text wrap="truncate">{rules[i]}</Text>
              </Widget>
            )}
          />
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color={UI.muted}>{`  ${t("No rules yet.")}`}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Button symbol="+" label={t("Add rule")} color="green" focusColor="greenBright" focused={cur === addIdx} />
      </Box>
      <BottomHint hint={hint} nav={t(NAV)} />
    </Box>
  );
}

// --- 3) Presets as toggle cards ----------------------------------------------

export function PresetCards({
  onToggle,
  onBack,
}: {
  onToggle: (name: string, enable: boolean) => void;
  onBack: () => void;
}): React.JSX.Element {
  const presets = listPresets();
  const { cur, columns } = useCardNav(presets.length, {
    onKey: (input, key, i) => {
      if (key.escape || input === "q") return onBack();
      if (key.return) return onToggle(presets[i]!.name, !presets[i]!.enabled);
    },
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{`❮ ${t("Routing presets")}`}</Text>
      <Box marginTop={1}>
        <CardGrid
          count={presets.length}
          columns={columns}
          render={(i) => {
            const p = presets[i]!;
            return (
              <Widget focused={cur === i} width={CARD_WIDTH} minHeight={4} color={p.enabled ? "green" : UI.border}>
                <Text bold color={p.enabled ? "greenBright" : undefined}>
                  {`${p.enabled ? "✓" : "○"} ${t(p.title)}`}
                </Text>
                <Text color={UI.muted} wrap="truncate">{t(p.description)}</Text>
              </Widget>
            );
          }}
        />
      </Box>
      <BottomHint hint={[t("↵ toggle")]} nav={t(NAV)} />
    </Box>
  );
}
