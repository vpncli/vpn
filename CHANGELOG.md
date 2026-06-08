# Changelog

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
