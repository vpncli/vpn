/** Shared domain types for vpn. */

export type Security = "reality" | "tls" | "none";
export type Network = "tcp" | "ws" | "grpc";

/** Where matched traffic should go. */
export type RouteTarget = "direct" | "proxy" | "block";

/**
 * A normalized VLESS server profile. Parsed from a `vless://` share link and
 * persisted as JSON under ~/.config/vpn/servers/<name>.json.
 */
export interface ServerProfile {
  name: string;
  address: string;
  port: number;
  /** UUID */
  id: string;
  /** e.g. "xtls-rprx-vision"; empty when not used */
  flow: string;
  /** usually "none" for VLESS */
  encryption: string;
  security: Security;
  network: Network;

  /** TLS / Reality */
  sni?: string;
  fingerprint?: string;

  /** Reality only */
  publicKey?: string;
  shortId?: string;
  spiderX?: string;

  /** ws / grpc transports */
  host?: string;
  path?: string;
  serviceName?: string;

  /** Original vless:// link, kept for reference/round-trip. */
  url: string;

  /** Name of the subscription this server came from (managed as a group). */
  subscription?: string;

  /** ISO 3166-1 alpha-2 country code parsed from the server label's flag emoji (e.g. "DE").
   *  Reliable for shared-front subscriptions where the address can't be geolocated. */
  countryCode?: string;
}

/** A single routing rule with its destination. */
export interface RouteRule {
  target: RouteTarget;
  /** xray notation: domain:, regexp:, geosite:, geoip:, full:, bare host, or CIDR/IP */
  rule: string;
}

/** A named, toggleable bundle of routing rules. */
export interface Preset {
  /** Stable id (used in presets.enabled and the CLI). Not translated. */
  name: string;
  /** Short human title (English source; translated for display). */
  title: string;
  description: string;
  rules: RouteRule[];
}

/** Listen ports for the local inbounds. */
export interface Ports {
  socks: number;
  http: number;
  /** Local gRPC stats API (dokodemo-door). */
  api: number;
}

export const DEFAULT_PORTS: Ports = { socks: 1080, http: 1087, api: 10085 };
