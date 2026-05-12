---
date: 2026-05-12
---

<div class="article-header">
<h1>El Modelo de Identidad y Privilegios en el Kernel Linux (Procesos)</h1>
<span class="article-meta">12/05/2026 · 45 min</span>
</div>

Cómo el kernel Linux gestiona la identidad y los privilegios de un proceso

---

!!! info "Contexto"
    Este artículo cubre la teoría subyacente a las técnicas ofensivas que manipulan credenciales de proceso. Comprender el modelo de identidad y privilegios del kernel es un requisito fundamental antes de implementar herramientas que operen sobre `struct cred`.

## Introducción

El kernel Linux concentra toda la información de identidad y privilegios de un proceso en una única estructura: `struct cred`. Dentro de ella conviven dos sistemas complementarios, los **UIDs/GIDs** (de quién es el proceso) y las **capabilities** (qué operaciones privilegiadas puede ejecutar). Ambas están estrechamente relacionadas, por lo que, modificaciones en los UIDs desencadenan cambios automáticos en las capabilities y ciertas capabilities son requisito para poder modificar los UIDs libremente. Este artículo cubre ambos sistemas de manera conjunta para un mayor entendimiento de cómo el sistema opera con los procesos.

## Ubicación de las credenciales en el Kernel

Las credenciales no son campos directos de `task_struct` (estructura de datos que representa a un proceso en el kernel). En su lugar, `task_struct` contiene dos punteros protegidos por RCU ([Read-Copy Update](https://handwiki.org/wiki/Read-copy-update)) a una estructura separada:

```c
const struct cred __rcu *real_cred;  // Contexto objetivo (identidad real)
const struct cred __rcu *cred;       // Contexto subjetivo (identidad activa)
```

- El **contexto subjetivo** (`*cred`) es el que el kernel comprueba cuando el proceso actúa **sobre otros objetos**: abrir ficheros, enviar señales, acceder a IPC.
- El **contexto objetivo** (`*real_cred`) es el que el kernel comprueba cuando **otros procesos actúan sobre este**: enviarle señales, adjuntarse vía `ptrace`.

!!! note ""
    Generalmente, ambos punteros referencian la misma instancia `struct cred`.

La `struct cred` contiene toda la información de identidad y privilegios del proceso:

```c
struct cred {
    // ...
    kuid_t uid;     // Real UID
    kgid_t gid;     // Real GID
    kuid_t suid;    // Saved set-user-ID
    kgid_t sgid;    // Saved set-group-ID
    kuid_t euid;    // Effective UID
    kgid_t egid;    // Effective GID
    kuid_t fsuid;   // Filesystem UID
    kgid_t fsgid;   // Filesystem GID
    unsigned securebits;
    kernel_cap_t cap_inheritable;
    kernel_cap_t cap_permitted;
    kernel_cap_t cap_effective;
    kernel_cap_t cap_bset;
    kernel_cap_t cap_ambient;
    // ...
    struct group_info *group_info;   // Contiene los supplementary groups
};
```

!!! note "Evaluación de permisos en ficheros"
    La evaluación de permisos en un archivo sigue una jerarquía estricta, primero se comprueba si el UID efectivo del proceso coincide con el UID propietario del archivo, en cuyo caso se aplican los permisos de propietario, si no, se verifica si alguno de los GIDs del proceso (efectivo o supplementary) coincide con el GID del archivo, aplicándose los permisos de grupo y si no hay coincidencias, se aplican los permisos de otros.

!!! info ""
    Los supplementary groups son los grupos adicionales asociados a un usuario que permiten que un proceso tenga múltiples pertenencias a grupos simultáneamente.

Cuando un proceso quiere cambiar algún UID, la operación se realiza entrando al modo kernel mediante una syscall (por ejemplo, `setuid`), lo que provoca la transición de la CPU de **ring 3 (user mode) a ring 0 (kernel mode)**. Una vez en kernel mode, el handler de la syscall comprueba si el proceso tiene permiso para realizar el cambio a partir de los valores UIDs actuales y de sus capabilities. Si la operación es viable, el kernel entra en su subsistema de credenciales y aplica un patrón seguro de actualización, primero llama a `prepare_creds` para clonar el `struct cred` actual del proceso, después modifica los campos relevantes (UID, EUID, GID o capabilities según corresponda) y finalmente ejecuta `commit_creds` para sustituir de forma atómica las credenciales activas del proceso.

!!! danger ""
    Desde la perspectiva ofensiva, `prepare_kernel_cred(NULL)` genera un `struct cred` con UIDs a 0 y capabilities al máximo. La combinación `commit_creds(prepare_kernel_cred(NULL))` es el patrón estándar de escalada de privilegios en kernel exploits.

## UIDs

Cuando un usuario ejecuta un programa, el sistema operativo no utiliza directamente su nombre de usuario, sino que hace uso de un identificador numérico llamado UID. Este UID representa la identidad del usuario dentro del sistema y queda asociado a todos los procesos que este ejecuta. El kernel utiliza ese identificador para aplicar las políticas de permisos y control de acceso.

Cada proceso en ejecución mantiene un conjunto de identidades relacionadas con el UID. Esto se debe a que, en determinadas situaciones (especialmente cuando intervienen privilegios elevados), un proceso puede necesitar comportarse con identidades distintas según el contexto. Por esta razón, el sistema diferencia entre varios tipos de UID:

- **Real UID (RUID)**: Identifica al usuario que originalmente creó el proceso. El RUID es lo que el kernel consulta al aplicar los límites de recursos (`RLIMIT_NPROC`) y el que determina al propietario del proceso para el envío de señales.
- **Effective UID (EUID)**: Es el identificador que el kernel comprueba durante las decisiones de control de acceso.
- **Saved Set-User-ID (SUID)**: Actúa como un slot de almacenamiento para un EUID previamente poseído. Su propósito es permitir que un proceso abandone temporalmente sus privilegios (cambiando el EUID a un valor no privilegiado) y los recupere más tarde (restaurando el EUID al valor preservado en el SUID).

!!! note ""
    Cuando el kernel carga un ejecutable con el bit setuid activado, establece el EUID y el SUID al UID del propietario del fichero, manteniendo el RUID como el del usuario original.

### Syscalls de Consulta

#### **GETRESUID (n 118)**

`getresuid` es una llamada al sistema que **devuelve simultáneamente los tres UIDs asociados al proceso** y los escribe en tres buffers de usuario.

**Entradas (argumentos de la syscall)**

```nasm
rax = 118           ; Número de syscall (getresuid)
rdi = ruid          ; Puntero a uid_t donde escribir el real UID
rsi = euid          ; Puntero a uid_t donde escribir el effective UID
rdx = suid          ; Puntero a uid_t donde escribir el saved set-user-ID
```

- `ruid` (RDI) — Puntero a una región de memoria escribible de al menos 4 bytes (`uid_t` = 32 bits). El kernel escribe aquí el **real UID** actual.
- `euid` (RSI) — Puntero a una región de memoria escribible de al menos 4 bytes (`uid_t` = 32 bits). El kernel escribe aquí el **effective UID** actual.
- `suid` (RDX) — Puntero a una región de memoria escribible de al menos 4 bytes (`uid_t` = 32 bits). El kernel escribe aquí el **saved set-user-ID**.

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error
```

Errores comunes:

- `14` → `EFAULT`: alguno de los tres punteros apunta a memoria inaccesible o no escribible.

### Syscalls de Modificación

#### **SETRESUID (n 117)**

`setresuid` establece de forma atómica e independiente los tres UIDs del proceso (real, effective y saved) en una sola invocación. Cada argumento acepta -1 para preservar el valor actual.

**Entradas (argumentos de la syscall)**

```nasm
rax = 117            ; Número de syscall (setresuid)
rdi = ruid           ; Nuevo real UID (o -1 para no cambiar)
rsi = euid           ; Nuevo effective UID (o -1 para no cambiar)
rdx = suid           ; Nuevo saved set-user-ID (o -1 para no cambiar)
```

!!! note ""
    Sin `CAP_SETUID`, cada argumento debe ser -1 o un valor ya presente en alguno de los tres IDs actuales del proceso (se pueden redistribuir entre posiciones y repetir), pero no introducir valores nuevos. Con `CAP_SETUID` no hay restricción.

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error (semántica todo-o-nada)
```

Errores comunes:

- `1` → `EPERM`: el proceso no tiene `CAP_SETUID` y alguno de los tres valores solicitados no coincide con ninguno de los tres IDs actuales (`ruid`, `euid`, `suid`).
- `22` → `EINVAL`: alguno de los UIDs está fuera del rango válido del user namespace.
- `11` → `EAGAIN`: el cambio de `ruid` excedería `RLIMIT_NPROC` del UID destino.

## GIDs

El modelo de GIDs: Real GID (RGID), Effective GID (EGID) y Saved set-group-ID (SGID) siguen la misma semántica, pero aplicada al control de acceso basado en grupos.

---

Existe un cuarto par, **FSUID** y **FSGID**, utilizado exclusivamente para comprobaciones de acceso al filesystem. En kernels modernos, el FSUID sigue al EUID automáticamente en la mayoría de escenarios y rara vez se manipula de forma independiente. No lo cubriremos aquí, pero existe dentro del mismo `struct cred`.

### Syscalls de Consulta

#### **GETRESGID (n 120)**

`getresgid` es una llamada al sistema que **devuelve simultáneamente los tres GIDs asociados al proceso** y los escribe en tres buffers de usuario. Es la contrapartida exacta de `getresuid` pero operando sobre identificadores de grupo.

**Entradas (argumentos de la syscall)**

```nasm
rax = 120   ; Número de syscall (getresgid)
rdi = rgid  ; Puntero a gid_t donde escribir el real GID (4 bytes)
rsi = egid  ; Puntero a gid_t donde escribir el effective GID (4 bytes)
rdx = sgid  ; Puntero a gid_t donde escribir el saved set-group-ID (4 bytes)
```

- `rgid` (RDI) — Dirección donde el kernel escribirá el **real GID** del proceso como un `gid_t` (4 bytes, entero sin signo). El real GID representa al grupo del usuario que lanzó el proceso en su origen.
- `egid` (RSI) — Dirección donde el kernel escribirá el **effective GID**, que es el que el kernel usa de forma efectiva para los chequeos de permisos DAC sobre ficheros, IPC SysV, señales, etc.
- `sgid` (RDX) — Dirección donde el kernel escribirá el **saved set-group-ID**. Su propósito es permitir al proceso recuperar un EGID anterior.

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error
```

Errores comunes:

- `14` → `EFAULT`: alguno de los tres punteros (`rgid`, `egid`, `sgid`) apunta a memoria no escribible, no mapeada o fuera del espacio virtual del proceso.

En la práctica, una llamada a `getresgid` con punteros válidos a memoria del propio proceso **nunca devuelve error**.

### Syscalls de Modificación

#### **SETRESGID (n 119)**

`setresgid` es una llamada al sistema que **establece de forma atómica los tres GIDs del proceso** en una única operación. Es la contrapartida de `setresuid` aplicada a identificadores de grupo y constituye la forma más explícita y predecible de manipular los GIDs.

**Entradas (argumentos de la syscall)**

```nasm
rax = 119   ; Número de syscall (setresgid)
rdi = rgid  ; Nuevo real GID       (-1 para no modificar)
rsi = egid  ; Nuevo effective GID  (-1 para no modificar)
rdx = sgid  ; Nuevo saved set-group-ID  (-1 para no modificar)
```

!!! note ""
    Sin `CAP_SETGID`, cada argumento debe ser -1 o un valor ya presente en alguno de los tres GIDs actuales del proceso (se pueden redistribuir entre posiciones y repetir), pero no introducir valores nuevos. Con `CAP_SETGID` no hay restricción.

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error (semántica todo-o-nada)
```

Errores comunes:

- `1` → `EPERM`: el proceso no tiene `CAP_SETGID` en su user namespace y al menos uno de los valores solicitados (`rgid`, `egid`, o `sgid`) no coincide con ninguno de los GIDs actuales de la terna.
- `22` → `EINVAL`: alguno de los valores no es un GID válido en el user namespace actual.
- `11` → `EAGAIN`: el cambio provocaría que el número de procesos del nuevo Real GID excediera `RLIMIT_NPROC`. Solo se dispara cuando se modifica el `rgid`.

## Capabilities

El modelo Unix tradicional es binario, EUID=0 otorga todos los privilegios, cualquier otro EUID no otorga ninguno. Las capabilities descomponen ese poder monolítico en 41 bits independientes (desde `CAP_CHOWN=0` hasta `CAP_CHECKPOINT_RESTORE=40`), cada uno controlando un subconjunto de operaciones, esto permite asignar a un proceso únicamente aquellos privilegios que son necesarios para su funcionamiento.

### Los cinco conjuntos

- **Permitted (P)**: Conjunto completo de privilegios del proceso. Solo puede reducirse, nunca ampliarse. Ningún otro conjunto puede tener un bit que no esté en P (excepto bounding, que es independiente).
- **Effective (E)**: Conjunto que el kernel comprueba en cada acción privilegiada. Un proceso puede tener el privilegio `CAP_SYS_RESOURCE` en P sin tenerlo en E, este privilegio no tendría efecto hasta que sea activado estableciendo el bit correspondiente a 1 en el effective set.
- **Inheritable (I)**: Controla qué capabilities pueden propagarse a través de `execve` cuando el binario tiene [file capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html). Para activar un bit, debe estar en P y en B (o tener `CAP_SETPCAP` en E).
- **Bounding set (B)**: Límite superior para lo que puede adquirirse durante `execve`. Solo puede reducirse (`PR_CAPBSET_DROP`).
- **Ambient (A)**: Permite establecer qué capabilities se propagan a través de `execve` si el binario no tiene privilegios especiales (file capabilities o setuid/setgid).

### Syscalls de Consulta

#### **CAPGET (n 125)**

`capget` es la interfaz del kernel que permite **leer las capabilities** de un proceso/hilo. A diferencia de `capset` (que solo puede operar sobre el hilo que lo invoca), `capget` permite consultar las capabilities de **cualquier proceso o hilo** del sistema especificando su PID o TID, lo que la convierte en una herramienta de reconocimiento fundamental en fases de post-explotación.

**Entradas (argumentos de la syscall)**

```nasm
rax = 125            ; Número de syscall (capget)
rdi = hdrp           ; Puntero a struct __user_cap_header_struct
rsi = datap          ; Puntero a struct __user_cap_data_struct[2] (o NULL)
```

- `hdrp` (RDI) — Puntero a la cabecera.

    Puntero a una estructura `__user_cap_header_struct` que indica la versión del protocolo de capabilities y el hilo objetivo. No puede ser NULL.

    ```c
    struct __user_cap_header_struct {
        __u32 version;    // Versión del protocolo   (4 bytes)
        int   pid;        // TID/PID del objetivo (0 = actual)  (4 bytes)
    };
    ```

    - `version` debe ser `_LINUX_CAPABILITY_VERSION_3` (`0x20080522`). Esta es la única versión vigente y soporta hasta 64 capabilities (representadas en dos `u32`, uno por cada mitad de 32 bits).

- `datap` (RSI) — Puntero al buffer de salida.

    Puntero a un array de dos estructuras `__user_cap_data_struct` contiguas en memoria donde el kernel escribirá las capabilities del objetivo. `datap[0]` recibe los bits para las capabilities 0–31 y `datap[1]` para las capabilities 32–63.

    ```c
    struct __user_cap_data_struct {
        __u32 effective;     // Capabilities activas (las que el kernel comprueba)
        __u32 permitted;     // Techo: superset de effective e inheritable
        __u32 inheritable;   // Capabilities propagables a través de execve
    };
    ```

    **Layout en memoria tras `capget` exitoso (versión 3):**

    ```nasm
    datap (RSI) ──→ ┌──────────────────────────────────────┐
                    │ datap[0].effective     (caps 0–31)   │ offset +0   ← kernel escribe
                    │ datap[0].permitted     (caps 0–31)   │ offset +4   ← kernel escribe
                    │ datap[0].inheritable   (caps 0–31)   │ offset +8   ← kernel escribe
                    ├──────────────────────────────────────┤
                    │ datap[1].effective     (caps 32–63)  │ offset +12  ← kernel escribe
                    │ datap[1].permitted     (caps 32–63)  │ offset +16  ← kernel escribe
                    │ datap[1].inheritable   (caps 32–63)  │ offset +20  ← kernel escribe
                    └──────────────────────────────────────┘
                             Total: 24 bytes
    ```

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error
```

Errores comunes:

- `14` → `EFAULT`: `hdrp` apunta a memoria inaccesible (no puede ser NULL) o `datap` apunta a memoria no escribible y no es NULL.
- `22` → `EINVAL`: campo `version` en el header no es una versión reconocida. El kernel sobrescribe `version` con la versión preferida (`0x20080522`). Este error es esperado cuando se usa `capget` para sondear la versión.
- `3` → `ESRCH`: no existe ningún proceso/hilo con el PID/TID especificado.

### Syscalls de Modificación

#### **CAPSET (n 126)**

`capset` es la interfaz del kernel que permite **establecer las capabilities** del hilo que la invoca. Las capabilities son el mecanismo de Linux que descompone los privilegios del superusuario en unidades discretas, en lugar de ser root o no serlo, un proceso puede poseer subconjuntos específicos de privilegios (abrir raw sockets, montar filesystems, hacer `ptrace`, etc.).

**Entradas (argumentos de la syscall)**

```nasm
rax = 126            ; Número de syscall (capset)
rdi = hdrp           ; Puntero a struct __user_cap_header_struct
rsi = datap          ; Puntero a struct __user_cap_data_struct[2]
```

- `hdrp` (RDI) — Puntero a la cabecera (misma estructura que en `capget`). `version` debe ser `0x20080522`. `pid` solo permite `0` o el propio TID en kernels modernos.

- `datap` (RSI) — Puntero a los datos de capabilities.

    Puntero a un **array de dos** estructuras `__user_cap_data_struct` contiguas en memoria. `datap[0]` contiene los bits para las capabilities 0–31 y `datap[1]` para las capabilities 32–63.

    **Layout en memoria (con versión 3):**

    ```nasm
    datap (RSI) ──→ ┌──────────────────────────────────────┐
                    │ datap[0].effective     (caps 0–31)   │ offset +0
                    │ datap[0].permitted     (caps 0–31)   │ offset +4
                    │ datap[0].inheritable   (caps 0–31)   │ offset +8
                    ├──────────────────────────────────────┤
                    │ datap[1].effective     (caps 32–63)  │ offset +12
                    │ datap[1].permitted     (caps 32–63)  │ offset +16
                    │ datap[1].inheritable   (caps 32–63)  │ offset +20
                    └──────────────────────────────────────┘
                             Total: 24 bytes
    ```

**Valores de retorno**

```nasm
rax = 0              ; Éxito
rax < 0              ; Error
```

Errores comunes:

- `14` → `EFAULT`: `hdrp` o `datap` apuntan a memoria inaccesible. `hdrp` nunca puede ser NULL.
- `22` → `EINVAL`: campo `version` en el header no es una versión reconocida. El kernel sobrescribe `version` con la versión preferida (`0x20080522`), esto permite sondear la versión soportada.
- `1` → `EPERM`: se intentó añadir una capability al **permitted** set (el permitted solo puede reducirse), se intentó activar en **effective** una capability que no está en **permitted**, se intentó añadir al **inheritable** una capability que no está en el **bounding set** o que no está en **permitted** y el proceso carece de `CAP_SETPCAP` en effective, o se intentó modificar capabilities de un hilo diferente al actual.
- `3` → `ESRCH`: el PID/TID especificado no existe (solo ocurre si se pasa un pid no-cero distinto del propio en kernels que lo permiten).

### Capabilities Relevantes desde el Contexto Ofensivo

**Capabilities 0–31:**

| Índice | Constante | Uso ofensivo |
|--------|-----------|-------------|
| 0 | `CAP_CHOWN` | Cambiar propietario de cualquier archivo |
| 1 | `CAP_DAC_OVERRIDE` | Bypass total de permisos de lectura/escritura/ejecución en archivos |
| 2 | `CAP_DAC_READ_SEARCH` | Bypass de permisos de lectura en archivos y búsqueda en directorios |
| 3 | `CAP_FOWNER` | Bypass de comprobaciones de propietario en operaciones sobre archivos |
| 5 | `CAP_KILL` | Enviar señales a cualquier proceso (sin restricción de UID) |
| 6 | `CAP_SETGID` | Manipular GIDs del proceso (`setgid`, `setregid`, `setresgid`) |
| 7 | `CAP_SETUID` | Manipular UIDs del proceso (`setuid`, `setreuid`, `setresuid`) |
| 8 | `CAP_SETPCAP` | Modificar el inheritable set y el bounding set del propio proceso, además de gestionar ciertos securebits |
| 10 | `CAP_NET_BIND_SERVICE` | Bind a puertos privilegiados (< 1024) |
| 12 | `CAP_NET_ADMIN` | Configuración de red: interfaces, rutas, firewall, sniffing promiscuo |
| 13 | `CAP_NET_RAW` | Crear raw sockets y packet sockets (captura de tráfico, inyección de paquetes) |
| 16 | `CAP_SYS_MODULE` | Cargar y descargar módulos del kernel (`init_module`, `delete_module`) |
| 17 | `CAP_SYS_RAWIO` | Acceso directo a I/O: `ioperm`, `iopl`, `/dev/mem`, `/dev/kmem` |
| 18 | `CAP_SYS_CHROOT` | Invocar chroot (escape de chroot jails si se combina con otras caps) |
| 19 | `CAP_SYS_PTRACE` | `ptrace` sobre cualquier proceso |
| 21 | `CAP_SYS_ADMIN` | Capability comodín: mount, umount, namespaces, BPF, CRIU, syslog, etc. |
| 24 | `CAP_SYS_RESOURCE` | Sobrepasar límites de recursos (`RLIMIT_*`, cuotas de disco) |
| 25 | `CAP_SYS_TIME` | Modificar el reloj del sistema |
| 27 | `CAP_MKNOD` | Crear device nodes (`mknod`) |
| 31 | `CAP_SETFCAP` | Establecer file capabilities en ejecutables |

**Capabilities 32–63:**

| Índice | Constante | Uso ofensivo |
|--------|-----------|-------------|
| 33 | `CAP_MAC_ADMIN` | Sobrepasar políticas MAC (Smack, AppArmor en ciertos modos) |
| 34 | `CAP_SYSLOG` | Leer el ring buffer del kernel (`dmesg`), podría filtrar direcciones KASLR |
| 37 | `CAP_AUDIT_READ` | Leer registros de auditoría vía multicast netlink |
| 38 | `CAP_PERFMON` | Performance monitoring, acceso a `perf_events`. Combinada con `CAP_BPF` permite cargar programas BPF de tracing |
| 39 | `CAP_BPF` | Operaciones BPF, crear maps, cargar programas, acceso avanzado al verificador, con `CAP_NET_ADMIN` permite programas BPF de red |
| 40 | `CAP_CHECKPOINT_RESTORE` | Operaciones de checkpoint/restore (CRIU) |

## Transiciones de UID y Capabilities

### El concepto de UID Fixup

La premisa de diseño define que si un proceso deja de ser root, las capabilities que tenía por el hecho de serlo deberían desaparecer. De lo contrario, un proceso con UID 1000 y `CAP_SYS_ADMIN` sería tan peligroso como root pero invisible para herramientas que solo comprueban el UID.

El UID fixup es el mecanismo que implementa esta premisa. Cada vez que un proceso modifica sus UIDs (vía `setresuid`, `setreuid` o `setuid`), el kernel evalúa si la transición implica un cambio en el nivel de privilegio y ajusta los conjuntos de capabilities en consecuencia. El ajuste opera en ambas direcciones, un proceso que abandona root pierde capabilities y un proceso que obtiene EUID=0 recupera capabilities desde su permitted set.

El fixup evita que un proceso pueda degradar su UID para evadir la detección mientras retiene privilegios completos. Pero también crea un problema para cualquier herramienta que necesite legítimamente operar con UIDs no privilegiados y capabilities activas. Los mecanismos de retención (`SECURE_KEEP_CAPS` y securebits, cubiertos más adelante) existen precisamente para los casos en los que el comportamiento por defecto del fixup es demasiado agresivo.

**Implementación mediante `cap_emulate_setxuid`**

La función está compuesta por tres bloques condicionales independientes que se evalúan secuencialmente:

```c
static int cap_task_fix_setuid(struct cred *new, const struct cred *old, int flags)
{
    switch (flags) {
    case LSM_SETID_RE:
    case LSM_SETID_ID:
    case LSM_SETID_RES:
        /* Si SECURE_NO_SETUID_FIXUP está activo, no se realizan modificaciones */
        if (!issecure(SECURE_NO_SETUID_FIXUP))
            cap_emulate_setxuid(new, old);
        break;
    // ...
    }
    return 0;
}

static inline void cap_emulate_setxuid(struct cred *new, const struct cred *old)
{
    kuid_t root_uid = make_kuid(old->user_ns, 0);

    /* Bloque 1: Abandono total de root */
    if ((uid_eq(old->uid, root_uid) ||
         uid_eq(old->euid, root_uid) ||
         uid_eq(old->suid, root_uid)) &&
        (!uid_eq(new->uid, root_uid) &&
         !uid_eq(new->euid, root_uid) &&
         !uid_eq(new->suid, root_uid))) {
        if (!issecure(SECURE_KEEP_CAPS)) {
            cap_clear(new->cap_permitted);
            cap_clear(new->cap_effective);
        }
        cap_clear(new->cap_ambient);
    }

    /* Bloque 2: Pérdida de EUID=0 */
    if (uid_eq(old->euid, root_uid) && !uid_eq(new->euid, root_uid))
        cap_clear(new->cap_effective);

    /* Bloque 3: Ganancia de EUID=0 */
    if (!uid_eq(old->euid, root_uid) && uid_eq(new->euid, root_uid))
        new->cap_effective = new->cap_permitted;
}
```

| Bloque | Condición | Qué ocurre | Efecto sobre capabilities |
|--------|-----------|------------|--------------------------|
| **Bloque 1** | El proceso **tenía al menos uno de sus UIDs = 0** (RUID, EUID o SUID) y **después ninguno es 0** | El proceso abandona completamente privilegios de root | Si `SECURE_KEEP_CAPS` **no** está activado, se limpian `cap_permitted` y `cap_effective`. Siempre se limpia `cap_ambient`. |
| **Bloque 2** | **EUID era 0 y deja de serlo** | El proceso pierde el **EUID root** | Se limpia `cap_effective`. Esta acción es independiente del valor de `SECURE_KEEP_CAPS`. |
| **Bloque 3** | **EUID no era 0 y pasa a serlo** | El proceso gana el **EUID root** | Las `cap_effective` pasan a ser iguales a `cap_permitted`. |

### Mecanismos de Retención

Ante el problema de que la degradación de UIDs borre las capabilities existen dos soluciones, con propiedades diferentes:

#### **PR_SET_KEEPCAPS (`prctl` option 8)**

Controla si el proceso conserva sus capabilities en el conjunto permitted (P) cuando cambia sus UIDs.

```nasm
mov rax, 157
mov rdi, 8              ; PR_SET_KEEPCAPS
mov rsi, value           ; 1 = activar
syscall
```

- `value` (RSI):
    - 0 → comportamiento por defecto, cuando un proceso con UID 0 (root) transiciona todos sus UIDs (real, effective, saved) a valores non-zero (ej. `setresuid(1000, 1000, 1000)`), el kernel limpia los conjuntos permitted, effective y ambient.
    - 1 → las capabilities del conjunto permitted se conservan tras la transición de UIDs. Los conjuntos effective y ambient se borran igualmente (`PR_SET_KEEPCAPS` solo protege el permitted set). Las capabilities pueden recuperarse después, desde permitted a effective usando la syscall `capset` y desde permitted a ambient usando `PR_CAP_AMBIENT_RAISE` (requiere que la capability también esté en inheritable).

!!! danger ""
    Un proceso que arranca como root puede hacer `prctl(PR_SET_KEEPCAPS, 1)`, luego `setuid(1000)` para aparentar ser un usuario normal y conservar capabilities críticas como `CAP_NET_RAW`, `CAP_DAC_READ_SEARCH` o `CAP_SYS_PTRACE` en su permitted set. Desde ahí, puede elevarlas al effective set o propagarlas vía ambient capabilities. Herramientas que solo alertan sobre procesos ejecutándose como root no detectarán un proceso con UID 1000 que retiene capabilities privilegiadas.

#### **PR_SET_SECUREBITS (`prctl` option 28)**

Establece los secure bits del proceso. Los securebits controlan de forma granular cómo el kernel maneja las capabilities durante las transiciones de UID y `execve`. **Requiere `CAP_SETPCAP` en el effective set.**

```nasm
mov rax, 157
mov rdi, 28             ; PR_SET_SECUREBITS
mov rsi, flags          ; Bitmask de securebits
syscall
```

`flags` (RSI) — Bitmask combinable con OR:

- `SECBIT_NOROOT` = `0x01` → Desactiva el tratamiento especial de UID 0 en `execve`. Normalmente, si un proceso con UID 0 hace `execve`, el kernel le otorga full capabilities. Con `NOROOT`, UID 0 ya no recibe capabilities automáticas, solo las obtiene si el binario tiene file capabilities explícitas.
- `SECBIT_NOROOT_LOCKED` = `0x02` → Bloquea `SECBIT_NOROOT` para que no pueda ser desactivado.
- `SECBIT_NO_SETUID_FIXUP` = `0x04` → Desactiva todo ajuste automático de capabilities al cambiar UIDs. Ni permitted, ni effective, ni ambient se modifican. Si este bit está activo, `KEEP_CAPS` es redundante (es un subconjunto). A diferencia de `KEEP_CAPS`, no se borra en `execve`.
- `SECBIT_NO_SETUID_FIXUP_LOCKED` = `0x08` → Bloquea `SECBIT_NO_SETUID_FIXUP` para que no pueda ser desactivado.
- `SECBIT_KEEP_CAPS` = `0x10` → Cuando root baja a UID non-zero, el kernel no borra el permitted set. El effective y ambient sí se borran, pero las capabilities quedan en permitted y se pueden recuperar después. Se borra automáticamente en cada `execve`.
- `SECBIT_KEEP_CAPS_LOCKED` = `0x20` → Bloquea `SECBIT_KEEP_CAPS` para que no pueda ser desactivado.
- `SECBIT_NO_CAP_AMBIENT_RAISE` = `0x40` → Impide usar `PR_CAP_AMBIENT_RAISE`. Si está activo, nadie puede añadir capabilities al ambient set. Cierra esa vía de propagación.
- `SECBIT_NO_CAP_AMBIENT_RAISE_LOCKED` = `0x80` → Bloquea `SECBIT_NO_CAP_AMBIENT_RAISE` para que no pueda ser desactivado.

Un proceso que arranca con UID 0 activa `SECBIT_NO_SETUID_FIXUP` + `SECBIT_NO_SETUID_FIXUP_LOCKED`, luego hace `setresuid(1000,1000,1000)`. El resultado es un proceso que aparenta ser UID 1000 pero que conserva todas sus capabilities intactas (todos los conjuntos), y nadie (ni siquiera root) puede revertir esa configuración porque el bit locked es irreversible.

## Herencia de Credenciales: `fork`, `clone` y `execve`

El estado inicial de credenciales de un proceso depende de cómo fue creado.

### `fork` / `clone`

`fork` y `clone` crean un nuevo proceso hijo con una **copia exacta** de las credenciales del padre. Los tres UIDs, los tres GIDs y los cinco conjuntos de capabilities se duplican. El hijo arranca con el mismo `struct cred` (compartido por referencia inicialmente, clonado en la primera modificación gracias al patrón copy-on-write).

Esto implica que un proceso que ha escalado a root y maximizado capabilities antes de hacer `fork`/`clone` producirá un hijo con las mismas credenciales elevadas.

### `execve` y el bit setuid

`execve` reemplaza la imagen del proceso actual por la del invocado, **recalculando las credenciales** según las propiedades del nuevo binario:

**Sin bit setuid**: RUID, EUID y SUID permanecen sin cambios. Las capabilities se recalculan según las fórmulas de transición descritas anteriormente.

**Con bit setuid activado** (`chmod u+s`): el kernel establece el EUID y el SUID al UID del propietario del fichero ejecutable. El RUID se mantiene. El estado de credenciales resultante:

```c
Antes de execve:  RUID=1000, EUID=1000, SUID=1000
Binario con setuid propiedad de root (uid=0, u+s)
Después de execve: RUID=1000, EUID=0, SUID=0
```

## Credenciales y User Namespaces

En un user namespace, los UIDs se remapean. Un proceso con UID 0 dentro de un user namespace no tiene privilegios de root en el namespace padre (los UIDs son relativos al namespace). `CLONE_NEWUSER` crea un user namespace donde el proceso obtiene capabilities completas, pero solo dentro de ese namespace. Las operaciones sobre el namespace padre siguen sujetas a las credenciales originales.

## Agradecimientos

Gracias por llegar hasta aquí.

Si encuentras errores o quieres mejorar/ampliar el artículo, el contenido del blog está abierto a Pull Requests. Toda contribución es bienvenida.

¡Nos vemos en el próximo artículo! ;)
