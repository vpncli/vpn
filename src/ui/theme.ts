/** Tiny ANSI color helper for non-Ink command output, with TTY/NO_COLOR detection. */

const enabled =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb" &&
  !process.argv.includes("--no-color");

function wrap(open: number, close: number): (s: string | number) => string {
  return (s) => (enabled ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
}

export const c = {
  enabled,
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

/** The brand gradient palette (cyan → magenta), reused by Ink's <Gradient>. */
export const BRAND_GRADIENT = ["#00c6ff", "#7b5cff", "#ff4ecd"];

export const icon = {
  ok: () => c.green("✔"),
  err: () => c.red("✖"),
  warn: () => c.yellow("▲"),
  info: () => c.cyan("ℹ"),
  dot: (on: boolean) => (on ? c.green("●") : c.red("●")),
  arrow: () => c.cyan("▸"),
  star: () => c.yellow("★"),
};

export const ok = (s: string) => console.log(`${icon.ok()} ${s}`);
export const err = (s: string) => console.error(`${icon.err()} ${s}`);
export const warn = (s: string) => console.log(`${icon.warn()} ${s}`);
export const info = (s: string) => console.log(`${icon.info()} ${s}`);
