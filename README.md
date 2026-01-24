# RAZOR - TOC Dark Style para Tema Claro

Este CSS personalizado hace que el **Table of Contents (TOC)** del tema claro de MkDocs Material tenga el mismo diseño visual que el tema oscuro.

## Instalación

### Opción 1: Si ya tienes un `extra.css`

Copia el contenido de `docs/stylesheets/extra.css` y añádelo al final de tu archivo CSS existente.

### Opción 2: Si no tienes un `extra.css`

1. Copia la carpeta `stylesheets/` dentro de tu carpeta `docs/`:

```
tu-proyecto/
├── docs/
│   ├── stylesheets/
│   │   └── extra.css    <-- Copia este archivo
│   └── index.md
└── mkdocs.yml
```

2. Asegúrate de que tu `mkdocs.yml` incluya la referencia al CSS:

```yaml
extra_css:
  - stylesheets/extra.css
```

## Personalización

El CSS incluye variables que puedes modificar según tus preferencias:

```css
:root {
    --toc-bg-dark: #1e1e1e;         /* Color de fondo del TOC */
    --toc-border-dark: #333;         /* Color del borde */
    --toc-text-dark: #a0a0a0;        /* Color del texto */
    --toc-text-hover: #ffffff;       /* Color al hacer hover */
    --toc-text-active: #4fc3f7;      /* Color del enlace activo */
    --toc-title-color: #b0b0b0;      /* Color del título "Tabla de contenidos" */
}
```

## Resultado

- **Tema claro**: El TOC tendrá fondo oscuro con texto claro
- **Tema oscuro**: Sin cambios, mantiene su estilo original

## Compatibilidad

- MkDocs Material 9.x
- Testado con la configuración de paleta dual (light/dark toggle)

---
*RAZOR Security Blog - 0x574R*
