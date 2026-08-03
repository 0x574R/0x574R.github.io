# Deployment Guide

## URL Structure

| Language | URL |
|----------|-----|
| Spanish  | `https://0x574r.github.io/` |
| English  | `https://0x574r.github.io/en/` |

---

## Option A — GitHub Actions (recommended)

**One-time setup** — do this once in your repository settings:

1. Go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
3. Save

Then **push to `main`** — the workflow in `.github/workflows/deploy.yml`
builds both languages and deploys them automatically.

> ⚠️ **Do not use `mkdocs gh-deploy`** — it only builds the Spanish site
> (cleans `site/` before building, so `site/en/` is never deployed).

---

## Option B — Local deployment

If you prefer to deploy from your machine:

```bash
./deploy.sh
```

This builds both languages and pushes the combined `site/` to the
`gh-pages` branch. Make sure GitHub Pages is set to deploy from
`gh-pages` (Settings → Pages → Branch: gh-pages).

---

## Local development / testing

```bash
# Test both languages locally (builds + serves site/)
./serve_local.sh

# Then visit:
#   http://localhost:8000/       ← Spanish
#   http://localhost:8000/en/    ← English
```

> ⚠️ **Do not use `mkdocs serve`** for testing the language toggle —
> it only serves one language at a time without the `/en/` path,
> so clicking the flag button will 404.

---

## What must be in the git repository

Make sure all of these are committed:

```
docs/                          ← Spanish content
docs_en/                       ← English content
mkdocs.yml                     ← Spanish build config
mkdocs_en.yml                  ← English build config
overrides/main.html            ← language toggle JS
overrides/partials/alternate.html  ← flag button template
requirements.txt               ← MkDocs dependencies
.github/workflows/deploy.yml   ← CI/CD workflow
```
