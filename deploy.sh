#!/usr/bin/env bash
# deploy.sh — LOCAL deployment to GitHub Pages via gh-pages branch
#
# USE THIS SCRIPT when you want to deploy from your machine instead of
# waiting for the GitHub Action. Requires git + push access to your repo.
#
# NOTE: if you use the GitHub Action (deploy.yml), you do NOT need this
# script — just push to main and the Action deploys automatically.
#
# USAGE
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

echo ">> Building Spanish (→ site/) ..."
mkdocs build --clean

echo ">> Building English (→ site/en/) ..."
mkdocs build -f mkdocs_en.yml

# Guard: verify English build actually produced content
if [ ! -f site/en/index.html ]; then
  echo ""
  echo "ERROR: site/en/index.html not found."
  echo "  Make sure docs_en/ and mkdocs_en.yml are present."
  exit 1
fi

echo ""
echo ">> site/ contents:"
ls site/
echo "   site/en/ ✓"

echo ""
echo ">> Deploying to gh-pages branch ..."
# ghp-import is installed with MkDocs
ghp-import --nojekyll --push --force site/

echo ""
echo "✓  Done. Changes will be live in ~1 minute."
echo "   Root     → https://0x574r.github.io/"
echo "   English  → https://0x574r.github.io/en/"
echo ""
echo "NOTE: This deploys to the gh-pages branch."
echo "      Make sure your GitHub Pages source is set to the gh-pages branch"
echo "      (Settings → Pages → Branch: gh-pages)."
