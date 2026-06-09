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

const server = (name: string, address: string, sni: string) => ({
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
});

const servers = [
  server("amsterdam", "192.0.2.20", "www.microsoft.com"),
  server("frankfurt", "192.0.2.10", "www.cloudflare.com"),
  server("tokyo", "192.0.2.30", "www.apple.com"),
];
for (const s of servers) writeFileSync(join(root, "servers", `${s.name}.json`), JSON.stringify(s, null, 2));

writeFileSync(join(root, "active"), "amsterdam\n");
writeFileSync(join(root, "routes", "direct.list"), "geosite:category-ru\ndomain:gov.ru\n10.0.0.0/8\n");
writeFileSync(join(root, "routes", "proxy.list"), "geosite:openai\ndomain:netflix.com\n");
writeFileSync(join(root, "routes", "block.list"), "geosite:category-ads\n");
writeFileSync(join(root, "presets.enabled"), "ru-direct\nai-via-vpn\n");
writeFileSync(join(root, "lang"), "en\n");

console.log(`seeded demo config at ${root}`);
