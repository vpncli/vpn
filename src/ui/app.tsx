/** Ink screens exposed as promise-returning helpers the CLI can await. */

import React from "react";
import { Box, render, Text } from "ink";
import { Banner } from "./Banner.tsx";
import { Select, type SelectItem } from "./Select.tsx";
import { MultiSelect, type MultiItem } from "./MultiSelect.tsx";
import { StatusDashboard } from "./StatusDashboard.tsx";
import type { ServerProfile } from "../core/types.ts";

const inkOpts = { exitOnCtrlC: true } as const;

export function pickServer(servers: ServerProfile[], active: string | undefined): Promise<string | undefined> {
  const items: SelectItem<string>[] = servers.map((s) => ({
    label: s.name,
    value: s.name,
    badge: s.name === active ? "★ active" : undefined,
    hint: `${s.address}:${s.port}`,
  }));
  return new Promise((resolve) => {
    const { unmount } = render(
      <Select
        heading="Select active server"
        items={items}
        onSelect={(v) => {
          unmount();
          resolve(v);
        }}
        onCancel={() => {
          unmount();
          resolve(undefined);
        }}
      />,
      inkOpts,
    );
  });
}

export function pickPresets(items: MultiItem<string>[]): Promise<string[] | undefined> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <MultiSelect
        heading="Toggle routing presets"
        items={items}
        onConfirm={(v) => {
          unmount();
          resolve(v);
        }}
        onCancel={() => {
          unmount();
          resolve(undefined);
        }}
      />,
      inkOpts,
    );
  });
}

export function showStatus(withBanner = true): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <Box flexDirection="column">
        {withBanner ? <Banner subtitle="xray VPN manager" /> : null}
        <StatusDashboard
          onDone={() => {
            // Let the final frame flush, then unmount and resolve.
            setTimeout(() => {
              unmount();
              resolve();
            }, 30);
          }}
        />
      </Box>,
      inkOpts,
    );
  });
}

/** Render a one-off message line (used for quick confirmations). */
export function note(message: string, color = "cyan"): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(<Text color={color}>{message}</Text>, inkOpts);
    setTimeout(() => {
      unmount();
      resolve();
    }, 10);
  });
}
