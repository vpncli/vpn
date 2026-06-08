/** Selects the OS backend for the current platform. */

import { darwin } from "./darwin.ts";
import { linux } from "./linux.ts";
import type { OsLayer } from "./types.ts";

export type { OsLayer, ProxyEnv, StatusLine } from "./types.ts";

export function getOs(): OsLayer {
  switch (process.platform) {
    case "darwin":
      return darwin;
    case "linux":
      return linux;
    default:
      throw new Error(`unsupported platform: ${process.platform} (macOS and Linux only)`);
  }
}
