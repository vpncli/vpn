# Changelog

## 1.0.0

**vpncli is now a manager for *every* VPN on the machine — not just xray.**

- **Unified service dashboard** — xray servers and full-tunnel app-VPNs are auto-detected and
  shown together as cards, grouped by type, each with a live country flag, ping, and up/down traffic.
- **Full tunnel + xray, side by side** — full tunnels (which grab the OS default route) are mutually
  exclusive and drop each other on connect; the xray proxy routes by rules and always coexists. Cards
  are tagged `🌐 ALL TRAFFIC` (tunnel) vs `⚡ BY RULES` (proxy).
- **VPN detection**
  - macOS app-VPNs via `scutil` (WireGuard, Outline, v2RayTun, Happ…); connect/disconnect, falls
    back to opening the app.
  - Check Point via `trac` — connect in-app with **password + OTP**, or disconnect.
  - Linux via **NetworkManager** (`nmcli`) — WireGuard / OpenVPN / OpenConnect connections, up/down.
- **Card-based two-level UI** — arrows or **WASD** (incl. Russian ЙЦУКЕН) move between cards;
  **Tab** dives into a card / opens Settings; **Enter** is reserved for actions; **Backspace** deletes.
- **Context-aware power button** — *Disconnect all* when anything is up, *Enable `<server>`* when off,
  or **+ Add xray server** on a fresh install (add a server straight from the UI, no CLI needed).
- **xray panel** — real vs VPN IP, server cards (switch / rename / remove), and a routing widget.
- **Card-based routing editor** — direct / proxy / block and presets as toggle cards.
- **Cross-platform fixes** — `icmpPing` uses the right timeout flag per-OS; interface traffic reads
  Linux `/sys/class/net`; missing `xray` binary now shows a readable error instead of crashing.
- **Rebrand** — `vpncli` (vpncli.cc), new banner + ASCII logo, English / Русский throughout.

## 0.1.0

Initial release.

- Server profiles parsed from `vless://` share links; switch with `vpn use`.
- Routing via simple `direct` / `proxy` / `block` lists plus toggleable presets
  (`ru-direct`, `ai-via-vpn`, `streaming-via-vpn`, `ads-block`, `dev-direct`).
- Optional `dns.json` override and `VPN_EXTRA_BYPASS` for private/internal setups.
- Generated xray config is validated with `xray -test` before it is applied.
- Pretty Ink TUI: gradient banner, live status dashboard, interactive server/preset pickers.
- macOS (networksetup + launchctl) and Linux/Ubuntu (gsettings + env file) system-proxy backends.
- Distribution: self-contained binaries via `bun build --compile`; Homebrew tap, Debian/apt repo,
  and a curl installer.
