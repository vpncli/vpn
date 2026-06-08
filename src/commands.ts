/** Non-interactive command handlers. They print colored output and mutate state. */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { c, err, icon, info, ok, warn } from "./ui/theme.ts";
import { paths } from "./core/paths.ts";
import type { RouteTarget } from "./core/types.ts";
import { addFromLink, getActive, getServer, listServers, removeServer, setActive } from "./core/servers.ts";
import { addRule, ensureListFiles, fileFor, readList, removeRule } from "./core/routes.ts";
import { disable, enable, listPresets } from "./core/presets.ts";
import { regenerate } from "./core/regen.ts";
import { turnOff, turnOn, restart as restartVpn } from "./core/lifecycle.ts";
import { ensureShellInit } from "./core/shellinit.ts";
import { getRealIp, getVpnIp } from "./core/ip.ts";
import { isRunning } from "./core/xray.ts";
import { VlessParseError } from "./core/vless.ts";
import { t } from "./core/i18n.ts";
import { plainHelp, showHelp } from "./ui/Help.tsx";

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

/** Show the help screen: pretty Ink UI on a TTY, plain text otherwise (pipes/NO_COLOR). */
export async function runHelp(): Promise<void> {
  if (c.enabled) await showHelp();
  else console.log(plainHelp());
}
