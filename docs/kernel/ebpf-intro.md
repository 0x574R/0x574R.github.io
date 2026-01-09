# Introducción a eBPF

## ¿Qué es eBPF?

eBPF (extended Berkeley Packet Filter) es una tecnología que permite ejecutar código en el kernel de Linux sin modificarlo. Originalmente diseñado para filtrado de paquetes, ahora se usa para observabilidad, seguridad y networking.

```mermaid
graph LR
    A[Programa eBPF] --> B[Verificador]
    B --> C[JIT Compiler]
    C --> D[Kernel]
    D --> E[Hook Points]
```

## Casos de Uso en Seguridad

| Uso | Descripción |
|-----|-------------|
| **Tracing** | Monitorear syscalls, funciones del kernel |
| **Security** | Detectar comportamiento malicioso |
| **Rootkits** | Ocultar procesos, archivos, conexiones |
| **EDR Evasion** | Bypass de herramientas de seguridad |

## Arquitectura

### Hook Points

eBPF puede attacharse a varios puntos:

- **kprobes**: Cualquier función del kernel
- **tracepoints**: Puntos de trace predefinidos
- **XDP**: Procesamiento de paquetes en driver
- **LSM**: Linux Security Module hooks

### Maps

Estructuras de datos compartidas entre kernel y userspace:

```c
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u32);
    __type(value, u64);
} my_map SEC(".maps");
```

## Ejemplo: Tracing Syscalls

### Programa eBPF

```c
// trace_execve.bpf.c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

SEC("tracepoint/syscalls/sys_enter_execve")
int trace_execve(struct trace_event_raw_sys_enter *ctx) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    char comm[16];
    
    bpf_get_current_comm(&comm, sizeof(comm));
    bpf_printk("execve called by PID %d (%s)", pid, comm);
    
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

### Compilación

```bash
clang -O2 -target bpf -c trace_execve.bpf.c -o trace_execve.bpf.o
```

### Carga con bpftool

```bash
# Cargar programa
bpftool prog load trace_execve.bpf.o /sys/fs/bpf/trace_execve

# Attach al tracepoint
bpftool prog attach /sys/fs/bpf/trace_execve tracepoint syscalls sys_enter_execve

# Ver output
cat /sys/kernel/debug/tracing/trace_pipe
```

## Herramientas

### bpftool

```bash
# Listar programas cargados
bpftool prog list

# Ver maps
bpftool map list

# Dump de programa
bpftool prog dump xlated id <ID>
```

### libbpf + skeleton

=== "Generar skeleton"
    ```bash
    bpftool gen skeleton trace_execve.bpf.o > trace_execve.skel.h
    ```

=== "Userspace loader"
    ```c
    #include "trace_execve.skel.h"
    
    int main() {
        struct trace_execve_bpf *skel;
        
        skel = trace_execve_bpf__open_and_load();
        trace_execve_bpf__attach(skel);
        
        // Keep running...
        sleep(99999);
        
        trace_execve_bpf__destroy(skel);
        return 0;
    }
    ```

## Aplicaciones Ofensivas

!!! danger "Uso ético"
    Estas técnicas son para investigación y red teaming autorizado.

### Ocultar Procesos

```c
SEC("kprobe/proc_pid_readdir")
int hide_process(struct pt_regs *ctx) {
    // Manipular iteración de /proc
    // para ocultar PIDs específicos
}
```

### Interceptar Credenciales

```c
SEC("kprobe/__sys_read")
int intercept_read(struct pt_regs *ctx) {
    // Capturar datos leídos de stdin
    // útil para keylogging
}
```

## Recursos

| Recurso | URL |
|---------|-----|
| eBPF.io | https://ebpf.io |
| libbpf-bootstrap | https://github.com/libbpf/libbpf-bootstrap |
| bcc tools | https://github.com/iovisor/bcc |

---

!!! note "Siguiente"
    En el próximo artículo veremos desarrollo de módulos del kernel.
