<h1 align="center">vpncli</h1>

<p align="center">
  <strong>Manage every VPN from your terminal.</strong><br>
  One dashboard for your xray proxy <em>and</em> every full-tunnel VPN on the
  machine — WireGuard, Outline, OpenVPN, v2RayTun, Happ, Check Point… Auto-detected,
  grouped into cards, each with a live flag, ping and traffic, connect/disconnect with a keypress.
</p>

<p align="center">
  <a href="https://github.com/vpncli/vpn/actions/workflows/release.yml"><img src="https://github.com/vpncli/vpn/actions/workflows/release.yml/badge.svg" alt="Build status"></a>
  <a href="https://github.com/vpncli/vpn/releases/latest"><img src="https://img.shields.io/github/v/release/vpncli/vpn?style=flat-square&label=version&labelColor=1f2836&color=34d399&cacheSeconds=300&v=2" alt="Latest version"></a>
  <a href="https://github.com/vpncli/vpn/releases"><img src="https://img.shields.io/github/downloads/vpncli/vpn/total?style=flat-square&labelColor=1f2836&color=38bdf8&cacheSeconds=300&v=2" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-1f2836?style=flat-square" alt="Platform: macOS | Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f2836?style=flat-square" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://vpncli.cc"><strong>vpncli.cc</strong></a> ·
  <a href="#install">Install</a> ·
  <a href="mailto:info@vpncli.cc">info@vpncli.cc</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/images/dashboard.gif" alt="vpncli dashboard" width="820">
</p>

---

## The trick: a full-tunnel VPN **and** xray, at the same time

Most VPNs are **full tunnels** (WireGuard, Outline, OpenVPN, Check Point…). They rewrite the OS
routing table and grab the *single* default route, so **all** traffic goes through them — and only
**one** can be active at a time (they fight over that one default route).

**xray is different.** It's a local SOCKS/HTTP **proxy**: apps opt in (system proxy + env), and xray
routes each connection **by rules** — this domain direct, that one through your server, ads blocked.
It never touches the routing table, so it **coexists** with anything.

So you can keep your **work VPN** up (say corporate Check Point or WireGuard, tunnelling everything to
the office) **and** run a flexibly-routed **xray** on top — AI through your own server, Russian sites
direct, the rest following the corporate tunnel. `vpncli` manages both from one screen:

- full tunnels are **mutually exclusive** — connect one and it drops the others for you;
- **xray always layers on top** — it's a proxy, it coexists;
- every service is a card, tagged **`🌐 ALL TRAFFIC` (tunnel)** or **`⚡ BY RULES` (proxy)** so you
  always know what grabs what.

## Features

- 🧩 **Every VPN, one dashboard** — xray servers + full-tunnel app-VPNs, auto-detected and grouped by type
- 🌐 **Tunnel vs proxy, clearly marked** — full tunnels capture all traffic; xray routes by rules and coexists
- 🔌 **Connect / disconnect anything** — each service is a card; a master **Disconnect all** up top
- 📊 **Live everything** — country flag, ping, and live up/down traffic per service
- 🧭 **xray routing without the syntax** — a guided wizard + toggleable presets (direct / proxy / block)
- ⌨️ **Keyboard-native** — arrows **or WASD** (incl. ЙЦУКЕН ц/ф/ы/в), **Tab** to dive in, **Enter** to act
- 🌍 **Bilingual** — English / Русский, switched live
- 📦 **Self-contained binary** — no Node, no jq; only the xray *proxy* needs the `xray` binary
- 🖥 **macOS & Linux** — app-VPN detection via `scutil` / Check Point `trac` (macOS) and NetworkManager (Linux)

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
# xray is only needed for the xray proxy — install it once if you want one:
bash -c "$(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh)"
```

**Any platform (curl)**
```sh
curl -fsSL https://raw.githubusercontent.com/vpncli/vpn/main/install.sh | bash
```

## Quick start

```sh
vpn                               # open the dashboard — manage everything from here
vpn add vless://...your-link...   # add & activate an xray server (or do it in the app)
vpn on                            # turn the xray proxy on
vpn off                           # turn it off
```

No xray server yet? Just run `vpn` — the big button becomes **+ Add xray server** and walks you
through pasting a `vless://` link, right from the interface.

## The app

Run `vpn` with no arguments. Every detected VPN service is a card, grouped by type. The **power
button** up top adapts to your state:

| state | button | Enter |
|---|---|---|
| something connected | **⏻ Disconnect all** | drops every tunnel + xray |
| all off, xray configured | **⏻ Enable `<server>`** | turns the xray proxy on |
| all off, nothing configured | **+ Add xray server** | opens the add-server form |

### Navigating

- **↑ ↓ ← →** or **WASD** (and the same physical keys on the Russian ЙЦУКЕН layout — `ц/ф/ы/в`)
  move between cards
- **Enter** performs the card's action — connect / disconnect / switch
- **Tab** dives *in*: the xray card opens its full panel; a multi-profile app expands its members;
  **Settings** opens with Tab too
- **Backspace** removes (e.g. a routing rule — so Enter never deletes by accident)
- **q / Esc** go back / quit

### Detected services

| Source | Detected | Control |
|---|---|---|
| **xray** (ours) | every server profile | turn on/off, switch server, per-rule routing, live traffic |
| **macOS app-VPNs** (`scutil`) | WireGuard, Outline, v2RayTun, Happ… | connect / disconnect (falls back to opening the app) |
| **Check Point** (`trac`) | the corporate Endpoint Security tunnel | connect with **password + OTP** in-app, or disconnect |
| **Linux** (NetworkManager) | WireGuard, OpenVPN/OpenConnect… connections | `nmcli` up / down |

Each up service shows its country flag (geo of the exit IP), latency, and live ↑/↓ traffic.

### The xray panel

**Tab** into the xray card for a focused panel: your real vs VPN IP up top, every server as a card
(Enter switches, Tab edits/renames/removes), and a **Routing** widget.

<p align="center">
  <img src="docs/images/xray-panel.gif" alt="xray panel: real/VPN IP and server cards with flags + ping" width="820">
</p>

### Routing (xray)

Decide what skips the proxy, what's forced through it, and what's blocked — without learning xray
syntax. The **Add rule** wizard walks you through it: a website, a known service (OpenAI, Netflix,
Telegram…), a whole country, or an IP/subnet. Each rule lands in one of three buckets:

- **direct** — bypass the proxy (local sites, corporate hosts, your work tunnel's traffic)
- **proxy** — force through the xray server (a service blocked in your region)
- **block** — drop it (ads / trackers)

Precedence is **block → proxy → direct**, then private/localhost always go direct, and anything
unmatched goes through the proxy. Prefer ready-made bundles? Toggle **presets** (`ru-direct`,
`ai-via-vpn`, `streaming-via-vpn`, `ads-block`, `dev-direct`).

<p align="center">
  <img src="docs/images/routing-editor.gif" alt="card-based routing editor: targets, rules and presets" width="820">
</p>

### Languages

Switch the whole interface between **English** and **Русский** on the fly (Settings → Language).

<p align="center">
  <img src="docs/images/language-switch.gif" alt="switching interface language English and Русский" width="820">
</p>

## Commands

The xray side is fully scriptable — everything in the app is also a plain command. (App-VPNs and
Check Point are managed interactively in the dashboard.)

| | |
|---|---|
| `vpn` | interactive dashboard |
| `vpn on` · `off` · `restart` | xray proxy: connect / disconnect / reconnect |
| `vpn status` · `ip` · `log [N]` | live status · IPs · last log lines |
| `vpn add <vless://…> [name]` | add a server |
| `vpn ls` · `use [name]` · `show [name]` · `rm [name]` | manage servers |
| `vpn route ls` · `route add\|rm direct\|proxy\|block <rule>` · `route edit` | edit routing |
| `vpn preset ls` · `preset on\|off [name…]` | toggle presets |
| `vpn lang en\|ru` | set language |
| `vpn init` | auto-source the proxy env in new terminals |

## Configuration

State lives under `~/.config/vpn/` (xray side only — app-VPNs keep their own config):

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
  core/
    services.ts     unified VPN-service model: xray + macOS scutil app-VPNs + Check Point + Linux NM
    tunnels.ts      low-level probes: interfaces, traffic, Check Point trac
    config.ts       xray config generation (pure, validated with `xray -test`)
    servers/routes/presets/xray/ping/geo/i18n  …rest of the pure logic (no UI imports)
  os/               platform proxy backends: darwin (networksetup+launchctl), linux (gsettings)
  ui/
    InteractiveApp  dashboard, screen routing, the power button + actions
    grid.ts         shared card-grid geometry + `useCardNav` (arrows/WASD/ЙЦУКЕН)
    Widget/Button/CardGrid/CardSelect/Hint   shared card primitives
    ServiceRow/RoutingCards/XrayPanel/TextInput   service cards, routing editor, xray panel, inputs
  i18n/ru.ts        Russian translations (keyed by the English source string)
scripts/            build (cross-compile), build-deb, publish-apt
Formula/vpn.rb      Homebrew formula
debian/, packaging/ Debian package files
docs/               GitHub Pages = APT repo; images/ + tapes/ for the README GIFs
```

Adding a user-facing string? Wrap it with `t("English text")` and add the Russian to
`src/i18n/ru.ts`. New VPN-service support goes in `src/core/services.ts` as another provider behind a
platform guard. The config generator (`src/core/config.ts`) is pure and validated with `xray -test`
before anything is applied.

### README GIFs

The demos are scripted with [vhs](https://github.com/charmbracelet/vhs) (tapes in `docs/tapes/`).
They run with **`VPN_DEMO=1`** (canned services, IPs, geo, ping, and traffic — see
`src/core/demo.ts`) against a throwaway config seeded with fake servers, so a recording never
touches the network or shows a real VPN:

```sh
brew install vhs
bun run build                                   # the tapes record the installed `vpn`
XDG_CONFIG_HOME=/tmp/vpndemo bun scripts/demo-seed.ts   # fake servers/routes/presets
for t in overview servers routing language; do vhs docs/tapes/$t.tape; done
```

Each tape already exports `VPN_DEMO=1 XDG_CONFIG_HOME=/tmp/vpndemo`, so you only seed once.

### Releasing

Tag a version and CI does the rest — builds the binaries, creates a GitHub Release, publishes the
`.deb`s and the signed APT repo to Pages, and patches the Homebrew formula:

```sh
git tag v1.0.0 && git push origin v1.0.0
```

See `.github/workflows/release.yml`. The APT repo needs `GPG_PRIVATE_KEY` / `GPG_KEY` repo secrets;
the Homebrew formula lives in the `vpncli/homebrew-tap` repo.

## License

MIT
