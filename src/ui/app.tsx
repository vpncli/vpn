/** Ink screens exposed as promise-returning helpers the CLI can await. */

import React from "react";
import { Box, render } from "ink";
import { Banner } from "./Banner.tsx";
import { CardSelect, type CardOption } from "./CardSelect.tsx";
import { CheckpointConnectForm } from "./CheckpointForm.tsx";
import { StatusDashboard } from "./StatusDashboard.tsx";
import type { ServerProfile } from "../core/types.ts";
import type { Service, Creds } from "../core/services.ts";

const inkOpts = { exitOnCtrlC: true } as const;

export function pickServer(servers: ServerProfile[], active: string | undefined): Promise<string | undefined> {
  const items: CardOption<string>[] = servers.map((s) => ({
    label: s.name,
    value: s.name,
    badge: s.name === active ? "★" : undefined,
    description: `${s.address}:${s.port}`,
    color: s.name === active ? "green" : undefined,
  }));
  return new Promise((resolve) => {
    const { unmount } = render(
      <CardSelect
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

export function pickPresets(items: CardOption<string>[]): Promise<string[] | undefined> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <CardSelect
        heading="Toggle routing presets"
        items={items}
        multi
        minHeight={4}
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

/** Prompt for Check Point credentials (username → password → OTP) from the CLI. */
export function promptCheckpoint(service: Service): Promise<Creds | null> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <CheckpointConnectForm
        service={service}
        onSubmit={(creds) => {
          unmount();
          resolve(creds);
        }}
        onCancel={() => {
          unmount();
          resolve(null);
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
        {withBanner ? <Banner /> : null}
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
