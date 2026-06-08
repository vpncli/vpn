/** Tiny i18n: translate by English source string. English is the built-in default. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirs, paths } from "./paths.ts";
import { ru } from "../i18n/ru.ts";

export type Lang = "en" | "ru";

const DICTS: Record<Lang, Record<string, string>> = { en: {}, ru };

function detect(): Lang {
  if (existsSync(paths.lang)) {
    const v = readFileSync(paths.lang, "utf8").trim();
    if (v === "ru" || v === "en") return v;
  }
  const env = (process.env.VPN_LANG || process.env.LC_ALL || process.env.LANG || "").toLowerCase();
  if (env.startsWith("ru") || env.includes("ru_")) return "ru";
  return "en";
}

let current: Lang = detect();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  ensureDirs();
  writeFileSync(paths.lang, lang + "\n");
}

/**
 * Translate `en` into the current language. Unknown strings fall back to `en`.
 * Supports `{name}`-style interpolation via `params`.
 */
export function t(en: string, params?: Record<string, string | number>): string {
  let s = current === "en" ? en : (DICTS[current][en] ?? en);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}
