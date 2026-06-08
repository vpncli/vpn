/** Helpers for newline-delimited config files (route lists, enabled presets). */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Read non-empty, non-comment lines (trimmed). Returns [] if the file is missing. */
export function readLines(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

/** Write lines to a file, optionally prefixed with a header comment block. */
export function writeLines(file: string, lines: string[], header?: string): void {
  const body = lines.join("\n");
  const content = header ? `${header.trimEnd()}\n${body}${body ? "\n" : ""}` : `${body}${body ? "\n" : ""}`;
  writeFileSync(file, content);
}
