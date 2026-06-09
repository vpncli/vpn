/** Persistent interactive TUI exposing every command. One render, stack-routed screens. */

import React, { useEffect, useState } from "react";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Box, render, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { Banner } from "./Banner.tsx";
import { CardSelect, type CardOption } from "./CardSelect.tsx";
import { StatusDashboard } from "./StatusDashboard.tsx";
import { RouteTargets, RouteRules, PresetCards } from "./RoutingCards.tsx";
import { XrayPanel } from "./XrayPanel.tsx";
import { ServiceRow } from "./ServiceRow.tsx";
import { Button } from "./Button.tsx";
import { BottomHint } from "./Hint.tsx";
import { CardGrid } from "./CardGrid.tsx";
import { CARD_WIDTH, CARD_HEIGHT, useTerminalWidth, columnsFor, gridRows, moveSel, arrowDir } from "./grid.ts";
import {
  type Service,
  type ServiceGroup,
  type Creds,
  listServices,
  groupServices,
  groupRepresentative,
  connectService,
  connectExclusive,
  disconnectService,
  disconnectAll,
  switchXray,
} from "../core/services.ts";
import { TextInput } from "./TextInput.tsx";
import { ServerCards } from "./ServerCards.tsx";
import { AddRuleWizard } from "./AddRuleWizard.tsx";
import { paths } from "../core/paths.ts";
import type { RouteTarget } from "../core/types.ts";
import { isRunning } from "../core/xray.ts";
import {
  addFromLink,
  getActive,
  getServer,
  listServers,
  removeServer,
  renameServer,
  setActive,
} from "../core/servers.ts";
import { addRule, removeRule } from "../core/routes.ts";
import { getEnabled, setEnabled } from "../core/presets.ts";
import { parseVless } from "../core/vless.ts";
import { reapplyAsync } from "../core/lifecycle.ts";
import { getLang, setLang, t, type Lang } from "../core/i18n.ts";
import { flagEmoji } from "./format.ts";

type Screen =
  | { t: "menu" }
  | { t: "settings" }
  | { t: "xrayPanel" }
  | { t: "cpConnect"; service: Service }
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

/** Class chip + explanation for a service group (tunnel vs proxy). */
function classBadge(g: ServiceGroup): { badge: { text: string; color: string }; subtitle: string } {
  return g.fullTunnel
    ? { badge: { text: `${g.type} · ${t("🌐 ALL TRAFFIC")}`, color: "yellow" }, subtitle: t("tunnel · captures all OS traffic") }
    : { badge: { text: `${g.type} · ${t("⚡ BY RULES")}`, color: "cyan" }, subtitle: t("proxy · splits traffic by rules") };
}

/**
 * Global power button. Up → disconnect all; off with an xray server → enable it;
 * off with no servers configured → add one (so a fresh install can start here).
 */
function PowerButton({ anyUp, xrayName, focused }: { anyUp: boolean; xrayName?: string; focused: boolean }): React.JSX.Element {
  if (anyUp) return <Button symbol="⏻" label={t("Disconnect all")} color="red" focusColor="redBright" focused={focused} />;
  if (!xrayName) return <Button symbol="+" label={t("Add xray server")} color="green" focusColor="greenBright" focused={focused} />;
  return <Button symbol="⏻" label={t("Enable {name}", { name: xrayName })} color="green" focusColor="greenBright" focused={focused} />;
}

/**
 * Connection-manager dashboard. Two levels: arrows move between global service
 * cards (one per type); Tab dives into a card's members (xray servers).
 * Enter toggles the whole service. A global power button disconnects everything.
 */
function ServicesView({
  onPower,
  onGroup,
  onInner,
  onOpenXray,
  onFooter,
}: {
  onPower: () => void;
  onGroup: (g: ServiceGroup) => void;
  onInner: (s: Service) => void;
  onOpenXray: () => void;
  onFooter: (v: string) => void;
}): React.JSX.Element {
  const [services, setServices] = useState<Service[]>(() => listServices());
  useEffect(() => {
    const id = setInterval(() => setServices(listServices()), 2000);
    return () => clearInterval(id);
  }, []);

  const width = useTerminalWidth();
  const columns = columnsFor(width);

  const groups = groupServices(services);
  const anyUp = services.some((s) => s.status === "up");

  // sel = flat focusable index over [power(0), card grid…, settings]. dived = the
  // group we've entered to pick a member (e.g. Happ Plus / Happ). Quit is keys-only
  // (q / Esc) — no button.
  const [sel, setSel] = useState(0);
  const [dived, setDived] = useState<string | null>(null);
  const [innerSel, setInnerSel] = useState(0);

  const settingsIdx = 1 + groups.length;
  const rows = gridRows(1, groups.length, 1, columns);
  const total = 1 + groups.length + 1;
  const clampedSel = Math.min(sel, total - 1);

  const divedGroup = dived ? groups.find((g) => g.type === dived) ?? null : null;

  useInput((input, key) => {
    // --- inner level: navigating a dived group's member grid ---
    if (divedGroup) {
      const drows = gridRows(0, divedGroup.items.length, 0, columns);
      const d = arrowDir(input, key);
      if (key.escape || key.tab || input === "q") setDived(null);
      else if (key.return) {
        onInner(divedGroup.items[Math.min(innerSel, divedGroup.items.length - 1)]!);
        setDived(null);
      } else if (d) setInnerSel((x) => moveSel(drows, Math.min(x, divedGroup.items.length - 1), d));
      return;
    }

    // --- top level: grid of cards + power + settings ---
    // Tab opens/dives: settings screen, the xray panel, or a multi-member group.
    if (key.tab) {
      if (clampedSel === settingsIdx) return onFooter("settings");
      const gi = clampedSel - 1;
      const g = gi >= 0 && gi < groups.length ? groups[gi]! : undefined;
      if (g?.type === "xray") onOpenXray();
      else if (g && g.items.length > 1) {
        setDived(g.type);
        setInnerSel(0);
      }
    } else if (arrowDir(input, key)) setSel((x) => moveSel(rows, Math.min(x, total - 1), arrowDir(input, key)!));
    else if (key.return) {
      // Enter = final actions only (power / toggle a service); settings opens with Tab.
      if (clampedSel === 0) onPower();
      else if (clampedSel <= groups.length) onGroup(groups[clampedSel - 1]!);
    } else if (key.escape || input === "q") onFooter("quit");
  });

  // Contextual hint parts for the focused cell (cyan line at the bottom, above
  // the gray navigation hint). The Hint component joins them with " · ".
  const cardHintParts = (g: ServiceGroup): string[] => {
    const enter = g.items.some((s) => s.status === "up") ? t("↵ disconnect") : t("↵ connect");
    if (g.type === "xray") return [enter, t("⇥ servers & routes")];
    return g.items.length > 1 ? [enter, t("⇥ servers")] : [enter];
  };
  const xrayGroup = groups.find((g) => g.type === "xray");
  const xrayName = xrayGroup ? groupRepresentative(xrayGroup).name : undefined;
  const actionParts =
    clampedSel === 0
      ? [anyUp ? t("↵ disconnect everything") : xrayName ? t("↵ enable {name}", { name: xrayName }) : t("↵ add xray server")]
      : clampedSel <= groups.length
        ? cardHintParts(groups[clampedSel - 1]!)
        : [t("⇥ settings")];

  // Dived view: full-width vertical list of the group's members.
  if (divedGroup) {
    const cb = classBadge(divedGroup);
    const ds = Math.min(innerSel, divedGroup.items.length - 1);
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">{`❮ ${divedGroup.type}`}</Text>
        <Box marginTop={1}>
          <CardGrid
            count={divedGroup.items.length}
            columns={columns}
            render={(k) => (
              <ServiceRow service={divedGroup.items[k]!} focused={k === ds} width={CARD_WIDTH} minHeight={CARD_HEIGHT} badge={cb.badge} />
            )}
          />
        </Box>
        <BottomHint nav={t("↑↓←→/wasd pick · Enter switch · q/Esc back")} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <PowerButton anyUp={anyUp} xrayName={xrayName} focused={clampedSel === 0} />
      {groups.length === 0 ? (
        <Text color="gray">{`  ${t("No VPN services detected.")}`}</Text>
      ) : (
        <Box marginTop={1}>
          <CardGrid
            count={groups.length}
            columns={columns}
            render={(gi) => {
              const cb = classBadge(groups[gi]!);
              return (
                <ServiceRow
                  service={groupRepresentative(groups[gi]!)}
                  focused={clampedSel === gi + 1}
                  width={CARD_WIDTH}
                  minHeight={CARD_HEIGHT}
                  badge={cb.badge}
                  subtitle={cb.subtitle}
                />
              );
            }}
          />
        </Box>
      )}
      <Box marginTop={1}>
        <Button symbol="⚙" label={t("Settings")} color="blue" focusColor="blueBright" focused={clampedSel === settingsIdx} keyHint="⇥" />
      </Box>
      <BottomHint hint={actionParts} nav={t("↑↓←→/wasd navigate · q/Esc quit")} />
    </Box>
  );
}

/** Catches Esc/q to go back, for read-only screens without their own input. */
function BackCatcher({ onBack }: { onBack: () => void }): React.JSX.Element {
  useInput((input, key) => {
    if (key.escape || input === "q") onBack();
  });
  return <Text color="gray">  {t("q/Esc back")}</Text>;
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
      <TextInput
        key="add-link"
        label={t("+ Add server — paste a vless:// link")}
        error={error}
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
    );
  }

  return (
    <TextInput
      key="add-name"
      label={t("Name this server")}
      initialValue={defaultName}
      placeholder="my-server"
      onCancel={onCancel}
      onSubmit={(name) => onDone(link, name || defaultName)}
    />
  );
}

/** Check Point connect: collect username → password → OTP, then hand back creds. */
function CheckpointConnectForm({
  service,
  onSubmit,
  onCancel,
}: {
  service: Service;
  onSubmit: (creds: Creds) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [step, setStep] = useState<"user" | "password" | "otp">("user");
  const [user, setUser] = useState(service.user ?? "");
  const [password, setPassword] = useState("");

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        {t("🔐 Connect {name}", { name: service.name })}
      </Text>
      <Text color="gray">{t("Sign in with your corporate credentials and OTP.")}</Text>
      <Box marginTop={1}>
        {step === "user" ? (
          <TextInput
            key="cp-user"
            label={t("Username")}
            initialValue={user}
            placeholder="user"
            onCancel={onCancel}
            onSubmit={(v) => {
              setUser(v);
              setStep("password");
            }}
          />
        ) : step === "password" ? (
          <TextInput
            key="cp-password"
            label={t("Password")}
            mask
            placeholder={t("your password")}
            onCancel={onCancel}
            onSubmit={(v) => {
              setPassword(v);
              setStep("otp");
            }}
          />
        ) : (
          <TextInput
            key="cp-otp"
            label={t("One-time code (OTP)")}
            placeholder={t("6-digit code")}
            onCancel={onCancel}
            onSubmit={(otp) => onSubmit({ user: user || undefined, password, otp: otp || undefined })}
          />
        )}
      </Box>
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
    let err: string | null = null;
    try {
      err = await fn();
    } catch (e) {
      // e.g. requireXray() throwing "xray binary not found…" — show it, don't crash.
      err = (e as Error).message;
    }
    setBusy(null);
    setRunning(isRunning());
    setFlash(err);
    then?.();
  }

  // --- screen renderers ----------------------------------------------------

  /** Footer actions of the services dashboard. */
  function onFooter(v: string): void {
    if (v === "settings") return push({ t: "settings" });
    if (v === "quit") return exit();
  }

  /** Global power button: disconnect everything if anything is up, else turn on the active xray server. */
  function onPower(): void {
    const services = listServices();
    if (services.some((s) => s.status === "up")) {
      return void run(t("disconnecting all…"), async () => (await disconnectAll(), null));
    }
    const xray = services.find((s) => s.kind === "xray" && s.active) ?? services.find((s) => s.kind === "xray");
    if (xray) return void run(t("connecting {name}…", { name: xray.name }), async () => connectService(xray));
    // No xray server configured yet → let the user add one straight from the UI.
    push({ t: "addServer" });
  }

  /** Enter on a group card: toggle the whole service. */
  function onGroup(g: ServiceGroup): void {
    const up = g.items.find((s) => s.status === "up");
    if (up) return void run(t("disconnecting {name}…", { name: up.name }), async () => disconnectService(up));

    const rep = groupRepresentative(g);
    // Check Point needs interactive credentials (exclusive connect after the form).
    if (rep.kind === "checkpoint") return push({ t: "cpConnect", service: rep });
    // Full tunnels claim the single default route → disconnect everything else first.
    if (g.fullTunnel) return void run(t("connecting {name}…", { name: rep.name }), async () => connectExclusive(rep));
    // xray is a proxy → additive, coexists with any tunnel.
    return void run(t("connecting {name}…", { name: rep.name }), async () => connectService(rep));
  }

  /** Enter on a member inside a dived card (xray servers): switch / toggle it. */
  function onInner(s: Service): void {
    if (s.status === "up" && s.active) {
      return void run(t("disconnecting {name}…", { name: s.name }), async () => disconnectService(s));
    }
    return void run(t("connecting {name}…", { name: s.name }), async () => connectService(s));
  }

  function menuScreen(): React.JSX.Element {
    return (
      <ServicesView
        onPower={onPower}
        onGroup={onGroup}
        onInner={onInner}
        onOpenXray={() => push({ t: "xrayPanel" })}
        onFooter={onFooter}
      />
    );
  }

  /** Settings: logs + language (everything else moved into the xray panel). */
  function settingsScreen(): React.JSX.Element {
    return (
      <CardSelect
        heading={t("Settings")}
        columns={1}
        openWithTab
        items={[
          { label: t("Logs"), value: "logs" },
          { label: t("Language"), value: "lang", badge: `${flagEmoji(getLang() === "ru" ? "RU" : "GB")} ${getLang().toUpperCase()}` },
        ]}
        onCancel={pop}
        onSelect={(v) => push(v === "logs" ? { t: "logs" } : { t: "language" })}
      />
    );
  }

  /** xray panel (Tab on the xray card): IP header + server/routes widgets. */
  function xrayPanelScreen(): React.JSX.Element {
    return (
      <XrayPanel
        onSwitch={(name) => {
          if (name === getActive()) return;
          void run(t("activating {name}…", { name }), async () => switchXray(name));
        }}
        onEditServer={(name) => push({ t: "serverDetail", name })}
        onAddServer={() => push({ t: "addServer" })}
        onOpenRoutes={() => push({ t: "routing" })}
        onBack={pop}
      />
    );
  }

  function cpConnectScreen(s: Service): React.JSX.Element {
    return (
      <CheckpointConnectForm
        service={s}
        onCancel={pop}
        onSubmit={(creds) =>
          void run(t("connecting {name}…", { name: s.name }), async () => connectExclusive(s, creds), pop)
        }
      />
    );
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
    const items: CardOption<string>[] = [
      ...(isActive ? [] : [{ label: t("Set active"), value: "use", color: "green" } as CardOption<string>]),
      { label: t("Rename"), value: "rename" },
      { label: t("Remove"), value: "remove", color: "red" },
    ];
    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} marginBottom={1}>
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
        <CardSelect
          items={items}
          columns={1}
          onCancel={pop}
          onSelect={(v) => {
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
    return (
      <RouteTargets
        onBack={pop}
        onOpen={(key) => (key === "presets" ? push({ t: "presets" }) : push({ t: "routeList", target: key as RouteTarget }))}
      />
    );
  }

  function presetsScreen(): React.JSX.Element {
    return (
      <PresetCards
        onBack={pop}
        onToggle={(name, enable) =>
          void run(t("applying presets…"), async () => {
            const next = enable ? [...getEnabled(), name] : getEnabled().filter((n) => n !== name);
            setEnabled(next);
            return (await reapplyAsync()).error ?? null;
          })
        }
      />
    );
  }

  function routeListScreen(target: RouteTarget): React.JSX.Element {
    return (
      <RouteRules
        target={target}
        onBack={pop}
        onAdd={() => push({ t: "addRule", target })}
        onRemove={(rule) =>
          void run(t("removing {rule}…", { rule }), async () => {
            removeRule(target, rule);
            return (await reapplyAsync()).error ?? null;
          })
        }
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
      <TextInput
        label={t("Rename “{name}”", { name })}
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
    );
  }

  function languageScreen(): React.JSX.Element {
    const cur = getLang();
    const items: CardOption<Lang>[] = [
      { label: `${flagEmoji("GB")} English`, value: "en", badge: cur === "en" ? "✓" : undefined, color: cur === "en" ? "green" : undefined },
      { label: `${flagEmoji("RU")} Русский`, value: "ru", badge: cur === "ru" ? "✓" : undefined, color: cur === "ru" ? "green" : undefined },
    ];
    return (
      <CardSelect
        heading={t("Select language")}
        columns={1}
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
      case "settings":
        return settingsScreen();
      case "xrayPanel":
        return xrayPanelScreen();
      case "cpConnect":
        return cpConnectScreen(cur.service);
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
      <Banner />
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

/** Best-effort resize the terminal window to cols×rows at startup. */
function resizeWindow(cols: number, rows: number): void {
  if (!process.stdout.isTTY) return;
  const prog = process.env.TERM_PROGRAM;
  const osa = (...lines: string[]) =>
    spawnSync("osascript", lines.flatMap((l) => ["-e", l]), { stdio: "ignore", timeout: 3000 });
  try {
    // iTerm2 ignores the xterm resize escape by default, but its AppleScript
    // session exposes settable columns/rows.
    if (process.platform === "darwin" && prog === "iTerm.app") {
      osa(
        'tell application "iTerm2"',
        "tell current session of current window",
        `set columns to ${cols}`,
        `set rows to ${rows}`,
        "end tell",
        "end tell",
      );
      return;
    }
    if (process.platform === "darwin" && prog === "Apple_Terminal") {
      osa(`tell application "Terminal" to set {number of columns, number of rows} of front window to {${cols}, ${rows}}`);
      return;
    }
  } catch {
    // fall through to the escape sequence
  }
  // Other terminals: the xterm window-resize op `CSI 8 ; rows ; cols t`.
  process.stdout.write(`\x1b[8;${rows};${cols}t`);
}

/** Mount the interactive app and resolve when the user quits. */
export async function runApp(): Promise<void> {
  resizeWindow(100, 55);
  const instance = render(<App />, { exitOnCtrlC: true });
  await instance.waitUntilExit();
  // Clear the screen + scrollback on exit so the frozen last frame doesn't linger.
  if (process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}
