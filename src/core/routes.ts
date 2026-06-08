/** User-defined routing lists (direct / proxy / block). */

import { paths } from "./paths.ts";
import { readLines, writeLines } from "./lines.ts";
import type { RouteRule, RouteTarget } from "./types.ts";

const FILE: Record<RouteTarget, string> = {
  direct: paths.directList,
  proxy: paths.proxyList,
  block: paths.blockList,
};

const HEADER: Record<RouteTarget, string> = {
  direct: "# Domains/IPs that BYPASS the VPN (go direct). One rule per line.\n# e.g. geosite:category-ru, regexp:\\.ru$, domain:example.com, 10.0.0.0/8",
  proxy: "# Domains/IPs FORCED through the VPN. One rule per line.\n# e.g. geosite:openai, domain:example.com",
  block: "# Domains/IPs to BLOCK (blackhole). One rule per line.\n# e.g. geosite:category-ads-all, domain:ads.example.com",
};

export function readList(target: RouteTarget): string[] {
  return readLines(FILE[target]);
}

export function addRule(target: RouteTarget, rule: string): boolean {
  const r = rule.trim();
  if (!r) throw new Error("empty rule");
  const current = readList(target);
  if (current.includes(r)) return false;
  writeLines(FILE[target], [...current, r], HEADER[target]);
  return true;
}

export function removeRule(target: RouteTarget, rule: string): boolean {
  const r = rule.trim();
  const current = readList(target);
  if (!current.includes(r)) return false;
  writeLines(FILE[target], current.filter((x) => x !== r), HEADER[target]);
  return true;
}

/** Ensure all three list files exist (with header comments) for `vpn route edit`. */
export function ensureListFiles(): void {
  for (const target of ["direct", "proxy", "block"] as RouteTarget[]) {
    writeLines(FILE[target], readList(target), HEADER[target]);
  }
}

export function fileFor(target: RouteTarget): string {
  return FILE[target];
}

/** All user-defined rules across the three lists. */
export function userRules(): RouteRule[] {
  return (["direct", "proxy", "block"] as RouteTarget[]).flatMap((target) =>
    readList(target).map((rule) => ({ target, rule })),
  );
}
