---
date: 2026-06-03
description: Fuentes de identidad visible de un proceso Linux, mecanismos de manipulación via prctl y PR_SET_MM, memoria virtual, VMAs y anonimización.
---

<div class="article-header">
<h1>Visible Identity of a Process</h1>
<span class="article-meta">03/06/2026 · 50 min</span>
</div>

Qué información expone Linux sobre sus procesos, dónde reside y cómo se manipula

---

!!! info "Contexto"
    Este artículo cubre la información que el sistema operativo expone sobre cada proceso y cómo puede modificarse desde userspace. Es el tercer artículo de la serie DARKCLOAK y asume conocimiento previo del modelo de credenciales y capabilities (artículo 1) y del formato ELF (artículo 2).

## Introducción

En un sistema Linux, se podría decir que cada proceso tiene dos identidades distintas. Una es la **identidad interna**, conformada por los UIDs, GIDs y las capabilities almacenadas en la estructura `cred`, que determinan de quién es el proceso y qué puede hacer. Y la otra, es la **identidad visible**, es decir, la información que el sistema operativo expone sobre el proceso a cualquier observador, ya sea otro proceso o un usuario del sistema.

La identidad interna y la visible no están estrechamente relacionadas. Un proceso puede tener UID 1000 en sus credenciales pero mostrar UID 0 en `/proc/PID/status` si se manipulan los campos adecuados. Puede ejecutar el código de su binario mientras que `/proc/PID/exe` apunta a otro completamente distinto.

Cada fuente de identidad visible opera de forma independiente y cada una tiene su propio mecanismo de consulta y su propia vía de manipulación.

## Dónde Consultar la Identidad de un Proceso

### A través de herramientas como `ps`

Quizás la herramienta más utilizada y por defecto establecida en la mayoría de distribuciones Linux es `ps`, la cual obtiene su información de `/proc/PID/stat`, `/proc/PID/status` (nombre, estado, UIDs, capabilities), `/proc/PID/cmdline` (línea de comandos) y `/proc/PID/exe` (ruta del binario). Un proceso que modifique estas fuentes en `/proc` altera lo que `ps` muestra.

### Consultando directamente el contenido alojado en la memoria del proceso

`argv[0]` contiene el primer elemento del array de argumentos que un proceso recibe al iniciar.

```c
# Ejecución directa
argv[0] = "./darkcloak"

# Ejecución usando la ruta completa
argv[0] = "/home/user/darkcloak"
```

No es una propiedad alojada internamente por el kernel, sino un dato en la memoria del propio proceso (`[rsp+8]` con respecto al entry point). Sobrescribirlo es una escritura a una dirección conocida, sin syscalls intermedias.

### Analizando el directorio `/proc/<PID>/`

Cada proceso tiene un directorio en `/proc/` determinado por su PID. Los ficheros dentro de ese directorio no existen en disco, sino que pertenecen a **`procfs`**, un filesystem virtual donde cada operación de lectura invoca a una función del kernel que genera el contenido dinámicamente a partir de las estructuras internas del proceso.

#### Fuentes de identidad y sus mecanismos de manipulación en `/proc/<PID>/`

Cada valor consultable tiene origen en las estructuras internas del kernel vinculadas al proceso.

| Fuente en `/proc` | Estructura involucrada | Campo |
|---|---|---|
| `/proc/PID/comm` | `task_struct` | `comm[16]` |
| `/proc/PID/cmdline` | `mm_struct` | `arg_start` → `arg_end` |
| `/proc/PID/environ` | `mm_struct` | `env_start` → `env_end` |
| `/proc/PID/exe` | `mm_struct` | `exe_file` |
| `/proc/PID/maps` | `mm_struct` | `vm_area_struct` (VMAs) |
| `/proc/PID/status` (User) | `cred` | `euid` |
| `/proc/PID/status` (Group) | `cred` | `egid` |
| `/proc/PID/status` (Caps) | `cred` | `cap_*` |

!!! note ""
    Las fuentes de `struct cred` (UIDs, GIDs y capabilities) se cubrieron en el [primer artículo](identity-model.md) de esta serie.

Principalmente, las fuentes se manipulan a través de dos mecanismos:

**Vía syscall de gestión de procesos**

- Nombre del proceso (`/proc/PID/comm`) → `prctl(PR_SET_NAME)`
- Línea de comandos (`/proc/PID/cmdline`) → `prctl(PR_SET_MM, ARG_START/ARG_END)`
- Variables de entorno (`/proc/PID/environ`) → `prctl(PR_SET_MM, ENV_START/ENV_END)`
- Enlace al ejecutable (`/proc/PID/exe`) → `prctl(PR_SET_MM, EXE_FILE)`

**Vía syscalls de gestión de memoria**

- Mapa de memoria virtual del proceso (`/proc/PID/maps`) → `mmap`, `munmap`, `mremap`, `mprotect`

#### La Interfaz de Gestión del Proceso

A diferencia de syscalls especializadas como `setresuid` (que solo maneja UIDs) o `capset` (que solo maneja capabilities), `prctl` es una llamada al sistema que permite realizar multitud de operaciones de gestión sobre el proceso que la invoca.

Desde la perspectiva ofensiva, `prctl` concentra la mayoría de las operaciones que modifican la identidad visible del proceso sin alterar su ejecución. Es por ello, que la monitorización defensiva de `prctl` (via auditd o eBPF) es un punto de detección crítico.

A continuación, se detallan aquellas operaciones que son valiosas desde el punto de vista ofensivo:

### `PR_SET_NAME`

El campo `comm` en `task_struct` es un array de 16 bytes (15 caracteres útiles + NULL). Es lo que muestran herramientas como `ps -o comm` al leer `/proc/PID/comm`. La modificación de este valor no requiere capabilities.

```asm
    mov rax, 157                ; PRCTL
    mov rdi, 15                 ; PR_SET_NAME
    lea rsi, [rel new_name]     ; puntero al buffer con el nuevo nombre
    syscall
```

!!! tip ""
    Los nombres entre corchetes (`[kworker/0:1]`, `[migration/0]`) son por convención hilos del kernel, por lo que un proceso en userspace puede adoptar uno de estos para mimetizarse con procesos legítimos del sistema.

### `PR_SET_DUMPABLE`

Cada proceso tiene un atributo `dumpable` que controla si el kernel permite a otros procesos del mismo usuario inspeccionar su memoria y adjuntar un depurador.

```asm
    mov rax, 157                ; PRCTL
    mov rdi, 4                  ; PR_SET_DUMPABLE
    xor esi, esi                ; DUMPABLE = 0 (POR DEFECTO, DUMPABLE = 1)
    syscall
```

!!! note ""
    Este atributo se desactiva automáticamente cuando el proceso ejecuta un binario `setuid` o `setgid`.

Al establecer `dumpable` a 0:

- `/proc/PID/maps`, `/proc/PID/mem`, `/proc/PID/environ`, `/proc/PID/auxv` pasan a ser propiedad de `root:root`. Procesos del mismo usuario no pueden leerlos sin `CAP_SYS_PTRACE`.
- `ptrace(PTRACE_ATTACH)` desde procesos con el mismo UID falla con `EPERM`.
- No se generan core dumps.

Sigue visible en `/proc/PID/stat`, `/proc/PID/status`, `/proc/PID/comm`, `/proc/PID/cmdline` y `/proc/PID/exe`. **Por tanto, esta operación actúa solo como barrera anti-debugging y anti-dumping.**

### `PR_SET_MM`

El `mm_struct` de un proceso contiene los campos que el kernel consulta para generar `/proc/PID/cmdline`(argumentos con los que se lanzó el proceso `argv[0] \0 argv[1] \0 ...`), `/proc/PID/environ` (variables de entorno del proceso `KEY1=VALUE1 \0 KEY2=VALUE2 \0 ...`) y `/proc/PID/exe` (symlink que apunta al binario que el kernel cargó cuando ejecutó `execve`).

`PR_SET_MM` permite modificar directamente estos campos, alterando lo que el kernel lee cuando un observador los consulta.

El uso de esta opción requiere la capability `CAP_SYS_RESOURCE` (bit 24) en el effective set.

#### `PR_SET_MM_ARG_START` / `PR_SET_MM_ARG_END`

Permiten modificar `arg_start` y `arg_end`. Cualquier lectura posterior de `/proc/PID/cmdline` lee la memoria entre estas dos direcciones.

```asm
    ; --- PR_SET_MM_ARG_START ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 8                  ; PR_SET_MM_ARG_START
    lea rdx, [rel fake_cmdline] ; puntero al inicio del buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall

    ; --- PR_SET_MM_ARG_END ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 9                  ; PR_SET_MM_ARG_END
    lea rdx, [rel fake_cmdline]
    add rdx, fake_cmdline_len   ; puntero al final del buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

!!! note ""
    Existe una relación entre `/proc/PID/cmdline` y `argv[0]`: por defecto, `arg_start` apunta al área del stack donde reside `argv[0]`, por lo que ambos comparten la misma región de memoria. Mientras esa relación no se altere, sobrescribir `argv[0]` cambia también lo que `cmdline` devuelve, porque el kernel lee el contenido a partir de esa dirección, no una copia almacenada por separado. Si `arg_start` se redirige a otro buffer vía `PR_SET_MM`, las dos fuentes se desacoplan: `cmdline` lee del nuevo buffer y la sobrescritura de `argv[0]` solo afecta a herramientas que acceden directamente al stack del proceso.

#### `PR_SET_MM_ENV_START` / `PR_SET_MM_ENV_END`

Equivalente para `/proc/PID/environ`.

```asm
    ; --- PR_SET_MM_ENV_START ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 10                 ; PR_SET_MM_ENV_START
    lea rdx, [rel fake_environ] ; puntero al inicio del buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall

    ; --- PR_SET_MM_ENV_END ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 11                 ; PR_SET_MM_ENV_END
    lea rdx, [rel fake_environ]
    add rdx, fake_environ_len   ; puntero al final del buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

#### `PR_SET_MM_EXE_FILE`

Permite modificar el symlink `/proc/PID/exe`. A diferencia de los anteriores, recibe un file descriptor al binario destino, no una dirección en memoria. El kernel reemplaza el `exe_file` del `mm_struct` por el `struct file` asociado al FD (cambio en una estructura vinculada al proceso a nivel del kernel).

```asm
    ; --- Obtener FD del binario objetivo ---
    mov rax, 257                ; OPENAT
    mov rdi, -100               ; AT_FDCWD
    lea rsi, [rel target_path]  ; puntero a la ruta del binario objetivo
    xor edx, edx                ; O_RDONLY
    xor r10d, r10d
    syscall
    mov r14, rax                ; guardar FD en r14

    ; --- PR_SET_MM_EXE_FILE ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 13                 ; PR_SET_MM_EXE_FILE
    mov rdx, r14                ; fd del binario destino
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

!!! danger ""
    **Esta operación falla con `EBUSY` si el proceso tiene VMAs con `vm_file` apuntando al ejecutable original. Todas las VMAs file-backed iniciales deben sustituirse antes de la llamada, lo que lleva directamente al bloque de anonimización de VMAs.**

## Memoria Virtual y VMAs

Cada proceso en Linux opera sobre un espacio de direcciones virtuales que la **MMU (Memory Management Unit)** traduce a direcciones físicas. Es decir, el proceso no accede directamente a la RAM, sino que accede a direcciones virtuales que el hardware traduce a físicas de manera transparente.

**Ese espacio de direcciones virtuales no está mapeado al completo desde un inicio, sino que se va mapeando como regiones a medida que el proceso las va necesitando** (el código del binario, sus datos, el stack, el heap, las bibliotecas compartidas y cualquier mapping explícito que el proceso solicite). Cada una de estas regiones está representada internamente por una **VMA (Virtual Memory Area)**, una estructura `vm_area_struct` dentro del `mm_struct` del proceso.

Las entradas que aparecen en `/proc/PID/maps` son las VMAs del proceso.

```c
struct vm_area_struct {
    unsigned long vm_start;      // Dirección de inicio
    unsigned long vm_end;        // Dirección de fin
    pgprot_t vm_page_prot;       // Protección de las páginas
    unsigned long vm_flags;      // VM_READ, VM_WRITE, VM_EXEC, ...
    struct file *vm_file;        // Fichero asociado (NULL si es anónimo)
    unsigned long vm_pgoff;      // Offset dentro del fichero
    // ...
};
```

!!! note ""
    Las flags `VM_READ`, `VM_WRITE`, `VM_EXEC` determinan los permisos que aparecen en `/proc/PID/maps` (`r`, `w`, `x`). El flag `VM_SHARED` distingue el mapping `MAP_SHARED` (`s`) del mapping `MAP_PRIVATE` (`p`).

### VMAs file-backed vs VMAs anónimas

#### VMAs file-backed

Se crean explícitamente cuando el kernel mapea un fichero en memoria — ya sea porque un programa solicita mapear un fichero con `mmap` pasando un file descriptor, o implícitamente durante `execve`, cuando el kernel carga los segmentos `PT_LOAD` del binario ELF en el espacio de direcciones del nuevo proceso. En ambos casos, la VMA resultante mantiene una referencia al fichero original a través de su campo `vm_file`.

En `/proc/PID/maps` se muestra la siguiente información:

```text
00400000-00402000 r--p 00000000 08:01 1234567  /path/to/binary
│               │ │  │ │        │     │        └─ ruta del fichero mapeado
│               │ │  │ │        │     └─ inode del fichero
│               │ │  │ │        └─ device (major:minor)
│               │ │  │ └─ offset dentro del fichero
│               │ │  └─ tipo: p=private, s=shared
│               │ └─ permisos: r=read, w=write, x=execute
└───────────────└─ rango de direcciones virtuales
```

#### VMAs anónimas

Creadas por el kernel para el stack y el heap, o explícitamente con `mmap(MAP_ANONYMOUS)`. El campo `vm_file` de la VMA es NULL.

En `/proc/PID/maps` no se muestra la ruta:

```text
7f8a00000000-7f8a00004000 rw-p 00000000 00:00 0
│                         │    │        │     │
│                         │    │        │     └─ inode 0: sin fichero
│                         │    │        └─ device 00:00
│                         │    └─ offset 0
│                         └─ permisos: lectura + escritura, tipo: private
└─ rango de direcciones virtuales
```

### Primitivas de gestión de la Memoria Virtual

Un proceso no puede reservar memoria, liberarla, moverla ni cambiar sus permisos sin pasar por el kernel. Las cuatro syscalls que lo permiten son `mmap` (reservar), `munmap` (liberar), `mremap` (mover o redimensionar) y `mprotect` (cambiar permisos).

#### `MMAP`

Permite crear un nuevo mapping en el espacio de direcciones virtuales del proceso.

```asm
rax = 9          ; Número de syscall (mmap)
rdi = addr       ; Dirección sugerida (0 para que el kernel la elija)
rsi = length     ; Tamaño en bytes a reservar (ej. 4096 = 1 página)
rdx = prot       ; Permisos de protección (flags PROT_*)
r10 = flags      ; Opciones de mapeo (MAP_*)
r8  = fd         ; File descriptor (para mapeo de archivo; -1 si no aplica)
r9  = offset     ; Offset dentro del archivo (múltiplo del tamaño de la página)
```

| Flag | Valor | Descripción |
|---|---|---|
| `MAP_SHARED` | `0x01` | El mapping es compartido: las escrituras se propagan al fichero y son visibles para otros procesos que lo tengan mapeado. |
| `MAP_PRIVATE` | `0x02` | Copia privada. Las escrituras no se propagan. |
| `MAP_FIXED` | `0x10` | Fuerza la dirección exacta indicada en `addr`. Desmapea silenciosamente lo que hubiera en ese rango. |
| `MAP_ANONYMOUS` | `0x20` | Sin fichero asociado. `fd` debe ser `-1`. La memoria se inicializa a cero. |

| Permiso | Valor | Acceso |
|---|---|---|
| `PROT_NONE` | `0x0` | Sin acceso |
| `PROT_READ` | `0x1` | Lectura |
| `PROT_WRITE` | `0x2` | Escritura |
| `PROT_EXEC` | `0x4` | Ejecución |

La combinación `MAP_PRIVATE | MAP_ANONYMOUS` (`0x22`) es el caso de uso principal para reservar memoria anónima. El resultado son páginas inicializadas a cero, sin ruta visible en `/proc/PID/maps` y con escrituras aisladas al proceso que las creó.

#### `MREMAP`

Redimensiona, mueve o reubica un mapping existente dentro del espacio de memoria virtual del proceso. Preserva los permisos de protección del mapping original y su tipo.

```asm
rax = 25          ; Número de syscall (mremap)
rdi = old_address ; Dirección base del mapping existente (alineada a página)
rsi = old_size    ; Tamaño actual del mapping en bytes
rdx = new_size    ; Nuevo tamaño en bytes
r10 = flags       ; Bitmask MREMAP_* (0 si no se desea mover)
r8  = new_address ; Dirección destino (solo si flags incluye MREMAP_FIXED)
```

| Flag | Valor | Descripción |
|---|---|---|
| `MREMAP_MAYMOVE` | `0x01` | Autoriza al kernel a mover el mapping a una dirección virtual distinta si no hay espacio contiguo. |
| `MREMAP_FIXED` | `0x02` | Obliga a colocar el mapping en la dirección indicada por `r8` (`new_address`). Requiere `MREMAP_MAYMOVE`. |
| `MREMAP_DONTUNMAP` | `0x04` | Mueve las PTEs a `new_address` sin destruir el VMA original. Solo válido en mappings anónimos `MAP_PRIVATE`. |

#### `MPROTECT`

Permite cambiar las protecciones (lectura/escritura/ejecución) de una región de memoria ya mapeada por el proceso.

```asm
rax = 10         ; Número de syscall (mprotect)
rdi = addr       ; Dirección base de la región (se redondea a página)
rsi = len        ; Longitud en bytes (se redondea a páginas)
rdx = prot       ; Máscara de permisos (PROT_*) combinables con OR
```

#### `MUNMAP`

Elimina un mapping del espacio de direcciones virtual del proceso. Tras la llamada, cualquier acceso a las direcciones del rango desmapeado generará `SIGSEGV`.

```asm
rax = 11            ; Número de syscall (munmap)
rdi = addr          ; Dirección base del mapping a eliminar
rsi = length        ; Tamaño en bytes a desmapear
```

No es necesario que `length` coincida exactamente con el tamaño original del mapping. Se puede desmapear una porción de un mapping existente.

### Anonimización de VMAs

**La anonimización de VMAs es el proceso de reemplazar las VMAs file-backed por VMAs anónimas con contenido idéntico**. El resultado es un proceso que sigue ejecutando el mismo código en las mismas direcciones, con los mismos permisos, pero sin ninguna VMA referenciando al binario original. En `/proc/PID/maps`, las VMAs pasan de mostrar la ruta del ejecutable a mostrar device `00:00` e inode `0`.

!!! abstract ""
    Al realizar este proceso sobre todas las VMAs file-backed, la ejecución de `PR_SET_MM_EXE_FILE` con la capability `CAP_SYS_RESOURCE` tiene éxito, permitiendo el spoofing de `/proc/PID/exe`.

#### Procedimiento de anonimización

Para cada segmento del binario:

1. **Crear una región anónima** (`mmap` con `MAP_PRIVATE | MAP_ANONYMOUS`): se reserva una nueva región anónima en memoria con el mismo tamaño que el segmento, con permisos de lectura y escritura (necesarios para copiar los datos).

2. **Copiar el contenido** (`rep movsb`): se transfiere byte a byte el contenido íntegro del segmento original a la nueva región de memoria.

3. **Eliminar el mapping original** (`munmap`): se desmapea la región file-backed, eliminando la referencia al binario en disco. A partir de este punto, acceder a las direcciones del segmento original provoca un fallo de segmentación.

4. **Reubicar la copia** (`mremap` con `MREMAP_MAYMOVE | MREMAP_FIXED`): se mueve la región anónima al rango de direcciones que ocupaba el segmento original. El contenido es idéntico, las direcciones son las mismas; a efectos prácticos, solo se cambió el tipo de VMA.

5. **Restaurar los permisos** (`mprotect`): se aplican los permisos originales del segmento a la nueva región de memoria (R para headers, RX para código, RW para datos).

```text
Antes (file-backed):
00400000-00402000 r--p 00000000 08:01 1234567  /path/to/binary
00402000-00405000 r-xp 00002000 08:01 1234567  /path/to/binary
00405000-00407000 rw-p 00005000 08:01 1234567  /path/to/binary

Después (anónimas):
00400000-00402000 r--p 00000000 00:00 0
00402000-00405000 r-xp 00000000 00:00 0
00405000-00407000 rw-p 00000000 00:00 0
```

#### El problema del segmento `.text`

El segmento `.text` contiene el código ejecutable (RIP apunta a direcciones dentro de este segmento). Desmapearlo con `munmap` mientras se ejecuta código desde él destruye la página donde reside la siguiente instrucción a ejecutar, provocando un fallo de segmentación inmediato.

La solución es ejecutar el código de anonimización **desde fuera** de los segmentos ejecutables iniciales del binario. Para ello, se construye un trampoline:

1. **Reservar una página temporal** (`mmap` con `MAP_PRIVATE | MAP_ANONYMOUS`): se crea una página anónima donde copiar el código y los datos necesarios para la anonimización.

2. **Copiar el código de anonimización** (`rep movsb`): se copia a la página temporal el bloque de instrucciones que ejecuta la secuencia `mmap`→`movsb`→`munmap`→`mremap`→`mprotect` para cada segmento, junto con los datos que necesitan las syscalls (direcciones de inicio/fin, permisos y direcciones de retorno).

3. **Hacer la página ejecutable** (`mprotect` con `PROT_READ | PROT_EXEC`): la página se debe crear con permisos RW para poder copiar los datos; una vez copiados, se cambia a RX para poder transferir el flujo de ejecución a ella.

4. **Saltar a la página temporal** (`jmp`): el flujo de ejecución del binario debe abandonar el segmento `.text` del binario y saltar a la página anónima. A partir de este punto, el RIP apunta a la página temporal y es seguro desmapear cualquier segmento del binario.

5. **Anonimizar los segmentos**: desde la página temporal se ejecuta la secuencia completa de anonimización para cada segmento (la página temporal debe alojar los datos necesarios para el proceso de anonimización).

6. **Saltar de vuelta al `.text` anonimizado** (`jmp` a la dirección de retorno almacenada en la página temporal): se retorna el flujo de ejecución al segmento `.text` anonimizado, que posee el mismo contenido y en las mismas direcciones.

7. **Desmapear la página temporal** (`munmap`): la página utilizada para el trampoline ya no es necesaria y se puede eliminar.

La anonimización de todos los segmentos junto con la creación del trampoline reubicable se puede consultar en el código de DARKCLOAK, presente en el siguiente artículo.

---

## Agradecimientos

Gracias a los revisores que han contribuido con correcciones y sugerencias técnicas a este artículo. Gracias también a la comunidad de seguridad ofensiva hispanohablante por el interés continuo en contenido técnico de bajo nivel.

Si encuentras errores o tienes sugerencias, puedes contactarme a través de [GitHub](https://github.com/0x574R) o [LinkedIn](https://linkedin.com/in/0x574R).
