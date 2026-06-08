#!/usr/bin/env bash
# Fallback installer (no brew/apt). Downloads the latest self-contained binary.
#
#   curl -fsSL https://raw.githubusercontent.com/vpncli/vpn/main/install.sh | bash
set -euo pipefail

REPO="vpncli/vpn"

os="$(uname -s)"; arch="$(uname -m)"
case "$os" in
  Darwin) o="darwin" ;;
  Linux)  o="linux" ;;
  *) echo "unsupported OS: $os (macOS/Linux only)" >&2; exit 1 ;;
esac
case "$arch" in
  arm64|aarch64) a="arm64" ;;
  x86_64|amd64)  a="x64" ;;
  *) echo "unsupported arch: $arch" >&2; exit 1 ;;
esac

asset="vpn-${o}-${a}"
url="https://github.com/${REPO}/releases/latest/download/${asset}"

# Pick an install dir on PATH that we can write to.
if [ -w "/usr/local/bin" ]; then dest="/usr/local/bin"
elif command -v sudo >/dev/null 2>&1 && [ -d /usr/local/bin ]; then dest="/usr/local/bin"; SUDO="sudo"
else dest="$HOME/.local/bin"; mkdir -p "$dest"
fi
SUDO="${SUDO:-}"

tmp="$(mktemp)"
echo "▸ downloading $asset…"
curl -fsSL "$url" -o "$tmp"
chmod +x "$tmp"
$SUDO mv "$tmp" "$dest/vpn"
echo "✔ installed vpn → $dest/vpn"

case ":$PATH:" in *":$dest:"*) ;; *) echo "⚠ add $dest to your PATH";; esac

if ! command -v xray >/dev/null 2>&1; then
  echo ""
  echo "Next: install the xray engine"
  if [ "$o" = "darwin" ]; then echo "  brew install xray"
  else echo "  bash -c \"\$(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh)\""; fi
fi
echo "Then:  vpn add <vless://...>   &&   vpn on"
