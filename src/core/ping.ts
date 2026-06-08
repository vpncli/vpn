/** TCP reachability probe: connect time to a host:port (server availability). */

import { Socket } from "node:net";

/**
 * Measure the TCP handshake time to host:port in milliseconds.
 * Resolves null if the connection fails or times out (server unreachable).
 */
export function tcpPing(host: string, port: number, timeoutMs = 2000): Promise<number | null> {
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
