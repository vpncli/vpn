#!/usr/bin/env bash
# Build a .deb from a prebuilt linux binary in dist/.
#
#   scripts/build-deb.sh <version> <arch>
#     arch: amd64 (default) | arm64
#
# Requires: dpkg-deb. Run `bun run build` first to produce dist/vpn-linux-*.
set -euo pipefail

VERSION="${1:-0.1.0}"
ARCH="${2:-amd64}"

case "$ARCH" in
  amd64) BIN="dist/vpn-linux-x64" ;;
  arm64) BIN="dist/vpn-linux-arm64" ;;
  *) echo "unsupported arch: $ARCH (use amd64|arm64)" >&2; exit 1 ;;
esac

if [ ! -f "$BIN" ]; then
  echo "missing $BIN — run: bun run build linux-x64 linux-arm64" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)/vpn_${VERSION}_${ARCH}"
mkdir -p "$STAGE/DEBIAN" "$STAGE/usr/bin"

install -m 0755 "$BIN" "$STAGE/usr/bin/vpn"

sed -e "s/@VERSION@/$VERSION/" -e "s/@ARCH@/$ARCH/" \
  "$ROOT_DIR/packaging/debian/control.in" > "$STAGE/DEBIAN/control"
install -m 0755 "$ROOT_DIR/packaging/debian/postinst" "$STAGE/DEBIAN/postinst"

mkdir -p "$ROOT_DIR/dist"
OUT="$ROOT_DIR/dist/vpn_${VERSION}_${ARCH}.deb"
dpkg-deb --root-owner-group --build "$STAGE" "$OUT"

echo "built: $OUT"
dpkg-deb --info "$OUT" | sed -n '1,12p'
