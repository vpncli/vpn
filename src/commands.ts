/** Non-interactive command handlers. They print colored output and mutate state. */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { c, err, icon, info, ok, warn } from "./ui/theme.ts";
import { paths } from "./core/paths.ts";
import type { RouteTarget } from "./core/types.ts";
import { addFromLink, getActive, getServer, listServers, removeServer, setActive } from "./core/servers.ts";
import { addRule, ensureListFiles, fileFor, readList, removeRule } from "./core/routes.ts";
import { disable, enable, listPresets } from "./core/presets.ts";
import {
  type Service,
  type Creds,
  listServices,
  groupServices,
  connectService,
  connectExclusive,
  disconnectService,
  disconnectAll,
} from "./core/services.ts";
import { addSubscription, updateSubscription, removeSubscription, renameSubscription, listSubscriptions } from "./core/subscriptions.ts";
import { regenerate } from "./core/regen.ts";
import { turnOff, turnOn, restart as restartVpn } from "./core/lifecycle.ts";
import { ensureShellInit } from "./core/shellinit.ts";
import { getRealIp, getVpnIp } from "./core/ip.ts";
import { isRunning } from "./core/xray.ts";
import { VlessParseError } from "./core/vless.ts";
import { t } from "./core/i18n.ts";
import { plainHelp, showHelp } from "./ui/Help.tsx";
import { promptCheckpoint } from "./ui/app.tsx";

/** Regenerate config after a routing/server change; restart xray if it is running. */
export function applyChange(): void {
  try {
    const r = regenerate();
    if (!r.ok) {
      err("Config did not validate — keeping the previous one:");
      console.error(c.gray(r.output));
      return;
    }
    ok("Config regenerated");
    if (isRunning()) {
      const res = restartVpn();
      if (res.ok) ok("xray restarted with new config");
      else err(res.error ?? "restart failed");
    }
  } catch (e) {
    err((e as Error).message);
  }
}

export function cmdAdd(link: string, name?: string): void {
  try {
    const p = addFromLink(link, name);
    ok(`Added server ${c.bold(p.name)} ${c.gray(`(${p.address}:${p.port}, ${p.security})`)}`);
    if (getActive() === p.name) info(`Set as active server`);
    applyChange();
  } catch (e) {
    if (e instanceof VlessParseError) err(`Could not parse link: ${e.message}`);
    else err((e as Error).message);
    process.exitCode = 1;
  }
}

// --- Subscriptions ----------------------------------------------------------

export async function cmdSubAdd(input: string, name?: string): Promise<void> {
  try {
    info("Fetching subscription…");
    const r = await addSubscription(input, name);
    ok(`Subscription ${c.bold(r.name)} — added ${c.bold(String(r.added.length))} server(s)` + (r.skipped ? c.gray(` (skipped ${r.skipped})`) : ""));
    for (const n of r.added) console.log(`    ${c.gray("•")} ${n}`);
    info(`Refresh later: ${c.bold(`vpn sub update ${r.name}`)}`);
    applyChange();
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdSubLs(): void {
  const subs = listSubscriptions();
  if (subs.length === 0) {
    warn("No subscriptions. Add one: " + c.bold("vpn sub add <url>"));
    return;
  }
  console.log(c.bold("\n  Subscriptions"));
  for (const s of subs) {
    console.log(`  ${c.bold(s.name.padEnd(20))} ${c.gray(`${s.servers.length} servers · updated ${s.updatedAt.slice(0, 10)}`)}`);
    console.log(`    ${c.gray(s.url)}`);
  }
  console.log("");
}

export async function cmdSubUpdate(name?: string): Promise<void> {
  try {
    info(name ? `Refreshing ${c.bold(name)}…` : "Refreshing all subscriptions…");
    const results = await updateSubscription(name);
    if (results.length === 0) {
      warn("No subscriptions to update.");
      return;
    }
    for (const r of results) {
      ok(`Updated ${c.bold(r.name)} — ${c.bold(String(r.added.length))} server(s)` + (r.skipped ? c.gray(` (skipped ${r.skipped})`) : ""));
    }
    applyChange();
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdSubRm(name: string): void {
  try {
    const n = removeSubscription(name);
    ok(`Removed subscription ${c.bold(name)} (${n} server${n === 1 ? "" : "s"})`);
    if (getActive()) applyChange();
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdSubRename(oldName: string, newName: string): void {
  try {
    const final = renameSubscription(oldName, newName);
    ok(`Renamed subscription ${c.bold(oldName)} → ${c.bold(final)}`);
    if (getActive()) applyChange();
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdList(): void {
  const servers = listServers();
  const active = getActive();
  if (servers.length === 0) {
    warn("No servers yet. Add one: " + c.bold("vpn add <vless://...>"));
    return;
  }
  console.log(c.bold("\n  Servers"));
  for (const s of servers) {
    const mark = s.name === active ? c.yellow("★") : " ";
    console.log(`  ${mark} ${c.bold(s.name.padEnd(16))} ${c.gray(`${s.address}:${s.port}  ${s.security}/${s.network}`)}`);
  }
  console.log("");
}

export function cmdShow(name?: string): void {
  const target = name ?? getActive();
  if (!target) {
    warn("No active server.");
    return;
  }
  const s = getServer(target);
  if (!s) {
    err(`Unknown server "${target}"`);
    process.exitCode = 1;
    return;
  }
  console.log(c.bold(`\n  ${s.name}`));
  const rows: Array<[string, string | undefined]> = [
    ["address", `${s.address}:${s.port}`],
    ["uuid", s.id],
    ["security", s.security],
    ["network", s.network],
    ["flow", s.flow || "—"],
    ["sni", s.sni],
    ["fingerprint", s.fingerprint],
    ["publicKey", s.publicKey],
    ["shortId", s.shortId],
  ];
  for (const [k, v] of rows) {
    if (v !== undefined) console.log(`  ${c.gray(k.padEnd(12))} ${v}`);
  }
  console.log("");
}

export function cmdUse(name: string): void {
  try {
    setActive(name);
    ok(`Active server: ${c.bold(name)}`);
    applyChange();
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdRemove(name: string): void {
  if (!getServer(name)) {
    err(`Unknown server "${name}"`);
    process.exitCode = 1;
    return;
  }
  removeServer(name);
  ok(`Removed ${c.bold(name)}`);
  if (getActive()) applyChange();
}

export function cmdRouteLs(): void {
  for (const target of ["direct", "proxy", "block"] as RouteTarget[]) {
    const rules = readList(target);
    const color = target === "direct" ? c.green : target === "proxy" ? c.cyan : c.red;
    console.log(color(c.bold(`\n  ${target}`)) + c.gray(`  (${rules.length})`));
    if (rules.length === 0) console.log(c.gray("    —"));
    for (const r of rules) console.log(`    ${r}`);
  }
  console.log("");
}

export function cmdRouteAdd(target: RouteTarget, rule: string): void {
  const added = addRule(target, rule);
  if (added) ok(`Added to ${target}: ${c.bold(rule)}`);
  else warn(`Already in ${target}: ${rule}`);
  applyChange();
}

export function cmdRouteRm(target: RouteTarget, rule: string): void {
  const removed = removeRule(target, rule);
  if (removed) ok(`Removed from ${target}: ${c.bold(rule)}`);
  else warn(`Not found in ${target}: ${rule}`);
  applyChange();
}

export function cmdRouteEdit(): void {
  ensureListFiles();
  const editor = process.env.EDITOR || process.env.VISUAL || "nano";
  for (const target of ["direct", "proxy", "block"] as RouteTarget[]) {
    const res = spawnSync(editor, [fileFor(target)], { stdio: "inherit" });
    if (res.status !== 0) break;
  }
  applyChange();
}

export function cmdPresetLs(): void {
  console.log(c.bold("\n  " + t("Routing presets")));
  for (const p of listPresets()) {
    const mark = p.enabled ? c.green("◉") : c.gray("◯");
    console.log(`  ${mark} ${c.bold(p.name.padEnd(20))} ${c.gray(t(p.description))}`);
  }
  console.log(c.gray("\n  Toggle: vpn preset on|off <name>  (or run `vpn preset` to pick)\n"));
}

export function cmdPresetOn(names: string[]): void {
  for (const n of names) {
    try {
      enable(n);
      ok(`Enabled preset ${c.bold(n)}`);
    } catch (e) {
      err((e as Error).message);
    }
  }
  applyChange();
}

export function cmdPresetOff(names: string[]): void {
  for (const n of names) {
    disable(n);
    ok(`Disabled preset ${c.bold(n)}`);
  }
  applyChange();
}

export function cmdOn(): void {
  info("Starting VPN…");
  const res = turnOn();
  if (!res.ok) {
    err(res.error ?? "failed to start");
    process.exitCode = 1;
    return;
  }
  ok("xray running, system proxy + env set");
  if (res.shellInit?.changed) ok(`Wired proxy auto-source into ${res.shellInit.rc}`);
  printIps();
  warn("Restart GUI apps to pick up the proxy.");
  info(`This terminal: ${c.bold("source ~/.config/vpn/proxy.env")} (new ones are automatic)`);
}

export function cmdOff(): void {
  info("Stopping VPN…");
  turnOff();
  ok("Proxy off, env cleared, xray stopped");
  const ip = getRealIp();
  console.log(`  🏠 Real IP: ${c.yellow(ip ?? "?")}`);
}

export function cmdRestart(): void {
  info("Restarting VPN…");
  const res = restartVpn();
  if (!res.ok) {
    err(res.error ?? "failed");
    process.exitCode = 1;
    return;
  }
  ok("Restarted");
  printIps();
}

function printIps(): void {
  const real = getRealIp();
  console.log(`  🏠 Real IP: ${c.yellow(real ?? "?")}`);
  if (isRunning()) {
    const vpn = getVpnIp();
    if (vpn && vpn !== real) console.log(`  🌍 VPN IP:  ${c.green(vpn)}`);
    else if (vpn === real) warn("VPN IP equals real IP — proxy may not be working");
    else err("Could not get VPN IP");
  }
}

export function cmdIp(): void {
  printIps();
}

export function cmdLog(n = 50): void {
  if (!existsSync(paths.log)) {
    warn(`No log at ${paths.log}`);
    return;
  }
  const lines = readFileSync(paths.log, "utf8").split("\n");
  console.log(lines.slice(-n).join("\n"));
}

export function cmdRegen(): void {
  try {
    const r = regenerate();
    if (r.ok) ok(`Config written to ${paths.config}`);
    else {
      err("Config did not validate:");
      console.error(c.gray(r.output));
      process.exitCode = 1;
    }
  } catch (e) {
    err((e as Error).message);
    process.exitCode = 1;
  }
}

export function cmdInit(): void {
  const res = ensureShellInit();
  if (res.changed) {
    ok(`Added proxy auto-source to ${res.rc}`);
    info("New terminals will pick up the proxy automatically when the VPN is on.");
  } else {
    warn(`Already configured in ${res.rc}`);
  }
}

// --- Third-party tunnels (app-VPNs + Check Point) over the CLI ---------------

const normalize = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, "");

/** Find a detected service by name or type (case/space/dash-insensitive; "cp" → Check Point). */
function findService(query: string): Service | undefined {
  const q = normalize(query) === "cp" ? "checkpoint" : normalize(query);
  const services = listServices();
  return (
    services.find((s) => normalize(s.name) === q || normalize(s.type) === q) ??
    services.find((s) => normalize(s.name).includes(q) || normalize(s.type).includes(q))
  );
}

/** List every detected VPN service with its status — the names `connect`/`disconnect` take. */
export function cmdServices(): void {
  const groups = groupServices(listServices());
  if (groups.length === 0) {
    warn("No VPN services detected.");
    return;
  }
  console.log(c.bold("\n  VPN services"));
  for (const g of groups) {
    for (const s of g.items) {
      const dot = s.status === "up" ? c.green("●") : s.status === "connecting" ? c.yellow("◐") : c.gray("○");
      const kind = g.fullTunnel ? c.gray("tunnel") : c.gray("proxy ");
      console.log(`  ${dot} ${c.bold(s.name.padEnd(20))} ${c.gray(s.type.padEnd(14))} ${kind}`);
    }
  }
  console.log(c.gray("\n  Connect:  vpn connect <name>      Disconnect:  vpn disconnect <name>|all\n"));
}

/** Connect a detected service by name. Full tunnels are exclusive; Check Point needs creds. */
export async function cmdConnect(
  query: string,
  flags: { user?: string; password?: string; otp?: string } = {},
): Promise<void> {
  const s = findService(query);
  if (!s) {
    err(`No VPN service matching "${query}". See: ${c.bold("vpn services")}`);
    process.exitCode = 1;
    return;
  }

  let creds: Creds | undefined;
  if (s.kind === "checkpoint") {
    // Explicit flags (or VPN_PASSWORD) for scripting; otherwise prompt with input
    // fields. Piped/no-TTY without flags can't prompt — say so.
    const flagPassword = flags.password ?? process.env.VPN_PASSWORD;
    if (flagPassword) {
      creds = { user: flags.user ?? s.user, password: flagPassword, otp: flags.otp };
    } else if (process.stdin.isTTY) {
      const prompted = await promptCheckpoint(s);
      if (!prompted) {
        warn("Cancelled.");
        return;
      }
      creds = prompted;
    } else {
      err(`${s.type} needs credentials. Run in a terminal to be prompted, or pass ${c.bold("--password")} / ${c.bold("--otp")}.`);
      process.exitCode = 1;
      return;
    }
  }

  info(`Connecting ${c.bold(s.name)} ${c.gray(`(${s.type})`)}…`);
  const msg = s.fullTunnel ? await connectExclusive(s, creds) : await connectService(s, creds);
  if (msg) {
    err(msg);
    process.exitCode = 1;
  } else {
    ok(`Connected ${c.bold(s.name)}`);
  }
}

/** Disconnect one service by name, or everything with `all`. */
export async function cmdDisconnect(query?: string): Promise<void> {
  if (!query || normalize(query) === "all") {
    info("Disconnecting every VPN service…");
    await disconnectAll();
    ok("All VPN services disconnected");
    return;
  }
  const s = findService(query);
  if (!s) {
    err(`No VPN service matching "${query}". See: ${c.bold("vpn services")}`);
    process.exitCode = 1;
    return;
  }
  if (s.status === "down") {
    warn(`${c.bold(s.name)} is not connected`);
    return;
  }
  info(`Disconnecting ${c.bold(s.name)} ${c.gray(`(${s.type})`)}…`);
  const msg = await disconnectService(s);
  if (msg) {
    err(msg);
    process.exitCode = 1;
  } else {
    ok(`Disconnected ${c.bold(s.name)}`);
  }
}

/** Show the help screen: pretty Ink UI on a TTY, plain text otherwise (pipes/NO_COLOR). */
export async function runHelp(): Promise<void> {
  if (c.enabled) await showHelp();
  else console.log(plainHelp());
}
