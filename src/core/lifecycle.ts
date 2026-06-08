/** High-level VPN lifecycle: on / off / restart, shared by the CLI and the TUI. */

import { existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ensureDirs, paths } from "./paths.ts";
import { DEFAULT_PORTS, type Ports } from "./types.ts";
import { regenerate } from "./regen.ts";
import * as xray from "./xray.ts";
import { getOs, type ProxyEnv, type StatusLine } from "../os/index.ts";
import { getActive } from "./servers.ts";
import { getEnabled } from "./presets.ts";
import { ensureShellInit, type ShellInitResult } from "./shellinit.ts";

/**
 * Hosts that should never go through the proxy (system-proxy bypass + NO_PROXY).
 * Private ranges + loopback. Extend per-machine via VPN_EXTRA_BYPASS (comma-separated).
 */
export function bypassHosts(): string[] {
  const base = ["localhost", "127.0.0.1", "10.*", "172.16.*", "192.168.*"];
  const extra = (process.env.VPN_EXTRA_BYPASS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...base, ...extra];
}

export function proxyEnv(ports: Ports = DEFAULT_PORTS): ProxyEnv {
  return {
    httpProxy: `http://127.0.0.1:${ports.http}`,
    httpsProxy: `http://127.0.0.1:${ports.http}`,
    allProxy: `socks5h://127.0.0.1:${ports.socks}`,
    noProxy: bypassHosts().join(","),
  };
}

function writeProxyEnvFile(env: ProxyEnv): void {
  ensureDirs();
  const body =
    `export HTTP_PROXY=${env.httpProxy}\n` +
    `export HTTPS_PROXY=${env.httpsProxy}\n` +
    `export ALL_PROXY=${env.allProxy}\n` +
    `export NO_PROXY=${env.noProxy}\n`;
  writeFileSync(paths.proxyEnv, body);
}

function removeProxyEnvFile(): void {
  if (existsSync(paths.proxyEnv)) rmSync(paths.proxyEnv);
}

function sleep(seconds: number): void {
  spawnSync("sleep", [String(seconds)]);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Apply system proxy + env + shell wiring (shared by sync and async paths). */
function wireUp(ports: Ports): ShellInitResult {
  const os = getOs();
  const env = proxyEnv(ports);
  os.proxyOn(ports, bypassHosts());
  os.appSetenv(env);
  writeProxyEnvFile(env);
  return ensureShellInit();
}

export interface OnResult {
  ok: boolean;
  /** xray -test output when regeneration failed. */
  error?: string;
  /** Whether the shell rc was just wired up for proxy auto-source. */
  shellInit?: ShellInitResult;
}

/** Regenerate config, start xray, and wire up the system proxy + env. */
export function turnOn(ports: Ports = DEFAULT_PORTS): OnResult {
  const r = regenerate();
  if (!r.ok) return { ok: false, error: r.output };

  if (xray.isRunning()) xray.stop();
  sleep(1);
  xray.start(paths.config);
  sleep(1);
  if (!xray.isRunning()) return { ok: false, error: "xray failed to start (see `vpn log`)" };

  const shellInit = wireUp(ports);
  return { ok: true, shellInit };
}

/** Async variant for the TUI — does not block the render loop while waiting. */
export async function turnOnAsync(ports: Ports = DEFAULT_PORTS): Promise<OnResult> {
  const r = regenerate();
  if (!r.ok) return { ok: false, error: r.output };

  if (xray.isRunning()) xray.stop();
  await delay(800);
  xray.start(paths.config);
  await delay(1000);
  if (!xray.isRunning()) return { ok: false, error: "xray failed to start (see `vpn log`)" };

  const shellInit = wireUp(ports);
  return { ok: true, shellInit };
}

export async function turnOffAsync(): Promise<void> {
  turnOff();
}

export async function restartAsync(ports: Ports = DEFAULT_PORTS): Promise<OnResult> {
  xray.stop();
  await delay(800);
  return turnOnAsync(ports);
}

/** Regenerate config after a change; restart xray (async) if it is running. */
export async function reapplyAsync(ports: Ports = DEFAULT_PORTS): Promise<OnResult> {
  const r = regenerate();
  if (!r.ok) return { ok: false, error: r.output };
  if (xray.isRunning()) return restartAsync(ports);
  return { ok: true };
}

/** Tear down the proxy + env and stop xray. */
export function turnOff(): void {
  const os = getOs();
  os.proxyOff();
  os.appUnsetenv();
  removeProxyEnvFile();
  xray.stop();
}

export function restart(ports: Ports = DEFAULT_PORTS): OnResult {
  xray.stop();
  sleep(1);
  return turnOn(ports);
}

/** Rows for the status dashboard. */
export function statusLines(): StatusLine[] {
  const os = getOs();
  const lines: StatusLine[] = [];

  const running = xray.isRunning();
  lines.push({ label: "xray", ok: running, value: running ? `running (pid ${xray.pids()})` : "stopped" });

  lines.push(...os.statusExtras());

  const envSet = process.env.HTTPS_PROXY ? true : Boolean(spawnLaunchctlEnv());
  lines.push({ label: "App proxy env", ok: envSet, value: envSet ? "set" : "unset" });

  lines.push({ label: "Terminal env file", ok: existsSync(paths.proxyEnv), value: existsSync(paths.proxyEnv) ? "ready" : "absent" });

  const active = getActive();
  lines.push({ label: "Active server", ok: Boolean(active), value: active ?? "none" });

  const presets = getEnabled();
  lines.push({ label: "Presets", ok: presets.length > 0, value: presets.length ? presets.join(", ") : "none" });

  return lines;
}

function spawnLaunchctlEnv(): string {
  if (process.platform !== "darwin") return "";
  const res = spawnSync("launchctl", ["getenv", "HTTPS_PROXY"], { encoding: "utf8" });
  return (res.stdout ?? "").trim();
}
