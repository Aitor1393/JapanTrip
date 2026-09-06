#!/usr/bin/env bash
# Arma en _sitio/ lo único que se publica: la web y nada más.
#
# Lo usa la compilación de Cloudflare Pages. Fuera se quedan el README y
# cualquier cosa que no haga falta para que la web funcione.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$raiz"

rm -rf _sitio
mkdir -p _sitio
cp -r index.html assets data _sitio/
cp _headers _sitio/
touch _sitio/.nojekyll

echo "Se publica:"
find _sitio -type f | sort | head -30
echo "Total: $(du -sh _sitio | cut -f1)"
