# Introducción a eBPF

<figure class="hero-image" markdown>
  ![eBPF](../../assets/images/ebpf-hero.svg){ width="100%" }
</figure>

eBPF (extended Berkeley Packet Filter) permite ejecutar código en el kernel Linux de forma segura.

---

## ¿Qué es eBPF?

eBPF es una tecnología que permite ejecutar programas sandboxed en el kernel Linux sin modificar el código fuente del kernel ni cargar módulos.

### Casos de uso

- **Observabilidad**: tracing, profiling, monitoring
- **Networking**: XDP, tc, socket filtering
- **Security**: LSM hooks, seccomp

---

## Primer programa eBPF

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

SEC("tracepoint/syscalls/sys_enter_execve")
int trace_execve(void *ctx) {
    bpf_printk("execve called\\n");
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

### Compilar

```bash
clang -O2 -target bpf -c trace.bpf.c -o trace.bpf.o
```

### Cargar con bpftool

```bash
sudo bpftool prog load trace.bpf.o /sys/fs/bpf/trace
sudo bpftool prog show
```

---

## bpftrace one-liners

```bash
# Trazar llamadas a open()
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf("%s %s\n", comm, str(args->filename)); }'

# Contar syscalls por proceso
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Latencia de read()
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; } tracepoint:syscalls:sys_exit_read /@start[tid]/ { @ns = hist(nsecs - @start[tid]); delete(@start[tid]); }'
```

---

## BPF Maps

Los maps permiten compartir datos entre programas eBPF y userspace.

```c
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u32);
    __type(value, u64);
} my_map SEC(".maps");
```

---

!!! warning "Requisitos"
    - Kernel >= 4.15 (recomendado >= 5.x)
    - Privilegios CAP_BPF o root
    - Headers del kernel instalados

---

!!! recursos "Referencias"
    - [eBPF.io](https://ebpf.io/)
    - [BPF Portability and CO-RE](https://nakryiko.com/posts/bpf-portability-and-co-re/)
    - [Learning eBPF - Liz Rice](https://isovalent.com/learning-ebpf/)
