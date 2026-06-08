/** Parser for `vless://` share links into a normalized {@link ServerProfile}. */

import type { Network, Security, ServerProfile } from "./types.ts";

export class VlessParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VlessParseError";
  }
}

function asSecurity(v: string | null): Security {
  switch (v) {
    case "reality":
      return "reality";
    case "tls":
      return "tls";
    case "none":
    case "":
    case null:
      return "none";
    default:
      throw new VlessParseError(`unsupported security "${v}" (expected reality|tls|none)`);
  }
}

function asNetwork(v: string | null): Network {
  switch (v) {
    case "tcp":
    case "":
    case null:
      return "tcp";
    case "ws":
      return "ws";
    case "grpc":
      return "grpc";
    default:
      throw new VlessParseError(`unsupported transport "${v}" (expected tcp|ws|grpc)`);
  }
}

/** Slugify a fragment/name into a safe profile id usable as a filename. */
export function slugifyName(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "server";
}

/**
 * Parse a `vless://uuid@host:port?params#name` link.
 *
 * @param link  the raw vless:// URL
 * @param fallbackName  used when the link has no #fragment (otherwise the host)
 */
export function parseVless(link: string, fallbackName?: string): ServerProfile {
  const trimmed = link.trim();
  if (!trimmed.startsWith("vless://")) {
    throw new VlessParseError("link must start with vless://");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new VlessParseError("malformed vless:// link");
  }

  const id = decodeURIComponent(url.username);
  if (!id) throw new VlessParseError("missing UUID (expected vless://<uuid>@host:port)");

  const address = url.hostname;
  if (!address) throw new VlessParseError("missing server address");

  const port = Number(url.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new VlessParseError(`invalid port "${url.port}"`);
  }

  const q = url.searchParams;
  const security = asSecurity(q.get("security"));
  const network = asNetwork(q.get("type"));

  const fragment = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
  const name = slugifyName(fragment || fallbackName || address);

  const profile: ServerProfile = {
    name,
    address,
    port,
    id,
    flow: q.get("flow") ?? "",
    encryption: q.get("encryption") ?? "none",
    security,
    network,
    url: trimmed,
  };

  if (security === "reality" || security === "tls") {
    profile.sni = q.get("sni") ?? q.get("host") ?? undefined;
    profile.fingerprint = q.get("fp") ?? "chrome";
  }
  if (security === "reality") {
    const pbk = q.get("pbk");
    if (!pbk) throw new VlessParseError("reality requires pbk (public key)");
    profile.publicKey = pbk;
    profile.shortId = q.get("sid") ?? "";
    profile.spiderX = q.get("spx") ?? "/";
  }
  if (network === "ws") {
    profile.host = q.get("host") ?? undefined;
    profile.path = q.get("path") ?? "/";
  }
  if (network === "grpc") {
    profile.serviceName = q.get("serviceName") ?? "";
  }

  return profile;
}
