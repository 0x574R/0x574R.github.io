# Blog Jekyll + GitHub Pages (Actions)

Este repo incluye **TODO** para que *GitHub Pages* construya y despliegue automáticamente tu blog con **Jekyll**, sin hacer nada en local.

## Pasos

1. Crea un repo y sube este ZIP.
2. En **Settings → Pages**, deja **Build and deployment** en **GitHub Actions**.
3. (Opcional) Edita `_config.yml` y pon tu `url` real.
4. Haz *push* a `main`. El workflow `pages.yml` construye con `actions/jekyll-build-pages` y publica.

## Estructura

```
.
├── .github/workflows/pages.yml     # Workflow oficial de Pages para Jekyll
├── _config.yml                     # Configuración de Jekyll (plugins: feed, seo-tag, sitemap, paginate)
├── _layouts/                       # Layouts Liquid
├── _includes/                      # Header/footer
├── _posts/                         # Tus posts Markdown (YYYY-MM-DD-titulo.md)
├── assets/css/main.css             # Estilos (oscuro + monospace para code)
├── index.html                      # Home con paginación
├── about.md                        # Página estática
├── 404.html                        # 404
└── robots.txt
```

## Nuevo post

Crea un archivo en `_posts/` con nombre `YYYY-MM-DD-mi-post.md`:

```markdown
---
layout: post
title: "Mi nuevo post"
date: 2025-10-16 12:00:00 +0200
tags: [post, notas]
---

Contenido en **Markdown**. Bloque de código:

```bash
echo "hello"
```
```

¡Listo! 🚀
