/** Builds an xray config object from a server profile + routing rules. Pure. */

import { DEFAULT_PORTS, type Ports, type RouteRule, type RouteTarget, type ServerProfile } from "./types.ts";

const OUTBOUND_TAG: Record<RouteTarget, string> = {
  direct: "direct",
  proxy: "proxy",
  block: "block",
};

/** Classify a rule string as an IP rule or a domain rule (xray needs them split). */
export function ruleKind(rule: string): "ip" | "domain" {
  if (rule.startsWith("geoip:")) return "ip";
  // IPv4 or IPv4 CIDR
  if (/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(rule)) return "ip";
  // IPv6 (contains ":" and only hex/:/./digits, optional CIDR)
  if (rule.includes(":") && /^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(rule)) return "ip";
  // geosite:, domain:, regexp:, full:, or bare hostname
  return "domain";
}

/** Build the outbound that represents the active VLESS server. */
export function buildProxyOutbound(p: ServerProfile): Record<string, unknown> {
  const streamSettings: Record<string, unknown> = { network: p.network };

  if (p.security === "reality") {
    streamSettings.security = "reality";
    streamSettings.realitySettings = {
      serverName: p.sni ?? "",
      publicKey: p.publicKey ?? "",
      shortId: p.shortId ?? "",
      spiderX: p.spiderX ?? "/",
      fingerprint: p.fingerprint ?? "chrome",
    };
  } else if (p.security === "tls") {
    streamSettings.security = "tls";
    streamSettings.tlsSettings = {
      serverName: p.sni ?? "",
      fingerprint: p.fingerprint ?? "chrome",
    };
  } else {
    streamSettings.security = "none";
  }

  if (p.network === "tcp") {
    streamSettings.tcpSettings = { header: { type: "none" } };
  } else if (p.network === "ws") {
    streamSettings.wsSettings = {
      path: p.path ?? "/",
      ...(p.host ? { headers: { Host: p.host } } : {}),
    };
  } else if (p.network === "grpc") {
    streamSettings.grpcSettings = { serviceName: p.serviceName ?? "" };
  }

  return {
    tag: "proxy",
    protocol: "vless",
    settings: {
      vnext: [
        {
          address: p.address,
          port: p.port,
          users: [{ id: p.id, encryption: p.encryption || "none", flow: p.flow || "" }],
        },
      ],
    },
    streamSettings,
  };
}

/**
 * Convert merged routing rules into xray `routing.rules`.
 *
 * Precedence (first match wins in xray): block → proxy → direct, then an always-on
 * private/localhost → direct fallback. Unmatched traffic falls through to the first
 * outbound (`proxy`).
 */
export function buildRoutingRules(rules: RouteRule[]): Array<Record<string, unknown>> {
  const order: RouteTarget[] = ["block", "proxy", "direct"];
  const out: Array<Record<string, unknown>> = [];

  for (const target of order) {
    const forTarget = rules.filter((r) => r.target === target);
    const domains = forTarget.filter((r) => ruleKind(r.rule) === "domain").map((r) => r.rule);
    const ips = forTarget.filter((r) => ruleKind(r.rule) === "ip").map((r) => r.rule);
    if (domains.length > 0) {
      out.push({ type: "field", domain: dedupe(domains), outboundTag: OUTBOUND_TAG[target] });
    }
    if (ips.length > 0) {
      out.push({ type: "field", ip: dedupe(ips), outboundTag: OUTBOUND_TAG[target] });
    }
  }

  // Always keep local/private traffic off the tunnel.
  out.push({ type: "field", ip: ["geoip:private"], outboundTag: "direct" });
  out.push({ type: "field", domain: ["localhost"], outboundTag: "direct" });

  return out;
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * Neutral default DNS block. Users can fully replace it by dropping a custom
 * `dns.json` into ~/.config/vpn/ (e.g. for split-DNS to an internal resolver).
 */
export const DEFAULT_DNS: Record<string, unknown> = {
  servers: ["1.1.1.1", "8.8.8.8", "localhost"],
};

export interface BuildOptions {
  ports?: Ports;
  /** Override the DNS block (e.g. loaded from ~/.config/vpn/dns.json). */
  dns?: Record<string, unknown>;
}

/** Assemble the full xray config object. */
export function buildXrayConfig(
  profile: ServerProfile,
  rules: RouteRule[],
  opts: BuildOptions = {},
): Record<string, unknown> {
  const ports = opts.ports ?? DEFAULT_PORTS;
  return {
    log: { loglevel: "warning" },
    // Local gRPC stats API (for per-channel traffic counters).
    api: { tag: "api", services: ["StatsService"] },
    dns: opts.dns ?? DEFAULT_DNS,
    inbounds: [
      {
        tag: "socks",
        port: ports.socks,
        listen: "127.0.0.1",
        protocol: "socks",
        settings: { udp: true },
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: false },
      },
      {
        tag: "http",
        port: ports.http,
        listen: "127.0.0.1",
        protocol: "http",
        sniffing: { enabled: true, destOverride: ["http", "tls"], routeOnly: false },
      },
      {
        tag: "api",
        port: ports.api,
        listen: "127.0.0.1",
        protocol: "dokodemo-door",
        settings: { address: "127.0.0.1" },
      },
    ],
    outbounds: [
      buildProxyOutbound(profile),
      { tag: "direct", protocol: "freedom", settings: {} },
      { tag: "block", protocol: "blackhole", settings: { response: { type: "none" } } },
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      // API traffic must be dispatched to the api handler first.
      rules: [{ type: "field", inboundTag: ["api"], outboundTag: "api" }, ...buildRoutingRules(rules)],
    },
    stats: {},
    policy: {
      system: {
        statsInboundUplink: true,
        statsInboundDownlink: true,
        statsOutboundUplink: true,
        statsOutboundDownlink: true,
      },
    },
  };
}
