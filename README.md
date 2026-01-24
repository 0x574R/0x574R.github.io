# RAZOR Security Blog

Blog de seguridad ofensiva con tema cyberpunk para MkDocs Material.

![Theme](https://img.shields.io/badge/theme-cyberpunk-00ff41)
![MkDocs](https://img.shields.io/badge/MkDocs-Material-blue)

## 🚀 Quick Start

### Requisitos

- Python 3.8+
- pip

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/0x574R/0x574R.github.io.git
cd 0x574R.github.io

# Instalar dependencias
pip install -r requirements.txt

# Servidor local
mkdocs serve
```

Accede a `http://127.0.0.1:8000`

### Deploy

```bash
# Build estático
mkdocs build

# Deploy a GitHub Pages
mkdocs gh-deploy
```

## 📁 Estructura

```
razor-redesign/
├── docs/
│   ├── index.md                 # Home
│   ├── writeups/                # CTF writeups
│   ├── cheatsheets/             # Quick references
│   ├── research/                # Technical research
│   │   ├── kernel/              # Kernel security
│   │   └── malware-dev/         # Malware development
│   ├── stylesheets/             # Custom CSS
│   │   ├── extra.css            # Main styles
│   │   └── animations.css       # Animations
│   ├── javascripts/             # Custom JS
│   ├── assets/                  # Images, logo
│   ├── includes/                # Snippets
│   └── overrides/               # Theme overrides
├── mkdocs.yml                   # Configuration
├── requirements.txt             # Dependencies
└── README.md
```

## 🎨 Personalización

### Colores

Edita `docs/stylesheets/extra.css`:

```css
:root {
  --razor-green: #00ff41;
  --razor-cyan: #00d4ff;
  --razor-dark: #0d1117;
}
```

### Logo

Reemplaza `docs/assets/logo.svg` con tu propio logo SVG.

### Fuentes

El tema usa:
- **Display**: Orbitron
- **Mono**: JetBrains Mono

## ✨ Features

- Tema oscuro cyberpunk
- Efectos glitch y animaciones
- Cards interactivas
- Code blocks estilo terminal
- Responsive design
- Soporte para tags
- Search integrado

## 📝 Añadir Contenido

### Nuevo Writeup

```markdown
---
title: Mi Writeup
description: Descripción breve
tags:
  - htb
  - linux
---

# Título

Contenido...
```

### Nuevo Cheatsheet

```markdown
---
title: Mi Cheatsheet
tags:
  - tools
---

# Quick Reference

## Sección

\`\`\`bash
comando ejemplo
\`\`\`
```

## 📜 License

MIT License - Free to use and modify.

---

Built with ❤️ by [0x574R](https://github.com/0x574R)
