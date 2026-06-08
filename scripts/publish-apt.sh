#!/usr/bin/env bash
# Publish (or update) the signed APT repository under docs/ for GitHub Pages.
#
#   GPG_KEY=<key-id-or-email> scripts/publish-apt.sh dist/*.deb
#
# Requires: reprepro, gpg (with the secret key available). After running, commit
# and push docs/ — GitHub Pages then serves it at https://vpncli.github.io/vpn
set -euo pipefail

: "${GPG_KEY:?set GPG_KEY to your signing key id/email}"
if [ "$#" -lt 1 ]; then echo "usage: GPG_KEY=... $0 <deb>..." >&2; exit 1; fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$ROOT/docs"
mkdir -p "$REPO/conf"

cat > "$REPO/conf/distributions" <<EOF
Origin: vpn
Label: vpn
Codename: stable
Architectures: amd64 arm64
Components: main
Description: vpn APT repository
SignWith: ${GPG_KEY}
EOF

for deb in "$@"; do
  reprepro -b "$REPO" includedeb stable "$deb"
done

gpg --armor --export "$GPG_KEY" > "$REPO/key.gpg"
touch "$REPO/.nojekyll"

echo "APT repo updated under $REPO — commit & push to publish."
