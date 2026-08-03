#!/usr/bin/env bash
# serve_local.sh — local testing with both languages
#
# IMPORTANT: don't use "mkdocs serve" to test language switching.
#   mkdocs serve serves ONE config at localhost:8000/ (no /en/ prefix).
#   The toggle navigates to /en/... which doesn't exist there → 404.
#
# THIS SCRIPT builds both, then serves site/ with Python's HTTP server.
#   http://localhost:8000/           ← Spanish
#   http://localhost:8000/en/        ← English
#   (the language toggle works between them)
#
# USAGE
#   chmod +x serve_local.sh && ./serve_local.sh [port]
#   default port: 8000

set -euo pipefail

PORT=${1:-8000}

echo ">> Building Spanish (→ site/)..."
mkdocs build --clean

echo ">> Building English (→ site/en/)..."
mkdocs build -f mkdocs_en.yml

echo ""
echo ">> Serving at http://localhost:${PORT}/"
echo "   Spanish  →  http://localhost:${PORT}/"
echo "   English  →  http://localhost:${PORT}/en/"
echo "   (Ctrl+C to stop)"
echo ""
python3 -m http.server "$PORT" --directory site/
