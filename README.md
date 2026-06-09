<h1 align="center">vpn</h1>

<p align="center">
  A friendly terminal app for <a href="https://github.com/XTLS/Xray-core">xray</a> VPN —
  add servers from <code>vless://</code> links, switch with a keypress, and shape routing
  with simple presets. Live traffic, ping, country flags, and a one-tap on/off button.
</p>

<p align="center">
  <a href="https://github.com/vpncli/vpn/actions/workflows/release.yml"><img src="https://github.com/vpncli/vpn/actions/workflows/release.yml/badge.svg" alt="Build status"></a>
  <a href="https://github.com/vpncli/vpn/releases/latest"><img src="https://img.shields.io/github/v/release/vpncli/vpn?style=flat-square&label=version&labelColor=1f2836&color=34d399&cacheSeconds=3600" alt="Latest version"></a>
  <a href="https://github.com/vpncli/vpn/releases"><img src="https://img.shields.io/github/downloads/vpncli/vpn/total?style=flat-square&labelColor=1f2836&color=38bdf8&cacheSeconds=3600" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-1f2836?style=flat-square" alt="Platform: macOS | Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f2836?style=flat-square" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://vpncli.cc"><strong>vpncli.cc</strong></a> ·
  <a href="#install">Install</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/images/overview.gif" alt="vpn main screen" width="760">
</p>

---

## Features

- 🟢 **One-tap on/off** — a big focusable toggle; the whole app is a few keystrokes
- 🌍 **Live dashboard** — active server with country flag, ping, and per-channel traffic (VPN vs direct)
- 🗂 **Server profiles** — paste a `vless://` link, name it, switch instantly; cards show flag + availability ping
- 🧭 **Intuitive routing** — a guided wizard (no xray syntax to memorize) + toggleable presets
- 🌐 **Bilingual UI** — English / Русский, switch live
- 📦 **Self-contained binary** — no Node, no jq; the only runtime dependency is `xray`
- 🖥 **macOS & Ubuntu** — system proxy wired automatically (networksetup / GNOME gsettings)

## Install

**macOS (Homebrew)**
```sh
brew install vpncli/tap/vpn       # pulls in xray automatically
```

**Ubuntu 22.04+ (apt)**
```sh
curl -fsSL https://vpncli.github.io/vpn/key.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/vpn.gpg
echo "deb [signed-by=/etc/apt/keyrings/vpn.gpg] https://vpncli.github.io/vpn stable main" \
  | sudo tee /etc/apt/sources.list.d/vpn.list
sudo apt-get update && sudo apt-get install vpn
# xray is not in Ubuntu's repos — install it once:
bash -c "$(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh)"
```

**Any platform (curl)**
```sh
curl -fsSL https://raw.githubusercontent.com/vpncli/vpn/main/install.sh | bash
```

## Quick start

```sh
vpn add vless://...your-link...   # add & activate a server
vpn on                            # connect
vpn                               # open the interactive app
vpn off                           # disconnect
```

## The app

Run `vpn` with no arguments. The power button is selected by default — press **Enter** to connect.
When the VPN is off, only the toggle and Quit are shown; when it's on, you get the live dashboard.

### Servers

Each server is a card with its country flag and a live availability ping. Add one from a `vless://`
share link and give it a name — switch between them, rename, or remove, all from the app.

<p align="center">
  <img src="docs/images/servers.gif" alt="server list with flags and ping" width="760">
</p>

### Routing

Decide what skips the VPN, what's forced through it, and what's blocked — without learning xray
syntax. The **Add rule** wizard walks you through it: a website, a known service (OpenAI, Netflix,
Telegram…), a whole country, or an IP/subnet.

<p align="center">
  <img src="docs/images/routing.gif" alt="guided routing rule wizard" width="760">
</p>

Every rule goes to one of three buckets:

- **direct** — bypass the VPN (e.g. local sites, corporate hosts)
- **proxy** — force through the VPN (e.g. a service blocked in your region)
- **block** — drop it (ads / trackers)

Precedence is **block → proxy → direct**, then private/localhost always go direct, and anything
unmatched goes through the VPN. Prefer ready-made bundles? Toggle **presets** (`ru-direct`,
`ai-via-vpn`, `streaming-via-vpn`, `ads-block`, `dev-direct`).

### Languages

Switch the whole interface between English and Русский on the fly.

<p align="center">
  <img src="docs/images/language.gif" alt="switching language English and Russian" width="760">
</p>

## Commands

Everything in the app is also a plain command:

| | |
|---|---|
| `vpn` | interactive app |
| `vpn on` · `off` · `restart` | connect / disconnect / reconnect |
| `vpn status` · `ip` · `log [N]` | live status · IPs · last log lines |
| `vpn add <vless://…> [name]` | add a server |
| `vpn ls` · `use [name]` · `show [name]` · `rm [name]` | manage servers |
| `vpn route ls` · `route add\|rm direct\|proxy\|block <rule>` · `route edit` | edit routing |
| `vpn preset ls` · `preset on\|off [name…]` | toggle presets |
| `vpn lang en\|ru` | set language |
| `vpn init` | auto-source the proxy env in new terminals |

## Configuration

State lives under `~/.config/vpn/`:

```
servers/<name>.json   parsed server profiles
routes/{direct,proxy,block}.list   your routing lists
presets.enabled       enabled presets
active                active server name
lang                  ui language (en|ru)
dns.json              OPTIONAL — override the DNS block (e.g. split-DNS to an internal resolver)
config.json           GENERATED xray config (don't edit by hand)
```

Need internal/corporate routing? Keep it out of any shared config: add hosts with
`vpn route add direct <rule>`, set extra proxy-bypass hosts via `VPN_EXTRA_BYPASS`, and point
internal domains at an internal resolver with a `dns.json`.

---

## Contributing

The app is TypeScript + [Ink](https://github.com/vadimdemedes/ink), bundled to a single binary by
[Bun](https://bun.sh).

### Setup

```sh
git clone git@github.com:vpncli/vpn.git && cd vpn
curl -fsSL https://bun.sh/install | bash   # if you don't have Bun
bun install

bun run dev -- status        # run from source
bun run typecheck            # tsc --noEmit
bun run build                # cross-compile dist/vpn-<os>-<arch> for all platforms
```

### Project layout

```
src/
  cli.tsx           argv parsing (meow) → command or the Ink app
  core/             pure logic: vless parsing, config generation, servers, routes,
                    presets, xray control, ping, geo, i18n  (no UI imports)
  os/               platform backends: darwin (networksetup+launchctl), linux (gsettings)
  ui/               Ink components: InteractiveApp, TrafficPanel, ServerCards, wizards…
  i18n/ru.ts        Russian translations (keyed by the English source string)
scripts/            build (cross-compile), build-deb, publish-apt
Formula/vpn.rb      Homebrew formula
debian/, packaging/ Debian package files
docs/               GitHub Pages = APT repo; images/ + tapes/ for the README GIFs
```

Adding a user-facing string? Wrap it with `t("English text")` and add the Russian to
`src/i18n/ru.ts`. The config generator (`src/core/config.ts`) is pure and validated with
`xray -test` before anything is applied.

### README GIFs

The demos are scripted with [vhs](https://github.com/charmbracelet/vhs) (tapes in
`docs/tapes/`). They run against a throwaway demo config, so no real server is ever shown:

```sh
brew install vhs
XDG_CONFIG_HOME=/tmp/vpndemo vhs docs/tapes/overview.tape
```

### Releasing

Tag a version and CI does the rest — builds the binaries, creates a GitHub Release, publishes the
`.deb`s and the signed APT repo to Pages, and patches the Homebrew formula:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

See `.github/workflows/release.yml`. The APT repo needs `GPG_PRIVATE_KEY` / `GPG_KEY` repo secrets;
the Homebrew formula lives in the `vpncli/homebrew-tap` repo.

## License

MIT
