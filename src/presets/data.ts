/** Built-in routing presets. Toggle on/off; enabled ones merge into the xray config. */

import type { Preset } from "../core/types.ts";

export const PRESETS: Preset[] = [
  {
    name: "ru-direct",
    title: "Russian sites direct",
    description: "Russian domains & IPs → direct",
    rules: [
      { target: "direct", rule: "geosite:category-ru" },
      { target: "direct", rule: "geoip:ru" },
      { target: "direct", rule: "regexp:\\.ru$" },
      { target: "direct", rule: "regexp:\\.рф$" },
      { target: "direct", rule: "regexp:\\.su$" },
    ],
  },
  {
    name: "ai-via-vpn",
    title: "AI via VPN",
    description: "OpenAI, Claude, Gemini → VPN",
    rules: [
      { target: "proxy", rule: "geosite:openai" },
      { target: "proxy", rule: "domain:anthropic.com" },
      { target: "proxy", rule: "domain:claude.ai" },
      { target: "proxy", rule: "domain:gemini.google.com" },
    ],
  },
  {
    name: "streaming-via-vpn",
    title: "Streaming via VPN",
    description: "Netflix, YouTube, Spotify → VPN",
    rules: [
      { target: "proxy", rule: "geosite:netflix" },
      { target: "proxy", rule: "geosite:youtube" },
      { target: "proxy", rule: "geosite:spotify" },
    ],
  },
  {
    name: "ads-block",
    title: "Block ads",
    description: "Block ads & trackers",
    rules: [{ target: "block", rule: "geosite:category-ads-all" }],
  },
  {
    name: "dev-direct",
    title: "Local & dev direct",
    description: "Localhost & private nets → direct",
    rules: [
      { target: "direct", rule: "regexp:\\.local$" },
      { target: "direct", rule: "geoip:private" },
    ],
  },
];

export function findPreset(name: string): Preset | undefined {
  return PRESETS.find((p) => p.name === name);
}
