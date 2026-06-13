#!/usr/bin/env bun
/**
 * Seed a throwaway demo config for the README GIFs. Writes fake xray servers +
 * routes + presets under $XDG_CONFIG_HOME/vpn (default /tmp/vpndemo). Combined
 * with `VPN_DEMO=1` (canned IP/geo/ping/traffic, see src/core/demo.ts), a vhs
 * recording never touches the network or shows a real server.
 *
 *   XDG_CONFIG_HOME=/tmp/vpndemo bun scripts/demo-seed.ts
 *
 * All addresses are RFC 5737 documentation ranges.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.env.XDG_CONFIG_HOME ?? "/tmp/vpndemo", "vpn");
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "servers"), { recursive: true });
mkdirSync(join(root, "routes"), { recursive: true });

const server = (
  name: string,
  address: string,
  sni: string,
  extra: { subscription?: string; countryCode?: string } = {},
) => ({
  name,
  address,
  port: 443,
  id: "00000000-0000-4000-8000-000000000000",
  flow: "xtls-rprx-vision",
  encryption: "none",
  security: "reality",
  network: "tcp",
  sni,
  fingerprint: "chrome",
  publicKey: "demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO000",
  shortId: "01ab",
  ...extra,
});

// A couple of loose (manually-added) servers…
const loose = [
  server("amsterdam", "192.0.2.20", "www.microsoft.com"),
  server("tokyo", "192.0.2.30", "www.apple.com"),
];

// …plus a whole subscription, fetched without any vendor app — each server keeps
// the country flag from the provider's label (countryCode) and groups under "official-vpn".
const SUB = "official-vpn";
const subServers = [
  server("germany", "192.0.2.40", "www.google.com", { subscription: SUB, countryCode: "DE" }),
  server("finland", "192.0.2.41", "www.cloudflare.com", { subscription: SUB, countryCode: "FI" }),
  server("usa", "192.0.2.42", "www.apple.com", { subscription: SUB, countryCode: "US" }),
  server("netherlands", "192.0.2.43", "www.microsoft.com", { subscription: SUB, countryCode: "NL" }),
  server("japan", "192.0.2.44", "www.wikipedia.org", { subscription: SUB, countryCode: "JP" }),
  server("france", "192.0.2.45", "www.mozilla.org", { subscription: SUB, countryCode: "FR" }),
];

for (const s of [...loose, ...subServers]) {
  writeFileSync(join(root, "servers", `${s.name}.json`), JSON.stringify(s, null, 2));
}

writeFileSync(
  join(root, "subscriptions.json"),
  JSON.stringify(
    [{ name: SUB, url: "https://provider.example/sub/DEMO", servers: subServers.map((s) => s.name), updatedAt: "2026-06-14T12:00:00.000Z" }],
    null,
    2,
  ) + "\n",
);

writeFileSync(join(root, "active"), "amsterdam\n");
writeFileSync(join(root, "routes", "direct.list"), "geosite:category-ru\ndomain:gov.ru\n10.0.0.0/8\n");
writeFileSync(join(root, "routes", "proxy.list"), "geosite:openai\ndomain:netflix.com\n");
writeFileSync(join(root, "routes", "block.list"), "geosite:category-ads\n");
writeFileSync(join(root, "presets.enabled"), "ru-direct\nai-via-vpn\n");
writeFileSync(join(root, "lang"), "en\n");

console.log(`seeded demo config at ${root}`);
