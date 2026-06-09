/** TCP reachability probe: connect time to a host:port (server availability). */

import { Socket } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isDemo, demoPing } from "./demo.ts";

const execFileAsync = promisify(execFile);

/**
 * ICMP round-trip time in milliseconds via the system `ping`, or null if the
 * host doesn't answer (many VPN peers block ICMP). macOS/Linux compatible.
 */
export async function icmpPing(host: string, timeoutSec = 2): Promise<number | null> {
  if (isDemo()) return demoPing(host);
  // macOS uses `-t <sec>` for the timeout; Linux uses `-w <sec>` (`-t` is TTL there).
  const timeoutFlag = process.platform === "darwin" ? "-t" : "-w";
  try {
    const { stdout } = await execFileAsync("ping", ["-c", "1", timeoutFlag, String(timeoutSec), host], {
      timeout: (timeoutSec + 1) * 1000,
    });
    const m = stdout.match(/time[=<]([\d.]+)\s*ms/);
    return m ? Math.round(Number(m[1])) : null;
  } catch {
    return null;
  }
}

/**
 * Measure the TCP handshake time to host:port in milliseconds.
 * Resolves null if the connection fails or times out (server unreachable).
 */
export function tcpPing(host: string, port: number, timeoutMs = 2000): Promise<number | null> {
  if (isDemo()) return Promise.resolve(demoPing(host));
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = new Socket();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(value);
    };

    sock.setTimeout(timeoutMs);
    sock.once("connect", () => finish(Date.now() - start));
    sock.once("timeout", () => finish(null));
    sock.once("error", () => finish(null));
    sock.connect(port, host);
  });
}
