/** Persistent interactive TUI exposing every command. One render, stack-routed screens. */

import React, { useState } from "react";
import { existsSync, readFileSync } from "node:fs";
import { Box, render, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { Banner } from "./Banner.tsx";
import { Select, type SelectItem } from "./Select.tsx";
import { MultiSelect } from "./MultiSelect.tsx";
import { StatusDashboard } from "./StatusDashboard.tsx";
import { TrafficPanel, type ActiveServer } from "./TrafficPanel.tsx";
import { TextInput } from "./TextInput.tsx";
import { ServerCards } from "./ServerCards.tsx";
import { AddRuleWizard } from "./AddRuleWizard.tsx";
import { paths } from "../core/paths.ts";
import type { RouteTarget } from "../core/types.ts";
import { isRunning } from "../core/xray.ts";
import {
  addFromLink,
  getActive,
  getActiveProfile,
  getServer,
  listServers,
  removeServer,
  renameServer,
  setActive,
} from "../core/servers.ts";
import { addRule, readList, removeRule } from "../core/routes.ts";
import { listPresets, setEnabled } from "../core/presets.ts";
import { parseVless } from "../core/vless.ts";
import { reapplyAsync, turnOffAsync, turnOnAsync } from "../core/lifecycle.ts";
import { getLang, setLang, t, type Lang } from "../core/i18n.ts";
import { flagEmoji } from "./format.ts";

type Screen =
  | { t: "menu" }
  | { t: "status" }
  | { t: "servers" }
  | { t: "serverDetail"; name: string }
  | { t: "renameServer"; name: string }
  | { t: "addServer" }
  | { t: "routing" }
  | { t: "presets" }
  | { t: "routeList"; target: RouteTarget }
  | { t: "addRule"; target: RouteTarget }
  | { t: "language" }
  | { t: "logs" };

/** Big power toggle — focusable on/off button (and status indicator). */
function PowerToggle({ on, focused = false }: { on: boolean; focused?: boolean }): React.JSX.Element {
  const color = on ? "green" : "red";
  const track = on ? "━━━━━━●" : "●━━━━━━";
  return (
    <Box alignItems="center">
      <Text color="cyan" bold>
        {focused ? "❯ " : "  "}
      </Text>
      <Box
        borderStyle={focused ? "double" : "round"}
        borderColor={focused ? (on ? "greenBright" : "redBright") : color}
        paddingX={2}
      >
        <Text color={color} bold>
          ⏻{"  "}VPN{"  "}
        </Text>
        <Text backgroundColor={color} color="black" bold>
          {on ? " ON " : " OFF "}
        </Text>
        <Text color={color}>
          {"  ["}
          <Text color={on ? "green" : "gray"}>{track}</Text>]
        </Text>
        {focused ? (
          <Text color="cyanBright" bold>
            {"   ↵ "}
            {on ? t("disconnect") : t("connect")}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

interface MenuRow {
  v: string;
  label: string;
  hint?: string;
}

/** Menu where row 0 is the big focusable power button; rest are normal rows. */
function MainMenu({
  running,
  activeName,
  server,
  onSelect,
}: {
  running: boolean;
  activeName?: string;
  server?: ActiveServer;
  onSelect: (value: string) => void;
}): React.JSX.Element {
  const langRow: MenuRow = { v: "lang", label: `${t("Language")}: ${getLang().toUpperCase()}` };
  const rows: MenuRow[] = running
    ? [
        { v: "status", label: t("Status") },
        { v: "servers", label: t("Servers…"), hint: activeName ? t("active: {name}", { name: activeName }) : t("none") },
        { v: "routing", label: t("Routing…") },
        { v: "logs", label: t("Logs") },
        langRow,
        { v: "quit", label: t("Quit") },
      ]
    : [langRow, { v: "quit", label: t("Quit") }];

  // index 0 == the power toggle, then the rows above.
  const count = rows.length + 1;
  const [i, setI] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") setI((x) => (x - 1 + count) % count);
    else if (key.downArrow || input === "j") setI((x) => (x + 1) % count);
    else if (key.return || input === " ") onSelect(i === 0 ? "toggle" : rows[i - 1]!.v);
    else if (key.escape || input === "q") onSelect("quit");
  });

  return (
    <Box flexDirection="column">
      <PowerToggle on={running} focused={i === 0} />
      {running && server ? (
        <Box marginTop={1}>
          <TrafficPanel server={server} />
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        {rows.map((r, idx) => {
          const active = i === idx + 1;
          return (
            <Box key={r.v}>
              <Text color={active ? "cyan" : "gray"}>{active ? "❯ " : "  "}</Text>
              <Text bold={active}>{r.label}</Text>
              {r.hint ? <Text color="gray">{`  ${r.hint}`}</Text> : null}
            </Box>
          );
        })}
      </Box>
      <Text color="gray">  {t("↑/↓ move · Enter select · q quit")}</Text>
    </Box>
  );
}

/** Catches Esc/q to go back, for read-only screens without their own input. */
function BackCatcher({ onBack }: { onBack: () => void }): React.JSX.Element {
  useInput((input, key) => {
    if (key.escape || input === "q") onBack();
  });
  return <Text color="gray">  {t("Esc back")}</Text>;
}

function tailLog(n = 40): string[] {
  if (!existsSync(paths.log)) return [];
  return readFileSync(paths.log, "utf8").split("\n").filter(Boolean).slice(-n);
}

/** Two-step add: paste vless:// link, then name it. */
function AddServerFlow({ onDone, onCancel }: { onDone: (link: string, name: string) => void; onCancel: () => void }): React.JSX.Element {
  const [link, setLink] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState("server");
  const [error, setError] = useState<string | null>(null);

  if (link === null) {
    return (
      <Box flexDirection="column">
        <Text bold color="green">
          {t("➕ Add server — paste a vless:// link")}
        </Text>
        {error ? <Text color="red">✖ {error}</Text> : null}
        <TextInput
          placeholder="vless://uuid@host:port?...#name"
          onCancel={onCancel}
          onSubmit={(v) => {
            try {
              const p = parseVless(v);
              setDefaultName(p.name);
              setError(null);
              setLink(v);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        {t("Name this server")}
      </Text>
      <TextInput
        initialValue={defaultName}
        placeholder="my-server"
        onCancel={onCancel}
        onSubmit={(name) => onDone(link, name || defaultName)}
      />
    </Box>
  );
}

function App(): React.JSX.Element {
  const { exit } = useApp();
  const [stack, setStack] = useState<Screen[]>([{ t: "menu" }]);
  const [running, setRunning] = useState<boolean>(() => isRunning());
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, bumpLang] = useState(0); // re-render the whole tree when language changes

  const cur = stack[stack.length - 1]!;
  const push = (s: Screen) => setStack((st) => [...st, s]);
  const pop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));

  // A key unique per screen instance, so React remounts (and resets index/input
  // state of Select/TextInput) on every screen change instead of reusing it.
  const screenKey = (s: Screen): string =>
    s.t === "routeList" || s.t === "addRule"
      ? `${s.t}:${s.target}`
      : s.t === "serverDetail" || s.t === "renameServer"
        ? `${s.t}:${s.name}`
        : s.t;

  async function run(label: string, fn: () => Promise<string | null>, then?: () => void): Promise<void> {
    setFlash(null);
    setBusy(label);
    const err = await fn();
    setBusy(null);
    setRunning(isRunning());
    setFlash(err);
    then?.();
  }

  const activeServer = (): { name: string; host: string; port: number } | undefined => {
    const p = getActiveProfile();
    return p ? { name: p.name, host: p.address, port: p.port } : undefined;
  };

  // --- screen renderers ----------------------------------------------------

  function onMenuSelect(v: string): void {
    if (v === "lang") return push({ t: "language" });
    if (v === "toggle")
      return running
        ? void run(t("stopping…"), async () => (await turnOffAsync(), null))
        : void run(t("starting…"), async () => (await turnOnAsync()).error ?? null);
    if (v === "status") return push({ t: "status" });
    if (v === "servers") return push({ t: "servers" });
    if (v === "routing") return push({ t: "routing" });
    if (v === "logs") return push({ t: "logs" });
    if (v === "quit") return exit();
  }

  function menuScreen(): React.JSX.Element {
    return <MainMenu running={running} activeName={getActive()} server={activeServer()} onSelect={onMenuSelect} />;
  }

  function serversScreen(): React.JSX.Element {
    return (
      <ServerCards
        servers={listServers()}
        activeName={getActive()}
        onCancel={pop}
        onSelect={(v) => (v === "__add" ? push({ t: "addServer" }) : push({ t: "serverDetail", name: v }))}
      />
    );
  }

  function serverDetailScreen(name: string): React.JSX.Element {
    const s = getServer(name);
    if (!s) return <Text color="red">Unknown server</Text>;
    const isActive = getActive() === name;
    const rows: Array<[string, string]> = [
      [t("address"), `${s.address}:${s.port}`],
      [t("security"), `${s.security}/${s.network}`],
      ["uuid", s.id],
      ["sni", s.sni ?? "—"],
    ];
    const items: SelectItem<string>[] = [
      ...(isActive ? [] : [{ label: t("Set active"), value: "use" } as SelectItem<string>]),
      { label: t("Rename"), value: "rename" },
      { label: t("Remove"), value: "remove" },
      { label: t("Back"), value: "back" },
    ];
    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <Text bold color="green">
            {s.name} {isActive ? <Text color="yellow">{t("★ active")}</Text> : null}
          </Text>
          {rows.map(([k, v], i) => (
            <Box key={i}>
              <Box width={10}>
                <Text color="gray">{k}</Text>
              </Box>
              <Text>{v}</Text>
            </Box>
          ))}
        </Box>
        <Select
          items={items}
          onCancel={pop}
          onSelect={(v) => {
            if (v === "back") return pop();
            if (v === "rename") return push({ t: "renameServer", name });
            if (v === "use") return void run(t("activating {name}…", { name }), async () => {
              setActive(name);
              return (await reapplyAsync()).error ?? null;
            }, pop);
            if (v === "remove") return void run(t("removing {name}…", { name }), async () => {
              removeServer(name);
              return (await reapplyAsync()).error ?? null;
            }, pop);
          }}
        />
      </Box>
    );
  }

  function routingScreen(): React.JSX.Element {
    const items: SelectItem<string>[] = [
      { label: t("Presets…"), value: "presets", hint: t("toggle rule bundles") },
      { label: t("Direct list"), value: "direct", hint: t("bypass the VPN") },
      { label: t("Proxy list"), value: "proxy", hint: t("force through VPN") },
      { label: t("Block list"), value: "block", hint: t("drop traffic") },
      { label: t("Back"), value: "back" },
    ];
    return (
      <Select
        heading={t("Routing")}
        items={items}
        onCancel={pop}
        onSelect={(v) => {
          if (v === "back") return pop();
          if (v === "presets") return push({ t: "presets" });
          return push({ t: "routeList", target: v as RouteTarget });
        }}
      />
    );
  }

  function presetsScreen(): React.JSX.Element {
    return (
      <MultiSelect
        heading={t("Toggle routing presets")}
        labelWidth={22}
        items={listPresets().map((p) => ({ label: t(p.title), value: p.name, hint: t(p.description), selected: p.enabled }))}
        onCancel={pop}
        onConfirm={(names) =>
          void run(t("applying presets…"), async () => {
            setEnabled(names);
            return (await reapplyAsync()).error ?? null;
          }, pop)
        }
      />
    );
  }

  function routeListScreen(target: RouteTarget): React.JSX.Element {
    const rules = readList(target);
    const items: SelectItem<string>[] = [
      { label: t("➕ Add rule"), value: "__add" },
      ...rules.map((r) => ({ label: r, value: r, hint: t("Enter removes") })),
    ];
    return (
      <Select
        heading={t("{target} list", { target })}
        items={items}
        onCancel={pop}
        onSelect={(v) => {
          if (v === "__add") return push({ t: "addRule", target });
          return void run(t("removing {rule}…", { rule: v }), async () => {
            removeRule(target, v);
            return (await reapplyAsync()).error ?? null;
          });
        }}
      />
    );
  }

  function addRuleScreen(target: RouteTarget): React.JSX.Element {
    return (
      <AddRuleWizard
        target={target}
        onCancel={pop}
        onAdd={(rule) =>
          void run(t("adding {rule}…", { rule }), async () => {
            addRule(target, rule);
            return (await reapplyAsync()).error ?? null;
          }, pop)
        }
      />
    );
  }

  function renameScreen(name: string): React.JSX.Element {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          {t("Rename “{name}”", { name })}
        </Text>
        <TextInput
          initialValue={name}
          placeholder={t("new name")}
          onCancel={pop}
          onSubmit={(newName) => {
            if (!newName || newName === name) return pop();
            void run(t("renaming…"), async () => {
              try {
                renameServer(name, newName);
              } catch (e) {
                return (e as Error).message;
              }
              return null;
            }, pop);
          }}
        />
      </Box>
    );
  }

  function languageScreen(): React.JSX.Element {
    const cur = getLang();
    const items: SelectItem<Lang>[] = [
      { label: `${flagEmoji("GB")} English`, value: "en", badge: cur === "en" ? "✓" : undefined },
      { label: `${flagEmoji("RU")} Русский`, value: "ru", badge: cur === "ru" ? "✓" : undefined },
    ];
    return (
      <Select
        heading={t("Select language")}
        items={items}
        onCancel={pop}
        onSelect={(lang) => {
          setLang(lang);
          bumpLang((x) => x + 1);
          pop();
        }}
      />
    );
  }

  function logsScreen(): React.JSX.Element {
    const lines = tailLog(40);
    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text bold>{t("xray log (last {n})", { n: lines.length })}</Text>
          {lines.length === 0 ? (
            <Text color="gray">{t("empty")}</Text>
          ) : (
            lines.map((l, i) => (
              <Text key={i} color="gray">
                {l}
              </Text>
            ))
          )}
        </Box>
        <BackCatcher onBack={pop} />
      </Box>
    );
  }

  function content(): React.JSX.Element {
    if (busy)
      return (
        <Text color="cyan">
          <Spinner type="dots" /> {busy}
        </Text>
      );
    switch (cur.t) {
      case "menu":
        return menuScreen();
      case "status":
        return (
          <Box flexDirection="column">
            <StatusDashboard />
            <BackCatcher onBack={pop} />
          </Box>
        );
      case "servers":
        return serversScreen();
      case "serverDetail":
        return serverDetailScreen(cur.name);
      case "renameServer":
        return renameScreen(cur.name);
      case "addServer":
        return (
          <AddServerFlow
            onCancel={pop}
            onDone={(link, name) =>
              void run(t("adding server…"), async () => {
                try {
                  addFromLink(link, name);
                } catch (e) {
                  return (e as Error).message;
                }
                return (await reapplyAsync()).error ?? null;
              }, pop)
            }
          />
        );
      case "routing":
        return routingScreen();
      case "presets":
        return presetsScreen();
      case "routeList":
        return routeListScreen(cur.target);
      case "addRule":
        return addRuleScreen(cur.target);
      case "language":
        return languageScreen();
      case "logs":
        return logsScreen();
    }
  }

  return (
    <Box flexDirection="column">
      <Banner subtitle={t("xray VPN manager")} />
      {flash ? (
        <Box marginTop={1}>
          <Text color="red">✖ {flash}</Text>
        </Box>
      ) : null}
      <Box key={busy ? "busy" : screenKey(cur)} marginTop={1} flexDirection="column">
        {content()}
      </Box>
    </Box>
  );
}

/** Mount the interactive app and resolve when the user quits. */
export async function runApp(): Promise<void> {
  const instance = render(<App />, { exitOnCtrlC: true });
  await instance.waitUntilExit();
}
