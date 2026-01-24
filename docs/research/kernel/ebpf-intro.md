---
title: Introducción a eBPF
description: Extended Berkeley Packet Filter - hooking del kernel moderno
tags:
  - kernel
  - ebpf
  - linux
---

# Introducción a eBPF

**eBPF** (extended Berkeley Packet Filter) es una tecnología revolucionaria que permite ejecutar programas sandboxed en el kernel de Linux sin modificar el código fuente del kernel ni cargar módulos.

---

## // ¿Qué es eBPF?

eBPF actúa como una máquina virtual dentro del kernel que puede ejecutar código de forma segura y eficiente. Originalmente diseñado para filtrado de paquetes, ahora se usa para:

- **Observabilidad**: Tracing, profiling, monitorización
- **Networking**: Load balancing, firewalls, packet processing
- **Seguridad**: Sandboxing, detección de intrusiones
- **Offensive**: Rootkits, evasión, manipulación de syscalls

```
┌─────────────────────────────────────────────────────────┐
│                     USER SPACE                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Application │  │    bpftool  │  │  libbpf     │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
├─────────┼────────────────┼────────────────┼─────────────┤
│         │                │                │             │
│         ▼                ▼                ▼             │
│  ┌──────────────────────────────────────────────┐      │
│  │              BPF SYSCALL INTERFACE            │      │
│  └──────────────────────────────────────────────┘      │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────┐      │
│  │               BPF VERIFIER                    │      │
│  │    (Safety checks, bounds checking)           │      │
│  └──────────────────────────────────────────────┘      │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────┐      │
│  │              JIT COMPILER                     │      │
│  │    (Convert BPF bytecode to native code)      │      │
│  └──────────────────────────────────────────────┘      │
│                          │                              │
│                          ▼                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ kprobes │ │ uprobes │ │tracepoints│ │ XDP   │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                     KERNEL SPACE                        │
└─────────────────────────────────────────────────────────┘
```

---

## // Hook Points

eBPF puede attacharse a diferentes puntos del kernel:

### Kprobes / Kretprobes

Permiten interceptar cualquier función del kernel.

```c
SEC("kprobe/sys_execve")
int trace_execve(struct pt_regs *ctx)
{
    // Log every execve call
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    bpf_printk("execve by: %s\n", comm);
    return 0;
}
```

### Tracepoints

Puntos de instrumentación estables definidos en el kernel.

```c
SEC("tracepoint/syscalls/sys_enter_openat")
int trace_openat(struct trace_event_raw_sys_enter *ctx)
{
    char filename[256];
    bpf_probe_read_user_str(filename, sizeof(filename), 
                            (void *)ctx->args[1]);
    bpf_printk("openat: %s\n", filename);
    return 0;
}
```

### XDP (eXpress Data Path)

Procesamiento de paquetes a muy bajo nivel, antes incluso del stack de red.

```c
SEC("xdp")
int xdp_filter(struct xdp_md *ctx)
{
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;
    
    struct ethhdr *eth = data;
    if ((void *)eth + sizeof(*eth) > data_end)
        return XDP_PASS;
    
    // Drop all non-IP packets
    if (eth->h_proto != htons(ETH_P_IP))
        return XDP_DROP;
    
    return XDP_PASS;
}
```

---

## // Estructura de un Programa eBPF

### Componentes Básicos

```c
// 1. Headers
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

// 2. Maps (para compartir datos)
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, __u32);
    __type(value, __u64);
} my_map SEC(".maps");

// 3. Programa BPF
SEC("kprobe/__x64_sys_write")
int BPF_KPROBE(trace_write, int fd, const void *buf, size_t count)
{
    __u32 pid = bpf_get_current_pid_tgid() >> 32;
    __u64 *value = bpf_map_lookup_elem(&my_map, &pid);
    
    if (value)
        __sync_fetch_and_add(value, count);
    else {
        __u64 init = count;
        bpf_map_update_elem(&my_map, &pid, &init, BPF_ANY);
    }
    
    return 0;
}

// 4. License (requerida)
char LICENSE[] SEC("license") = "GPL";
```

---

## // Compilación y Carga

### Compilar con clang

```bash
clang -O2 -target bpf -c program.bpf.c -o program.bpf.o

# Con BTF (mejor compatibilidad)
clang -O2 -g -target bpf \
    -D__TARGET_ARCH_x86 \
    -c program.bpf.c -o program.bpf.o
```

### Cargar con bpftool

```bash
# Cargar programa
sudo bpftool prog load program.bpf.o /sys/fs/bpf/my_prog

# Ver programas cargados
sudo bpftool prog list

# Attach a kprobe
sudo bpftool prog attach pinned /sys/fs/bpf/my_prog kprobe __x64_sys_execve
```

### Usando libbpf (Skeleton)

```c
#include "program.skel.h"

int main(void)
{
    struct program_bpf *skel;
    
    skel = program_bpf__open_and_load();
    if (!skel) {
        fprintf(stderr, "Failed to load BPF\n");
        return 1;
    }
    
    program_bpf__attach(skel);
    
    // ... main loop ...
    
    program_bpf__destroy(skel);
    return 0;
}
```

---

## // Casos de Uso Ofensivos

!!! danger "Educational Purposes Only"
    Esta sección es puramente educativa para entender las capacidades de eBPF desde una perspectiva de seguridad.

### Syscall Monitoring (Evasión de Detección)

Un atacante puede usar eBPF para detectar cuando herramientas de seguridad están siendo ejecutadas:

```c
SEC("kprobe/__x64_sys_execve")
int detect_security_tools(struct pt_regs *ctx)
{
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    
    // Detectar herramientas de análisis
    if (comm[0] == 's' && comm[1] == 't' && 
        comm[2] == 'r' && comm[3] == 'a' &&
        comm[4] == 'c' && comm[5] == 'e') {
        // strace detected - take evasive action
    }
    
    return 0;
}
```

### Manipulación de Datos en Tránsito

```c
// Modificar respuestas de red en XDP
SEC("xdp")
int modify_packet(struct xdp_md *ctx)
{
    // Parse packet headers...
    // Modify payload if matches criteria
    // Recalculate checksums
    return XDP_TX;  // Transmit modified packet
}
```

---

## // Detección de eBPF Malicioso

### Indicadores

```bash
# Listar programas BPF cargados
sudo bpftool prog list

# Ver maps
sudo bpftool map list

# Inspeccionar programa específico
sudo bpftool prog dump xlated id <ID>

# Ver attachments
sudo bpftool perf list
```

### Kernel Audit

```bash
# Habilitar auditoría de BPF
echo 1 > /proc/sys/kernel/unprivileged_bpf_disabled

# Logs de carga de BPF
dmesg | grep -i bpf
```

---

## // Recursos

!!! tip "Learning Path"
    1. [eBPF.io](https://ebpf.io/) - Documentación oficial
    2. [BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html) - Brendan Gregg
    3. [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap) - Templates
    4. [bcc](https://github.com/iovisor/bcc) - BPF Compiler Collection

---

## // Conclusión

eBPF representa una evolución significativa en cómo interactuamos con el kernel de Linux. Sus aplicaciones van desde observabilidad hasta seguridad ofensiva, y su adopción está creciendo rápidamente en la industria.

En próximos artículos exploraremos:

- Desarrollo de un rootkit básico con eBPF
- Técnicas de evasión usando XDP
- Detección y hunting de eBPF malicioso

---

<div class="card-meta" style="justify-content: center; border-top: none; padding-top: 2rem;">
  <span>Publicado: 2025-01-09</span>
  <span>|</span>
  <span>Autor: 0x574R</span>
</div>
