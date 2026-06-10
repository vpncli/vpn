/** Pretty `vpn help` screen (Ink) with a plain-text fallback for non-TTY/pipes. */

import React from "react";
import { Box, render, Text } from "ink";
import { Banner } from "./Banner.tsx";
import { c } from "./theme.ts";

interface HelpItem {
  usage: string;
  desc: string;
}

interface HelpSection {
  icon: string;
  title: string;
  /** Ink color name, also used for the ANSI fallback. */
  accent: "cyan" | "green" | "magenta" | "yellow" | "blue";
  items: HelpItem[];
}

const TAGLINE = "manage every VPN from your terminal";

const QUICK_START = ["vpn add vless://…", "vpn on", "vpn preset", "vpn status"];

export const HELP_SECTIONS: HelpSection[] = [
  {
    icon: "🔌",
    title: "Lifecycle",
    accent: "cyan",
    items: [
      { usage: "vpn", desc: "interactive menu + dashboard" },
      { usage: "on / off / restart", desc: "start · stop · restart everything" },
      { usage: "status", desc: "live status dashboard" },
      { usage: "ip · log [N] · init", desc: "show IPs · tail log · shell auto-source" },
    ],
  },
  {
    icon: "🌐",
    title: "Servers",
    accent: "green",
    items: [
      { usage: "add <vless://…> [name]", desc: "add a server from a share link" },
      { usage: "ls", desc: "list servers (★ = active)" },
      { usage: "use [name]", desc: "switch active server (picker if no name)" },
      { usage: "show [name] · rm [name]", desc: "details · remove" },
    ],
  },
  {
    icon: "🛡",
    title: "Tunnels",
    accent: "blue",
    items: [
      { usage: "services", desc: "list detected VPNs (● = connected)" },
      { usage: "connect <name>", desc: "connect an app-VPN (Check Point prompts for password + OTP)" },
      { usage: "disconnect <name>|all", desc: "disconnect one or everything" },
    ],
  },
  {
    icon: "🧭",
    title: "Routing",
    accent: "magenta",
    items: [
      { usage: "route ls", desc: "show direct / proxy / block lists" },
      { usage: "route add <t> <rule>", desc: "t = direct | proxy | block" },
      { usage: "route rm <t> <rule>", desc: "remove a rule" },
      { usage: "route edit", desc: "open the lists in $EDITOR" },
    ],
  },
  {
    icon: "✨",
    title: "Presets",
    accent: "yellow",
    items: [
      { usage: "preset ls", desc: "list presets (◉ = enabled)" },
      { usage: "preset on [name…]", desc: "enable (picker if no name)" },
      { usage: "preset off [name…]", desc: "disable presets" },
    ],
  },
];

const RULES_HINT = "geosite:openai · geoip:ru · domain:example.com · regexp:\\.ru$ · 10.0.0.0/8";

/** Width of the usage column, derived from the longest usage string. */
const USAGE_WIDTH = Math.max(...HELP_SECTIONS.flatMap((s) => s.items.map((i) => i.usage.length))) + 2;

function Section({ section }: { section: HelpSection }): React.JSX.Element {
  return (
    <Box
      flexDirection="column"
      alignSelf="flex-start"
      borderStyle="round"
      borderColor={section.accent}
      paddingX={1}
    >
      <Text bold color={section.accent}>
        {section.icon} {section.title}
      </Text>
      {section.items.map((item, i) => (
        <Box key={i}>
          <Box width={USAGE_WIDTH}>
            <Text color={section.accent}>{item.usage}</Text>
          </Box>
          <Text color="gray">{item.desc}</Text>
        </Box>
      ))}
    </Box>
  );
}

function HelpScreen(): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Banner subtitle={TAGLINE} />

      <Box marginBottom={1}>
        <Text color="yellow">⚡ Quick start  </Text>
        <Text color="gray">{QUICK_START.map((q) => `$ ${q}`).join("   ")}</Text>
      </Box>

      {HELP_SECTIONS.map((section, i) => (
        <Section key={i} section={section} />
      ))}

      <Box marginTop={1} alignSelf="flex-start">
        <Text color="gray">
          Rules: <Text dimColor>{RULES_HINT}</Text>
        </Text>
      </Box>
    </Box>
  );
}

/** Render the pretty help screen, then resolve once it has flushed. */
export function showHelp(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(<HelpScreen />, { exitOnCtrlC: true });
    setTimeout(() => {
      unmount();
      resolve();
    }, 30);
  });
}

/** Plain-text help for non-TTY output (pipes, NO_COLOR). Shares HELP_SECTIONS. */
export function plainHelp(): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${c.bold("vpn")} — ${TAGLINE}`);
  lines.push("");
  lines.push(`  Quick start: ${QUICK_START.map((q) => `$ ${q}`).join("   ")}`);
  for (const s of HELP_SECTIONS) {
    lines.push("");
    lines.push(`  ${s.icon} ${c.bold(s.title)}`);
    for (const item of s.items) {
      lines.push(`    ${item.usage.padEnd(USAGE_WIDTH)}${c.gray(item.desc)}`);
    }
  }
  lines.push("");
  lines.push(`  Rule syntax: ${RULES_HINT}`);
  lines.push("");
  return lines.join("\n");
}
