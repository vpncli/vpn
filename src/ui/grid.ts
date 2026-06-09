/** Shared card-grid geometry + 2D cursor navigation (dashboard, xray panel, dives). */

import { useEffect, useState } from "react";
import { useInput, type Key } from "ink";

export const CARD_WIDTH = 46;
// Total card box height (Ink's minHeight includes the border). The tallest card
// has 6 content lines — badge + name + subtitle + ip/ping + 2 traffic lines — so
// 6 + 2 border = 8. Reserving it keeps cards the same size and stops jitter as
// live data streams in.
export const CARD_HEIGHT = 8;

/** Terminal column count, kept fresh across SIGWINCH resizes (Ink has no hook). */
export function useTerminalWidth(): number {
  const [cols, setCols] = useState(process.stdout.columns || 80);
  useEffect(() => {
    const onResize = () => setCols(process.stdout.columns || 80);
    process.stdout.on("resize", onResize);
    return () => void process.stdout.off("resize", onResize);
  }, []);
  return cols;
}

/** How many cards fit per row. Slot = 2 (marker) + CARD_WIDTH (box) + 2 (right gap). */
export function columnsFor(width: number): number {
  return Math.max(1, Math.floor(width / (CARD_WIDTH + 4)));
}

/**
 * Rows of focusable indices: `leading` full-width items (each own row), then a
 * `grid` of cards chunked into rows of `columns`, then `trailing` full-width items.
 */
export function gridRows(leading: number, grid: number, trailing: number, columns: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < leading; i++) rows.push([i]);
  for (let i = 0; i < grid; i += columns) {
    rows.push(Array.from({ length: Math.min(columns, grid - i) }, (_, k) => leading + i + k));
  }
  for (let i = 0; i < trailing; i++) rows.push([leading + grid + i]);
  return rows;
}

function findRC(rows: number[][], idx: number): [number, number] {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r]!.indexOf(idx);
    if (c >= 0) return [r, c];
  }
  return [0, 0];
}

export type Dir = "up" | "down" | "left" | "right";

/** Direction from an arrow key OR a WASD key (incl. the same physical keys on the
 *  Russian ЙЦУКЕН layout: ц/ф/ы/в); null for anything else. */
export function arrowDir(
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; leftArrow?: boolean; rightArrow?: boolean },
): Dir | null {
  const c = input.toLowerCase();
  if (key.upArrow || c === "w" || c === "ц") return "up";
  if (key.downArrow || c === "s" || c === "ы") return "down";
  if (key.leftArrow || c === "a" || c === "ф") return "left";
  if (key.rightArrow || c === "d" || c === "в") return "right";
  return null;
}

/**
 * Card-grid cursor + input wiring shared by every grid screen. The component
 * supplies its semantic keys via `onKey` (Enter/Tab/Esc/Backspace — run before
 * movement so it can navigate away); arrow/WASD movement is handled here.
 */
export function useCardNav(
  count: number,
  opts: {
    leading?: number;
    trailing?: number;
    /** Force a column count; auto-fits to the terminal width otherwise. */
    columns?: number;
    onKey?: (input: string, key: Key, cur: number) => void;
  } = {},
): { cur: number; columns: number } {
  const { leading = 0, trailing = 0, onKey } = opts;
  const autoColumns = columnsFor(useTerminalWidth());
  const columns = opts.columns ?? autoColumns;
  const total = leading + count + trailing;
  const rows = gridRows(leading, count, trailing, columns);
  const [sel, setSel] = useState(0);
  const cur = Math.min(sel, Math.max(0, total - 1));

  useInput((input, key) => {
    onKey?.(input, key, cur);
    const d = arrowDir(input, key);
    if (d) setSel((x) => moveSel(rows, Math.min(x, total - 1), d));
  });

  return { cur, columns };
}

/** Next selected index after an arrow press, clamped to the grid shape. */
export function moveSel(rows: number[][], sel: number, dir: Dir): number {
  const [r, c] = findRC(rows, sel);
  if (dir === "left") return rows[r]![Math.max(0, c - 1)]!;
  if (dir === "right") return rows[r]![Math.min(rows[r]!.length - 1, c + 1)]!;
  const nr = Math.max(0, Math.min(rows.length - 1, r + (dir === "down" ? 1 : -1)));
  return rows[nr]![Math.min(c, rows[nr]!.length - 1)]!;
}
