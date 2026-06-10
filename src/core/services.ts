/** Unified VPN-service model: xray servers + macOS NEVPNManager apps + Check Point. */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { getActive, listServers, setActive } from "./servers.ts";
import { isRunning } from "./xray.ts";
import { reapplyAsync, turnOffAsync, turnOnAsync } from "./lifecycle.ts";
import {
  CHECK_POINT_TRAC,
  checkpointInfo,
  inetInterfaces,
  interfaceRoutes,
} from "./tunnels.ts";
import { isDemo, demoTunnels } from "./demo.ts";

export type ServiceKind = "xray" | "scutil" | "nm" | "checkpoint";

export interface Service {
  id: string;
  kind: ServiceKind;
  /** Display group: "xray" | "WireGuard" | "Outline" | … | "Check Point". */
  type: string;
  name: string;
  status: "up" | "down" | "connecting";
  /**
   * Full-tunnel service: rewrites the OS routing table (one default route) and
   * captures ALL traffic — only one can be active at a time. xray is a proxy
   * (routes by rules) and coexists, so it's false there.
   */
  fullTunnel: boolean;
  /** xray: is this the active server. */
  active?: boolean;
  /** scutil service id for `scutil --nc start|stop`. */
  scutilId?: string;
  /** App bundle id (scutil services) — used to launch the app as a fallback. */
  bundle?: string;
  /** Check Point gateway IP (geo / ping). */
  gateway?: string;
  /** Tunnel interface backing this service (for traffic), if any. */
  iface?: string;
  /** Server address (xray) for ping/geo. */
  host?: string;
  port?: number;
  /** Check Point username (prefill for the connect form). */
  user?: string;
  note?: string;
}

const BUNDLE_TYPE: Record<string, string> = {
  "com.wireguard.macos": "WireGuard",
  "org.outline.macos.client": "Outline",
  "com.databridges.privacy.v2RayTun": "v2RayTun",
  "su.ffg.happ.plus": "Happ",
  "su.ffg.happ": "Happ",
};

function bundleType(bundle: string): string {
  return BUNDLE_TYPE[bundle] ?? bundle.split(".").pop() ?? "VPN";
}

// --- providers ------------------------------------------------------------

export function xrayServices(): Service[] {
  const active = getActive();
  const running = isRunning();
  return listServers().map((s) => ({
    id: `xray:${s.name}`,
    kind: "xray",
    type: "xray",
    name: s.name,
    fullTunnel: false,
    active: s.name === active,
    status: s.name === active && running ? "up" : "down",
    host: s.address,
    port: s.port,
  }));
}

function scutilServices(): Service[] {
  if (process.platform !== "darwin") return [];
  const res = spawnSync("scutil", ["--nc", "list"], { encoding: "utf8" });
  const out = res.status === 0 ? (res.stdout ?? "") : "";
  const services: Service[] = [];
  const re = /\((Connected|Disconnected|Connecting)\)\s+(\S+)\s+VPN \(([^)]+)\)\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(out)) !== null) {
    const [, state, id, bundle, name] = m;
    services.push({
      id: `scutil:${id}`,
      kind: "scutil",
      type: bundleType(bundle!),
      name: name!,
      fullTunnel: true,
      scutilId: id,
      bundle: bundle,
      status: state === "Connected" ? "up" : state === "Connecting" ? "connecting" : "down",
    });
  }
  return services;
}

/** Split an `nmcli -t` line on unescaped colons (nmcli escapes `:` in values as `\:`). */
function nmcliFields(line: string): string[] {
  return line.split(/(?<!\\):/).map((f) => f.replace(/\\:/g, ":"));
}

const NM_TYPE: Record<string, string> = { wireguard: "WireGuard", vpn: "VPN" };

/** Linux app-VPNs from NetworkManager: WireGuard + VPN (OpenVPN/OpenConnect/…) connections. */
function linuxServices(): Service[] {
  if (process.platform !== "linux") return [];
  const res = spawnSync("nmcli", ["-t", "-f", "NAME,TYPE,DEVICE,STATE", "connection", "show"], { encoding: "utf8" });
  if (res.status !== 0 || !res.stdout) return [];
  const services: Service[] = [];
  for (const line of res.stdout.split("\n")) {
    if (!line) continue;
    const [name, type, device, state] = nmcliFields(line);
    if (!name || !type || !(type in NM_TYPE)) continue;
    const up = state === "activated";
    services.push({
      id: `nm:${name}`,
      kind: "nm",
      type: NM_TYPE[type]!,
      name,
      fullTunnel: true,
      status: up ? "up" : "down",
      iface: up && device ? device : undefined,
    });
  }
  return services;
}

/** The utun carrying Check Point traffic = an inet tunnel routing corporate 10.x prefixes. */
function checkpointIface(): string | undefined {
  for (const t of inetInterfaces()) {
    const routes = interfaceRoutes(t.iface);
    if (routes.some((r) => /^10\.\d/.test(r) && !r.startsWith(t.ip.split(".").slice(0, 2).join(".")))) {
      return t.iface;
    }
  }
  return inetInterfaces()[0]?.iface;
}

function checkpointService(): Service | null {
  const info = checkpointInfo();
  if (!info) return null; // client not installed
  if (!info.up && info.status?.toLowerCase() !== "connecting" && !info.gateway) {
    // installed but no connection at all → still surface as a "down" service to allow connect
  }
  return {
    id: "checkpoint",
    kind: "checkpoint",
    type: "Check Point",
    name: info.site || "Check Point",
    fullTunnel: true,
    status: info.up ? "up" : info.status?.toLowerCase() === "connecting" ? "connecting" : "down",
    gateway: info.gateway,
    iface: info.up ? checkpointIface() : undefined,
    user: info.user,
    note: info.note,
  };
}

/** All services across providers, ordered: xray first, then others, Check Point last. */
export function listServices(): Service[] {
  const xray = xrayServices();
  if (isDemo()) return [...xray, ...demoTunnels()];
  const scutil = scutilServices();
  const cp = checkpointService();

  // Attach a tunnel interface (→ IP / ping / traffic) to every connected
  // app-VPN. Check Point claims its utun first so an up WireGuard gets a
  // different one.
  if (process.platform === "darwin") {
    const claimed = new Set<string>(cp?.iface ? [cp.iface] : []);
    const pool = inetInterfaces().filter((t) => !claimed.has(t.iface));
    for (const s of scutil) {
      if (s.status !== "up" || pool.length === 0) continue;
      const t = pool.shift()!;
      s.iface = t.iface;
      s.host = t.ip; // assigned tunnel IP (display)
      s.gateway = t.peer; // peer (ping target)
    }
  }

  const services = [...xray, ...scutil, ...linuxServices()];
  if (cp) services.push(cp);
  return services;
}

export interface ServiceGroup {
  type: string;
  items: Service[];
  fullTunnel: boolean;
}

/** Group services by `type`, preserving discovery order. */
export function groupServices(services: Service[]): ServiceGroup[] {
  const order: string[] = [];
  const map = new Map<string, Service[]>();
  for (const s of services) {
    if (!map.has(s.type)) {
      map.set(s.type, []);
      order.push(s.type);
    }
    map.get(s.type)!.push(s);
  }
  return order.map((type) => ({ type, items: map.get(type)!, fullTunnel: map.get(type)![0]!.fullTunnel }));
}

/** The service shown on a group's collapsed card: xray→active server, else the up one. */
export function groupRepresentative(g: ServiceGroup): Service {
  return g.items.find((i) => (g.type === "xray" ? i.active : i.status !== "down")) ?? g.items[0]!;
}

/** Aggregate status of a group (up if any member up). */
export function groupStatus(g: ServiceGroup): "up" | "down" | "connecting" {
  if (g.items.some((i) => i.status === "up")) return "up";
  if (g.items.some((i) => i.status === "connecting")) return "connecting";
  return "down";
}

// --- control --------------------------------------------------------------

function run(cmd: string, args: string[], timeout = 15000): { ok: boolean; out: string } {
  const res = spawnSync(cmd, args, { encoding: "utf8", timeout });
  return { ok: res.status === 0, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Current scutil connection status word ("Connected"/"Disconnected"/…). */
function scutilStatus(id: string): string {
  const res = spawnSync("scutil", ["--nc", "status", id], { encoding: "utf8" });
  return (res.stdout ?? "").trim().split("\n")[0]?.trim() ?? "";
}

/**
 * Connect an app-managed (NEVPNManager) service. `scutil --nc start` works for
 * WireGuard, but Network-Extension apps (Outline, v2RayTun, Happ) often won't
 * bring the tunnel up from the CLI — so if it doesn't connect shortly, fall back
 * to launching the app by bundle id so the user can finish there.
 */
async function connectScutil(s: Service): Promise<string | null> {
  run("scutil", ["--nc", "start", s.scutilId!]);
  for (let i = 0; i < 6; i++) {
    await delay(500);
    if (/^Connect(ed|ing)/i.test(scutilStatus(s.scutilId!))) return null;
  }
  // Still down → hand off to the app itself.
  if (s.bundle) {
    const { ok } = run("open", ["-b", s.bundle]);
    if (ok) return `${s.type}: opened the app — connect from there`;
  }
  return `${s.type} didn't start from the CLI — open the app to connect`;
}

export interface Creds {
  user?: string;
  password: string;
  otp?: string;
}

/** Connect a service. xray/scutil are quick; Check Point needs creds (password + OTP). */
export async function connectService(s: Service, creds?: Creds): Promise<string | null> {
  if (isDemo()) return null; // demo recordings must not touch scutil/nmcli/trac/xray
  switch (s.kind) {
    case "xray": {
      setActive(s.name);
      const r = await turnOnAsync();
      return r.ok ? null : (r.error ?? "failed to start");
    }
    case "scutil":
      return connectScutil(s);
    case "nm": {
      const { ok, out } = run("nmcli", ["connection", "up", "id", s.name]);
      return ok ? null : out.trim() || "nmcli connection up failed";
    }
    case "checkpoint":
      return connectCheckpoint(s, creds);
  }
}

export async function disconnectService(s: Service): Promise<string | null> {
  if (isDemo()) return null;
  switch (s.kind) {
    case "xray":
      await turnOffAsync();
      return null;
    case "scutil": {
      const { ok, out } = run("scutil", ["--nc", "stop", s.scutilId!]);
      return ok ? null : out.trim() || "scutil stop failed";
    }
    case "nm": {
      const { ok, out } = run("nmcli", ["connection", "down", "id", s.name]);
      return ok ? null : out.trim() || "nmcli connection down failed";
    }
    case "checkpoint": {
      if (!existsSync(CHECK_POINT_TRAC)) return "Check Point not installed";
      const { ok, out } = run(CHECK_POINT_TRAC, ["disconnect"]);
      return ok ? null : out.trim() || "trac disconnect failed";
    }
  }
}

/** Switch the active xray server (regenerate config, restart if running). */
export async function switchXray(name: string): Promise<string | null> {
  setActive(name);
  const r = await reapplyAsync();
  return r.ok ? null : (r.error ?? "failed");
}

/** Turn everything off: xray, every connected scutil service, Check Point. */
export async function disconnectAll(): Promise<void> {
  if (isDemo()) return;
  await turnOffAsync();
  await disconnectTunnels();
}

/** Stop every full tunnel (scutil/NM apps + Check Point) except `exceptId`; leaves xray. */
async function disconnectTunnels(exceptId?: string): Promise<void> {
  if (isDemo()) return;
  for (const s of scutilServices()) {
    if (s.status !== "down" && s.id !== exceptId) run("scutil", ["--nc", "stop", s.scutilId!]);
  }
  for (const s of linuxServices()) {
    if (s.status === "up" && s.id !== exceptId) run("nmcli", ["connection", "down", "id", s.name]);
  }
  if (exceptId !== "checkpoint" && existsSync(CHECK_POINT_TRAC)) run(CHECK_POINT_TRAC, ["disconnect"]);
}

/**
 * Connect a full-tunnel service exclusively among tunnels: full tunnels rewrite
 * the single OS default route, so only one tunnel can be active. Disconnect the
 * other tunnels first — but leave xray running (it's a proxy and coexists).
 */
export async function connectExclusive(s: Service, creds?: Creds): Promise<string | null> {
  await disconnectTunnels(s.id);
  return connectService(s, creds);
}

/**
 * Connect Check Point via its official CLI. On this site the `-p` flag carries
 * the *one-time code* (first factor), and the static password is supplied via
 * the interactive challenge prompt — verified empirically. Falls back to the GUI.
 */
function connectCheckpoint(s: Service, creds?: Creds): Promise<string | null> {
  if (!existsSync(CHECK_POINT_TRAC)) return Promise.resolve("Check Point not installed");
  if (!creds?.password) return Promise.resolve("password required");

  return new Promise((resolve) => {
    const args = ["connect"];
    // First factor (`-p`) = OTP; the password answers the challenge prompt.
    if (creds.user) args.push("-u", creds.user, "-p", creds.otp ?? "");
    const child = spawn(CHECK_POINT_TRAC, args, { stdio: ["pipe", "pipe", "pipe"] });

    let buf = "";
    let pwSent = false;
    const sendPassword = () => {
      if (pwSent) return;
      pwSent = true;
      child.stdin.write(`${creds.password}\n`);
    };

    const onData = (d: Buffer) => {
      buf += d.toString();
      // Challenge prompt → answer with the static password.
      if (/challenge|password|passcode|response/i.test(buf)) sendPassword();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    // Best-effort: also push the password shortly after start if the prompt is silent.
    const t = setTimeout(sendPassword, 1500);

    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0 && /connected/i.test(buf)) return resolve(null);
      // Fall back to the official GUI flow.
      spawnSync(CHECK_POINT_TRAC, ["connectgui"]);
      resolve(code === 0 ? null : buf.trim() || "trac connect failed (opened GUI)");
    });
    child.on("error", () => resolve("could not launch trac"));
  });
}
