/**
 * Subscriptions: paste a subscription URL (or an app deep-link / redirect wrapper)
 * and add every server it lists. Servers are tagged with the subscription name so
 * they can be refreshed or removed as a group.
 *
 * Handles links like:
 *   https://example.com/sub/TOKEN
 *   happ://add/https://example.com/sub/TOKEN
 *   v2raytun://import/https://example.com/sub/TOKEN
 *   https://quickinstall.example/redirect?url=happ://add/https://example.com/sub/TOKEN
 */

import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { release, arch } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pkg from "../../package.json";
import { ensureDirs, paths } from "./paths.ts";
import { parseVless, slugifyName, flagToCountryCode } from "./vless.ts";
import { listServers, getServer, removeServer, saveServer, setActive, getActive, uniqueName, dedupe } from "./servers.ts";
import type { ServerProfile } from "./types.ts";
import { isDemo } from "./demo.ts";

const execFileAsync = promisify(execFile);

/** Deepest level of redirect / deep-link wrapping `extractSubUrl` will unwrap. */
const MAX_UNWRAP_LAYERS = 8;
/** Curl timeout (seconds) for a subscription fetch. */
const FETCH_TIMEOUT_SEC = "20";
/** Collapse the launch + enter-xray background refreshes that fire close together. */
const REFRESH_DEBOUNCE_MS = 3000;

/** The outcome of parsing a subscription body: usable servers + what was skipped. */
interface ParsedSub {
  profiles: ServerProfile[];
  /** Links that weren't vless:// (vmess/ss/trojan…) or failed to parse. */
  skipped: number;
  /** Provider notices surfaced in place of servers (e.g. "download our app"). */
  notices: string[];
}

export interface Subscription {
  name: string;
  /** Resolved (unwrapped) subscription URL. */
  url: string;
  /** Server profile names this subscription manages. */
  servers: string[];
  /** ISO timestamp of the last fetch. */
  updatedAt: string;
}

export interface SubResult {
  name: string;
  url: string;
  added: string[];
  /** Links that weren't vless:// (vmess/ss/trojan…) or failed to parse. */
  skipped: number;
}

// --- URL extraction ---------------------------------------------------------

const DEEP_LINK = /^[a-z][a-z0-9+.-]*:\/\/(?:add|import|import-sub|install(?:-config)?|sub|subscribe)\/(.+)$/i;

/** Unwrap redirect wrappers (`?url=…`) and app deep-links down to the raw subscription URL. */
export function extractSubUrl(input: string): string {
  let s = input.trim();
  for (let i = 0; i < MAX_UNWRAP_LAYERS; i++) {
    const redirect = s.match(/[?&]url=([^&]+)/i);
    if (redirect) {
      s = safeDecode(redirect[1]!);
      continue;
    }
    const deep = s.match(DEEP_LINK);
    if (deep) {
      s = safeDecode(deep[1]!);
      continue;
    }
    break;
  }
  return s;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// --- fetch + decode ---------------------------------------------------------

/** Stable per-machine hardware id, created once — sent so HWID-bound panels serve the real list. */
export function getHwid(): string {
  if (existsSync(paths.hwid)) {
    const v = readFileSync(paths.hwid, "utf8").trim();
    if (v) return v;
  }
  ensureDirs();
  const id = randomUUID();
  writeFileSync(paths.hwid, id + "\n");
  return id;
}

/**
 * User-Agent sent when fetching a subscription. HWID-gated panels (Remnawave)
 * match the UA *prefix* to decide the response format — only a `Happ…` prefix
 * yields the server list (an unknown UA gets an empty body). We keep that prefix
 * but tack on our identity so the panel's device list shows `vpncli/<version>`.
 */
const USER_AGENT = `Happ/1.0.0 (vpncli/${pkg.version})`;

/** Human-readable hardware model for the panel's device list (e.g. "MacBook Pro (16-inch, 2021)"), resolved once. */
let cachedModel: string | undefined;
function deviceModel(): string {
  if (cachedModel !== undefined) return cachedModel;
  let m = "";
  try {
    if (process.platform === "darwin") {
      // Apple Silicon stores the marketing name (with screen size) in IORegistry;
      // fall back to the bare identifier (e.g. "MacBookPro18,1") if it's unavailable.
      const r = spawnSync("sh", ["-c", "ioreg -arc IOPlatformDevice -k product-name | plutil -extract 0.product-name raw -o - -"], { encoding: "utf8" });
      const b64 = (r.stdout || "").trim();
      if (b64) m = Buffer.from(b64, "base64").toString("utf8").replace(/\0/g, "").trim();
      if (!m) m = (spawnSync("sysctl", ["-n", "hw.model"], { encoding: "utf8" }).stdout || "").trim();
    } else if (process.platform === "linux") {
      for (const f of ["/sys/class/dmi/id/product_name", "/sys/devices/virtual/dmi/id/product_name"]) {
        if (existsSync(f)) {
          m = readFileSync(f, "utf8").trim();
          break;
        }
      }
    }
  } catch {
    // fall through to the generic identifier
  }
  cachedModel = m || `${process.platform}-${arch()}`;
  return cachedModel;
}

/** Headers a client like Happ sends so HWID device-binding (Remnawave) hands over the config. */
function deviceHeaders(): string[] {
  const os = process.platform === "darwin" ? "macOS" : process.platform === "linux" ? "Linux" : process.platform;
  return [
    "-H", `x-hwid: ${getHwid()}`,
    "-H", `x-device-os: ${os}`,
    "-H", `x-ver-os: ${release()}`,
    "-H", `x-device-model: ${deviceModel()}`,
  ];
}

export interface SubResponse {
  headers: Record<string, string>;
  body: string;
}

async function fetchBody(url: string): Promise<SubResponse> {
  try {
    // -i keeps the response headers (to read HWID state); a client User-Agent +
    // x-hwid let HWID-gated panels return the server list instead of a notice.
    const { stdout } = await execFileAsync(
      "curl",
      ["-sSL", "-i", "--max-time", FETCH_TIMEOUT_SEC, "-A", USER_AGENT, ...deviceHeaders(), url],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    return splitResponse(stdout);
  } catch {
    throw new Error("could not fetch the subscription (check the URL / your connection)");
  }
}

/**
 * Split a `curl -i` response into the final header map (lowercased) and the body.
 * With `-L` (redirects) and proxy `CONNECT`, curl emits several header blocks; the
 * real response is the LAST `HTTP/…` status line. We split only on the first blank
 * line *after* that — so a body that itself contains blank lines stays intact
 * (e.g. a subscription list with blank-line-separated links).
 */
function splitResponse(raw: string): SubResponse {
  const statuses = [...raw.matchAll(/(?:^|\r?\n)HTTP\/\d(?:\.\d)? \d{3}/g)];
  const start = statuses.length ? statuses[statuses.length - 1]!.index! : 0;
  const tail = raw.slice(start);
  const sep = tail.match(/\r?\n\r?\n/);
  const headerBlock = sep ? tail.slice(0, sep.index!) : tail;
  const body = sep ? tail.slice(sep.index! + sep[0].length) : "";
  const headers: Record<string, string> = {};
  for (const line of headerBlock.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body };
}

/** Decode a subscription body to share links. Bodies are usually base64 of newline-separated links. */
export function decodeSubscription(body: string): string[] {
  let text = body.trim();
  // A base64 blob has no "://"; decode it (tolerates standard and url-safe alphabets).
  if (text && !text.includes("://") && /^[A-Za-z0-9+/_=\s-]+$/.test(text)) {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    if (decoded.includes("://")) text = decoded;
  }
  // Links may be separated by \n, \r\n, or a lone \r (and providers sometimes
  // use blank lines between them).
  return text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** A placeholder/notice entry (UUID all zeros, 0.0.0.0, etc.) — providers use these to show messages. */
function isPlaceholder(p: ServerProfile): boolean {
  return (
    p.address === "0.0.0.0" ||
    p.address === "127.0.0.1" ||
    p.address === "" ||
    p.port <= 1 ||
    /^0+$/.test(p.id.replace(/-/g, ""))
  );
}

/** Parse vless:// links from a decoded subscription. Placeholders/non-vless are skipped;
 *  their human-readable names (often a provider notice) are collected separately. */
function parseLinks(links: string[]): ParsedSub {
  const profiles: ServerProfile[] = [];
  const notices: string[] = [];
  let skipped = 0;
  for (const link of links) {
    if (!link.startsWith("vless://")) {
      skipped++;
      continue;
    }
    try {
      const p = parseVless(link);
      if (isPlaceholder(p)) {
        const note = decodeFragment(link);
        if (note) notices.push(note);
        skipped++;
        continue;
      }
      profiles.push(p);
    } catch {
      skipped++;
    }
  }
  return { profiles, skipped, notices };
}

/** The raw (un-slugified) #fragment of a share link — used to surface provider notices. */
function decodeFragment(link: string): string {
  const hash = link.split("#")[1];
  if (!hash) return "";
  try {
    return decodeURIComponent(hash).trim();
  } catch {
    return hash.trim();
  }
}

// --- xray/V2Box JSON format -------------------------------------------------
// Happ-style panels (Remnawave) serve the config as a JSON array of full xray
// configs, each with a `remarks` name and a vless `proxy-*` outbound. Map those.

// Transliterate Cyrillic so country names in `remarks` survive slugification
// (otherwise "🇩🇪 Германия PRO" → "pro" and every server collides).
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
function transliterate(s: string): string {
  return s.replace(/[а-яё]/gi, (ch) => {
    const lower = ch.toLowerCase();
    const out = TRANSLIT[lower] ?? "";
    return ch === lower ? out : out.charAt(0).toUpperCase() + out.slice(1);
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function xrayOutboundToProfile(ob: any, remarks?: string): ServerProfile | null {
  const v = ob?.settings?.vnext?.[0];
  if (!v?.address || !v.users?.[0]?.id) return null;
  const user = v.users[0];
  const ss = ob.streamSettings ?? {};
  const reality = ss.realitySettings ?? {};
  const tls = ss.tlsSettings ?? {};
  const ws = ss.wsSettings ?? {};
  const grpc = ss.grpcSettings ?? {};
  return {
    name: slugifyName(transliterate(remarks || "") || v.address),
    countryCode: flagToCountryCode(remarks || ""),
    address: String(v.address),
    port: Number(v.port) || 443,
    id: String(user.id),
    flow: user.flow ?? "",
    encryption: user.encryption ?? "none",
    security: (ss.security ?? "none") as ServerProfile["security"],
    network: (ss.network ?? "tcp") as ServerProfile["network"],
    sni: reality.serverName || tls.serverName || undefined,
    fingerprint: reality.fingerprint || tls.fingerprint || undefined,
    publicKey: reality.publicKey || undefined,
    shortId: reality.shortId || undefined,
    spiderX: reality.spiderX || undefined,
    host: ws.headers?.Host || ws.host || grpc.authority || undefined,
    path: ws.path || undefined,
    serviceName: grpc.serviceName || undefined,
    url: "",
  };
}

/** Parse a JSON subscription (array of xray configs, or a single config) into vless profiles. */
function parseXrayJson(text: string): ParsedSub {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { profiles: [], skipped: 0, notices: [] };
  }
  const entries: any[] = Array.isArray(data) ? data : data?.outbounds ? [data] : Object.values(data ?? {});
  const profiles: ServerProfile[] = [];
  let skipped = 0;
  for (const e of entries) {
    const ob = (e?.outbounds ?? []).find((o: any) => o?.protocol === "vless" && o?.settings?.vnext?.[0]?.address);
    const p = ob ? xrayOutboundToProfile(ob, e?.remarks) : null;
    if (p && !isPlaceholder(p)) profiles.push(p);
    else skipped++;
  }
  return { profiles, skipped, notices: [] };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Parse a subscription body in any supported format: xray/V2Box JSON, or base64 vless links. */
function parseSubscription(body: string): ParsedSub {
  const trimmed = body.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const json = parseXrayJson(trimmed);
    if (json.profiles.length) return json;
  }
  return parseLinks(decodeSubscription(trimmed));
}

// --- storage ----------------------------------------------------------------

export function listSubscriptions(): Subscription[] {
  if (!existsSync(paths.subscriptions)) return [];
  try {
    return JSON.parse(readFileSync(paths.subscriptions, "utf8")) as Subscription[];
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: Subscription[]): void {
  ensureDirs();
  writeFileSync(paths.subscriptions, JSON.stringify(subs, null, 2) + "\n");
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/** The panel's display name, from the `profile-title` header (often `base64:<title>`). */
function profileTitle(headers: Record<string, string>): string | undefined {
  let v = headers["profile-title"]?.trim();
  if (!v) return undefined;
  if (v.toLowerCase().startsWith("base64:")) {
    try {
      v = Buffer.from(v.slice(7).trim(), "base64").toString("utf8").trim();
    } catch {
      return undefined;
    }
  }
  return v || undefined;
}

// --- public API -------------------------------------------------------------

/** Fetch a subscription and add all its vless servers, tagged with the subscription name. */
export async function addSubscription(input: string, name?: string): Promise<SubResult> {
  if (isDemo()) throw new Error("subscriptions are disabled in demo mode");
  const url = extractSubUrl(input);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`couldn't find a subscription URL in:\n  ${input}`);
  }
  const { profiles, skipped, notices, headers } = await fetchSubProfiles(url);
  if (profiles.length === 0) {
    throw new Error(noServersError(headers, notices));
  }
  // Prefer the panel's own title (`profile-title` header) over the bare host.
  const subName = uniqueSubName(name ?? profileTitle(headers) ?? hostOf(url) ?? "subscription", name === undefined);
  const added = saveProfiles(subName, profiles);
  upsert({ name: subName, url, servers: added, updatedAt: new Date().toISOString() });
  if (!getActive() && added[0]) setActive(added[0]);
  return { name: subName, url, added, skipped };
}

/** Re-fetch a subscription (or all): drop its old servers and add the current list. */
export async function updateSubscription(name?: string): Promise<SubResult[]> {
  if (isDemo()) throw new Error("subscriptions are disabled in demo mode");
  const subs = listSubscriptions();
  const targets = name ? subs.filter((s) => s.name === name) : subs;
  if (name && targets.length === 0) throw new Error(`unknown subscription "${name}"`);

  const results: SubResult[] = [];
  for (const sub of targets) {
    // Fetch FIRST (network), then swap synchronously — so the panel never sees
    // the servers vanish mid-refresh. A momentarily empty response keeps the old list.
    const { profiles, skipped } = await fetchSubProfiles(sub.url);
    if (profiles.length === 0) {
      results.push({ name: sub.name, url: sub.url, added: sub.servers, skipped });
      continue;
    }
    const active = getActive();
    const wasActive = active && sub.servers.includes(active);
    for (const s of sub.servers) removeServer(s);
    const added = saveProfiles(sub.name, profiles);
    upsert({ name: sub.name, url: sub.url, servers: added, updatedAt: new Date().toISOString() });
    // Keep the same active server across the refresh (no xray restart needed):
    // re-select it by name if it's still there, else fall back to the first.
    if (wasActive) {
      if (active && added.includes(active)) setActive(active);
      else if (added[0]) setActive(added[0]);
    }
    results.push({ name: sub.name, url: sub.url, added, skipped });
  }
  return results;
}

/** Rename a subscription: just re-tag its servers (their names don't change, so no
 *  file moves and no xray restart — the active pointer stays valid). Returns the final name. */
export function renameSubscription(oldName: string, newName: string): string {
  const subs = listSubscriptions();
  const sub = subs.find((s) => s.name === oldName);
  if (!sub) throw new Error(`unknown subscription "${oldName}"`);

  const others = new Set(subs.filter((s) => s.name !== oldName).map((s) => s.name));
  const slug = dedupe(slugifyName(newName), others);
  if (slug === oldName) return oldName;

  for (const serverName of sub.servers) {
    const p = getServer(serverName);
    if (!p) continue;
    p.subscription = slug;
    saveServer(p);
  }
  saveSubscriptions([...subs.filter((s) => s.name !== oldName), { ...sub, name: slug }]);
  return slug;
}

/**
 * Background refresh of every subscription, like a VPN client keeping its server
 * list current. Swallows errors (offline / bad URL) and is a no-op in demo or
 * with no subscriptions. Never restarts xray — it only updates the stored list;
 * the running connection stays until the user picks a server.
 */
let lastRefresh = 0;
export async function refreshSubscriptions(): Promise<void> {
  if (isDemo() || listSubscriptions().length === 0) return;
  // Debounce: launch and entering the xray panel both trigger a refresh; a single
  // fetch covers a burst (a manual refresh uses updateSubscription directly).
  const now = Date.now();
  if (now - lastRefresh < REFRESH_DEBOUNCE_MS) return;
  lastRefresh = now;
  try {
    await updateSubscription();
  } catch {
    // keep the servers we already have
  }
}

/** Remove a subscription and every server it added. */
export function removeSubscription(name: string): number {
  const subs = listSubscriptions();
  const sub = subs.find((s) => s.name === name);
  if (!sub) throw new Error(`unknown subscription "${name}"`);
  // Remove by current tag (covers manual renames) plus the recorded names.
  const tagged = new Set([...sub.servers, ...listServers().filter((p) => p.subscription === name).map((p) => p.name)]);
  for (const s of tagged) removeServer(s);
  saveSubscriptions(subs.filter((s) => s.name !== name));
  return tagged.size;
}

// --- helpers ----------------------------------------------------------------

/** Fetch + parse a subscription's vless servers (and response headers) — no disk writes. */
async function fetchSubProfiles(url: string): Promise<ParsedSub & { headers: Record<string, string> }> {
  const { headers, body } = await fetchBody(url);
  return { ...parseSubscription(body), headers };
}

/** A human-readable reason a fetch yielded no usable servers (HWID-aware). */
function noServersError(headers: Record<string, string>, notices: string[]): string {
  if (headers["x-hwid-max-devices-reached"] === "true") {
    const support = headers["support-url"];
    return (
      "this subscription is device-locked (HWID) and its device limit is full.\n" +
      `Free a device slot${support ? ` (support: ${support})` : ""}, then add it again.`
    );
  }
  if (notices[0]) {
    return `the provider returned a notice instead of servers:\n  “${notices[0]}”\nThis subscription is locked to a specific app — ask the provider for a universal / v2ray subscription link.`;
  }
  return "no vless servers found in the subscription (it may use vmess/ss/trojan, which xray-vless doesn't import)";
}

/** Save fetched profiles tagged with the subscription; returns their final names.
 *  Names keep the server's own label (e.g. "germany-pro") — the subscription block
 *  already groups them, so prefixing every name with the subscription is just noise. */
function saveProfiles(subName: string, profiles: ServerProfile[]): string[] {
  const added: string[] = [];
  for (const p of profiles) {
    const named = { ...p, subscription: subName, name: uniqueName(p.name) };
    saveServer(named);
    added.push(named.name);
  }
  return added;
}

function upsert(sub: Subscription): void {
  const subs = listSubscriptions().filter((s) => s.name !== sub.name);
  subs.push(sub);
  saveSubscriptions(subs);
}

function uniqueSubName(base: string, makeUnique: boolean): string {
  const slug = slugifyName(base);
  if (!makeUnique) return slug;
  return dedupe(slug, new Set(listSubscriptions().map((s) => s.name)));
}
