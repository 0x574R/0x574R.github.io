# RAZOR - Actualización Final

## Archivos incluidos

```
├── mkdocs.yml                    # Configuración actualizada
├── docs/
│   ├── stylesheets/
│   │   └── custom.css            # CSS unificado
│   └── assets/
│       └── images/
│           ├── writeups-hero.svg     # Imagen para Writeups
│           ├── cheatsheets-hero.svg  # Imagen para Cheatsheets
│           ├── research-hero.svg     # Imagen para Research
│           ├── kernel-hero.svg       # Imagen para Kernel
│           ├── malware-hero.svg      # Imagen para Malware Dev
│           └── ebpf-hero.svg         # Imagen para eBPF
```

## Cambios realizados

### mkdocs.yml
- ✅ Home eliminado del menú lateral
- ✅ Menús plegados por defecto (quitado `navigation.expand`)
- ✅ Syntax highlighting con `pymdownx.highlight`
- ✅ Iconos de admonition configurados

### custom.css
- ✅ Color accent más steel/dark: `#4a6fa5` (light) / `#7a9ec9` (dark)
- ✅ Título "RAZOR" oculto del sidebar
- ✅ Admonition "recursos" con icono de bookmark
- ✅ Syntax highlighting para código con colores

## Cómo usar las imágenes en tus artículos

### Opción 1: Al inicio del artículo (recomendado)

```markdown
# Linux Privilege Escalation

![Linux Privesc](../assets/images/cheatsheets-hero.svg)

Contenido del artículo...
```

### Opción 2: Con estilos personalizados

```markdown
<figure markdown>
  ![Writeups](../assets/images/writeups-hero.svg){ width="100%" }
  <figcaption>CTF Writeups & Walkthroughs</figcaption>
</figure>
```

### En las Cards del index.md (Home)

```html
<div class="razor-card">
  <img src="assets/images/writeups-hero.svg" alt="Writeups" style="border-radius: 12px; margin-bottom: 1rem;">
  <span class="razor-card__tag">CTF</span>
  <span class="razor-card__title">Writeups</span>
  <span class="razor-card__desc">Resolución de máquinas</span>
</div>
```

## Admonition "Recursos"

Para usar el nuevo estilo de recursos:

```markdown
!!! recursos "Enlaces útiles"
    - [HackTricks](https://book.hacktricks.xyz)
    - [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
```

## Syntax Highlighting

Ahora los bloques de código se colorean según el lenguaje:

~~~markdown
```python
def exploit():
    payload = b"\x90" * 100
    return payload
```

```bash
$ nmap -sV -sC target
```

```c
#include <stdio.h>
int main() {
    printf("pwned\n");
    return 0;
}
```
~~~

## Instalación

1. Copia `mkdocs.yml` a la raíz de tu proyecto
2. Copia `docs/stylesheets/custom.css` a `docs/stylesheets/`
3. Copia `docs/assets/images/*.svg` a `docs/assets/images/`
4. Elimina `extra.css` si existe o quítalo del `mkdocs.yml`
