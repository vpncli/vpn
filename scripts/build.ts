#!/usr/bin/env bun
/** Cross-compile self-contained binaries for all supported platforms into dist/. */

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

interface Target {
  /** Bun --target triple. */
  bun: string;
  /** Output file suffix: <os>-<arch>. */
  out: string;
}

const TARGETS: Target[] = [
  { bun: "bun-darwin-arm64", out: "darwin-arm64" },
  { bun: "bun-darwin-x64", out: "darwin-x64" },
  { bun: "bun-linux-x64", out: "linux-x64" },
  { bun: "bun-linux-arm64", out: "linux-arm64" },
];

// Allow building a subset: `bun run scripts/build.ts linux-x64 darwin-arm64`
const wanted = process.argv.slice(2);
const selected = wanted.length ? TARGETS.filter((t) => wanted.includes(t.out)) : TARGETS;

mkdirSync("dist", { recursive: true });

let failed = 0;
for (const t of selected) {
  const outfile = `dist/vpn-${t.out}`;
  process.stdout.write(`▸ building ${outfile} (${t.bun})… `);
  const res = spawnSync(
    "bun",
    ["build", "--compile", `--target=${t.bun}`, "src/cli.tsx", "--outfile", outfile],
    { encoding: "utf8" },
  );
  if (res.status === 0) {
    console.log("ok");
  } else {
    failed++;
    console.log("FAILED");
    console.error(res.stderr || res.stdout);
  }
}

console.log(`\nDone: ${selected.length - failed}/${selected.length} built.`);
process.exit(failed ? 1 : 0);
