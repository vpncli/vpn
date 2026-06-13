#!/usr/bin/env bun
/** vpn entrypoint: parse argv (meow) and dispatch to commands or the Ink TUI. */

import meow from "meow";
import pkg from "../package.json";
import { ensureDirs } from "./core/paths.ts";
import { err } from "./ui/theme.ts";
import type { RouteTarget } from "./core/types.ts";
import {
  applyChange,
  cmdAdd,
  cmdConnect,
  cmdDisconnect,
  cmdInit,
  cmdIp,
  cmdList,
  cmdLog,
  cmdOff,
  cmdOn,
  cmdServices,
  cmdPresetLs,
  cmdPresetOff,
  cmdPresetOn,
  cmdRegen,
  cmdRemove,
  cmdRestart,
  cmdRouteAdd,
  cmdRouteEdit,
  cmdRouteLs,
  cmdRouteRm,
  cmdShow,
  cmdSubAdd,
  cmdSubLs,
  cmdSubRename,
  cmdSubRm,
  cmdSubUpdate,
  cmdUse,
  runHelp,
} from "./commands.ts";
import { getLang, setLang } from "./core/i18n.ts";
import { CHECK_ENV, maybeScheduleCheck, notifyUpdate, runUpdateCheck } from "./core/update.ts";
import { getActive, listServers } from "./core/servers.ts";
import { listPresets, setEnabled } from "./core/presets.ts";
import { pickPresets, pickServer, showStatus } from "./ui/app.tsx";
import { runApp } from "./ui/InteractiveApp.tsx";

const cli = meow(
  `
  Usage
    $ vpn [command]

  Run without a command for the interactive menu. See 'vpn help' for all commands.
`,
  {
    importMeta: import.meta,
    // Pass the version explicitly: `import.meta`-based lookup fails inside the
    // bun-compiled single binary, so `vpn --version` would otherwise be empty.
    version: pkg.version,
    flags: {
      // Check Point credentials for non-interactive `vpn connect`.
      user: { type: "string" },
      password: { type: "string" },
      otp: { type: "string" },
    },
  },
);

const ROUTE_TARGETS: RouteTarget[] = ["direct", "proxy", "block"];

function isRouteTarget(s: string | undefined): s is RouteTarget {
  return s !== undefined && (ROUTE_TARGETS as string[]).includes(s);
}

async function useFlow(name?: string): Promise<void> {
  if (name) return cmdUse(name);
  const servers = listServers();
  if (servers.length === 0) return cmdList();
  const picked = await pickServer(servers, getActive());
  if (picked) cmdUse(picked);
}

async function rmFlow(name?: string): Promise<void> {
  if (name) return cmdRemove(name);
  const servers = listServers();
  if (servers.length === 0) return cmdList();
  const picked = await pickServer(servers, getActive());
  if (picked) cmdRemove(picked);
}

async function presetPickFlow(): Promise<void> {
  const items = listPresets().map((p) => ({
    label: p.name,
    value: p.name,
    description: p.description,
    selected: p.enabled,
  }));
  const selected = await pickPresets(items);
  if (selected === undefined) return; // cancelled
  setEnabled(selected);
  applyChange();
}

function routeDispatch(sub?: string, target?: string, rule?: string): void {
  if (!sub || sub === "ls" || sub === "list") return cmdRouteLs();
  if (sub === "edit") return cmdRouteEdit();
  if (sub === "add" || sub === "rm" || sub === "remove") {
    if (!isRouteTarget(target)) {
      err(`route ${sub} needs a target: direct | proxy | block`);
      process.exitCode = 1;
      return;
    }
    if (!rule) {
      err(`route ${sub} ${target} needs a rule (e.g. geosite:openai)`);
      process.exitCode = 1;
      return;
    }
    return sub === "add" ? cmdRouteAdd(target, rule) : cmdRouteRm(target, rule);
  }
  err(`unknown route subcommand "${sub}"`);
  process.exitCode = 1;
}

async function presetDispatch(sub: string | undefined, names: string[]): Promise<void> {
  if (!sub) return presetPickFlow();
  if (sub === "ls" || sub === "list") return cmdPresetLs();
  if (sub === "on") return names.length ? cmdPresetOn(names) : presetPickFlow();
  if (sub === "off") return names.length ? cmdPresetOff(names) : presetPickFlow();
  err(`unknown preset subcommand "${sub}"`);
  process.exitCode = 1;
}

async function subDispatch(sub?: string, arg?: string, arg2?: string): Promise<void> {
  if (!sub) {
    err("usage: vpn sub add <url> [name] · ls · update [name] · rm <name>");
    process.exitCode = 1;
    return;
  }
  if (sub === "ls" || sub === "list") return cmdSubLs();
  if (sub === "update" || sub === "refresh") return cmdSubUpdate(arg);
  if (sub === "rm" || sub === "remove") {
    if (!arg) {
      err("usage: vpn sub rm <name>");
      process.exitCode = 1;
      return;
    }
    return cmdSubRm(arg);
  }
  if (sub === "rename" || sub === "mv") {
    if (!arg || !arg2) {
      err("usage: vpn sub rename <name> <new-name>");
      process.exitCode = 1;
      return;
    }
    return cmdSubRename(arg, arg2);
  }
  if (sub === "add") {
    if (!arg) {
      err("usage: vpn sub add <url> [name]");
      process.exitCode = 1;
      return;
    }
    return cmdSubAdd(arg, arg2);
  }
  // `vpn sub <url> [name]` — no subcommand, treat the first arg as the URL.
  return cmdSubAdd(sub, arg);
}

async function main(): Promise<void> {
  // Detached background refresh of the update cache (see core/update.ts): do the
  // network fetch and exit before touching anything else.
  if (process.env[CHECK_ENV] === "1") {
    await runUpdateCheck();
    return;
  }

  ensureDirs();
  // Kick off a (throttled, non-blocking) background check for the next run.
  maybeScheduleCheck();
  const [cmd, a, b, d] = cli.input;

  switch (cmd) {
    case undefined:
    case "menu":
      await runApp();
      break;

    case "on":
      cmdOn();
      break;
    case "off":
      cmdOff();
      break;
    case "restart":
      cmdRestart();
      break;

    case "services":
    case "svc":
      cmdServices();
      break;
    case "connect":
      if (!a) {
        err("usage: vpn connect <service>   (run `vpn services` to list names)");
        process.exitCode = 1;
      } else {
        await cmdConnect(a, cli.flags);
      }
      break;
    case "disconnect":
      await cmdDisconnect(a);
      break;
    case "status":
      await showStatus();
      break;
    case "ip":
      cmdIp();
      break;
    case "log":
      cmdLog(a ? Number(a) : undefined);
      break;
    case "init":
      cmdInit();
      break;
    case "regen":
      cmdRegen();
      break;

    case "add":
      if (!a) {
        err("usage: vpn add <vless://...> [name]   ·   vpn add <subscription-url>");
        process.exitCode = 1;
      } else if (a.startsWith("vless://")) {
        cmdAdd(a, b);
      } else {
        // Not a vless link → treat as a subscription URL / app deep-link.
        await cmdSubAdd(a, b);
      }
      break;
    case "sub":
    case "subscription":
    case "subscriptions":
      await subDispatch(a, b, d);
      break;
    case "ls":
    case "servers":
      cmdList();
      break;
    case "use":
      await useFlow(a);
      break;
    case "show":
      cmdShow(a);
      break;
    case "rm":
    case "remove":
      await rmFlow(a);
      break;

    case "route":
      routeDispatch(a, b, d);
      break;
    case "preset":
    case "presets":
      await presetDispatch(a, cli.input.slice(2));
      break;

    case "lang":
      if (a === "en" || a === "ru") {
        setLang(a);
        console.log(`language set to ${a}`);
      } else {
        console.log(`language: ${getLang()}  (use: vpn lang en|ru)`);
      }
      break;

    case "help":
      await runHelp();
      break;

    default:
      err(`unknown command "${cmd}"`);
      await runHelp();
      process.exitCode = 1;
  }

  // After the command's own output: surface a pending update, if any.
  notifyUpdate(pkg.version);
}

main().catch((e) => {
  err((e as Error).message);
  process.exitCode = 1;
});
