/** Contract every OS backend implements for system-proxy + app env wiring. */

import type { Ports } from "../core/types.ts";

export interface ProxyEnv {
  httpProxy: string;
  httpsProxy: string;
  allProxy: string;
  noProxy: string;
}

export interface StatusLine {
  label: string;
  ok: boolean;
  value?: string;
}

export interface OsLayer {
  /** Human-readable backend name, e.g. "macOS (networksetup)". */
  readonly name: string;
  /** Enable the system-wide proxy (browsers / GUI apps). */
  proxyOn(ports: Ports, bypass: string[]): void;
  /** Disable the system-wide proxy. */
  proxyOff(): void;
  /** Export proxy vars to GUI apps (launchctl on macOS; no-op on Linux). */
  appSetenv(env: ProxyEnv): void;
  /** Remove the GUI app proxy vars. */
  appUnsetenv(): void;
  /** Extra status rows for the dashboard (e.g. system-proxy enabled?). */
  statusExtras(): StatusLine[];
  /** One-line hint on how to finish setup on this OS. */
  depsHint(): string;
}
