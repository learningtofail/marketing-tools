#!/usr/bin/env bash
# Build the standalone pages without home links and copy the tool pages (not index.html) and site/examples/ to a destination folder.
# Stale files are deleted only inside <dest>/examples/.
# Usage: scripts/export-for-portfolio.sh /path/to/fa-portfolio/public/marketing
set -euo pipefail
dest="$(realpath -m "${1:?destination folder required}")"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
MT_HOME_URL='' python3 build.py
mkdir -p "$dest"
for f in site/*.html; do
  [ "$(basename "$f")" = "index.html" ] && continue
  cp "$f" "$dest/$(basename "$f")"
done
if [ -d site/examples ]; then
  rm -rf "${dest:?}/examples"
  cp -R site/examples "$dest/examples"
fi
echo "exported $(ls site/*.html | grep -vc index.html) pages to $dest"
