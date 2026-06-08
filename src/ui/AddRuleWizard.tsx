/** Guided rule builder: pick a kind (site/service/country/IP) — no raw syntax needed. */

import React, { useState } from "react";
import { Box, Text } from "ink";
import type { RouteTarget } from "../core/types.ts";
import { Select, type SelectItem } from "./Select.tsx";
import { TextInput } from "./TextInput.tsx";
import { flagEmoji } from "./format.ts";
import { t } from "../core/i18n.ts";

const TARGET_ACTION: Record<RouteTarget, string> = {
  direct: "bypass the VPN",
  proxy: "go through the VPN",
  block: "be blocked",
};

/** Curated geosite categories (present in the standard geosite.dat). */
function services(): SelectItem<string>[] {
  return [
    { label: "🤖 OpenAI / ChatGPT", value: "openai" },
    { label: "🔍 Google", value: "google" },
    { label: "▶️  YouTube", value: "youtube" },
    { label: "🎬 Netflix", value: "netflix" },
    { label: "🎵 Spotify", value: "spotify" },
    { label: "✈️  Telegram", value: "telegram" },
    { label: "🐙 GitHub", value: "github" },
    { label: "𝕏  Twitter / X", value: "twitter" },
    { label: "📘 Facebook / Meta", value: "facebook" },
    { label: "🎮 Discord", value: "discord" },
    { label: "📺 Twitch", value: "twitch" },
    { label: t("🚫 Ads & trackers"), value: "category-ads-all" },
    { label: t("🇷🇺 Russian sites"), value: "category-ru" },
  ];
}

/** Common countries → geoip codes. */
function countries(): SelectItem<string>[] {
  const items: Array<[string, string]> = [
    ["RU", "Russia"],
    ["US", "United States"],
    ["DE", "Germany"],
    ["NL", "Netherlands"],
    ["FI", "Finland"],
    ["GB", "United Kingdom"],
    ["CN", "China"],
    ["JP", "Japan"],
  ];
  return items.map(([cc, name]) => ({ label: `${flagEmoji(cc)} ${t(name)}`, value: cc.toLowerCase() }));
}

/** Strip scheme/www/path so "https://www.youtube.com/x" → "youtube.com". */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]!
    .split("?")[0]!
    .trim();
}

type Step = "kind" | "domain" | "service" | "country" | "ip" | "custom";

export function AddRuleWizard({
  target,
  onAdd,
  onCancel,
}: {
  target: RouteTarget;
  onAdd: (rule: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [step, setStep] = useState<Step>("kind");

  const kinds: SelectItem<Step>[] = [
    { label: t("🌐 Website / domain"), value: "domain", hint: t("e.g. youtube.com") },
    { label: t("📦 Known service"), value: "service", hint: "OpenAI, Netflix, Telegram…" },
    { label: t("🏳  Country"), value: "country", hint: t("all IPs of a country") },
    { label: t("🔢 IP or subnet"), value: "ip", hint: "1.2.3.4 / 10.0.0.0/8" },
    { label: t("⌨  Custom rule"), value: "custom", hint: t("raw xray syntax") },
  ];

  let body: React.JSX.Element;
  switch (step) {
    case "kind":
      body = (
        <Select
          heading={t("What should {action}?", { action: t(TARGET_ACTION[target]) })}
          items={kinds}
          onCancel={onCancel}
          onSelect={(v) => setStep(v)}
        />
      );
      break;
    case "domain":
      body = (
        <Box flexDirection="column">
          <Text bold color="cyan">
            {t("Enter a website")}
          </Text>
          <TextInput
            placeholder="youtube.com"
            onCancel={() => setStep("kind")}
            onSubmit={(v) => {
              const d = normalizeDomain(v);
              if (d) onAdd(`domain:${d}`);
            }}
          />
        </Box>
      );
      break;
    case "service":
      body = (
        <Select heading={t("Pick a service")} items={services()} onCancel={() => setStep("kind")} onSelect={(key) => onAdd(`geosite:${key}`)} />
      );
      break;
    case "country":
      body = (
        <Select heading={t("Pick a country")} items={countries()} onCancel={() => setStep("kind")} onSelect={(cc) => onAdd(`geoip:${cc}`)} />
      );
      break;
    case "ip":
      body = (
        <Box flexDirection="column">
          <Text bold color="cyan">
            {t("Enter an IP or subnet")}
          </Text>
          <TextInput
            placeholder="1.2.3.4 or 10.0.0.0/8"
            onCancel={() => setStep("kind")}
            onSubmit={(v) => {
              if (v.trim()) onAdd(v.trim());
            }}
          />
        </Box>
      );
      break;
    case "custom":
      body = (
        <Box flexDirection="column">
          <Text bold color="cyan">
            {t("Custom rule (xray syntax)")}
          </Text>
          <Text color="gray">geosite:openai · geoip:ru · domain:x.com · regexp:\.ru$</Text>
          <TextInput
            placeholder="geosite:openai"
            onCancel={() => setStep("kind")}
            onSubmit={(v) => {
              if (v.trim()) onAdd(v.trim());
            }}
          />
        </Box>
      );
      break;
  }

  // key per step so Select/TextInput state resets between steps.
  return <Box key={step}>{body}</Box>;
}
