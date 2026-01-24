# Introducción a eBPF

eBPF (extended Berkeley Packet Filter) permite ejecutar programas sandboxed en el kernel de Linux sin modificar su código fuente.

---

## ¿Qué es eBPF?

Una máquina virtual dentro del kernel que ejecuta código de forma segura. Usos principales:

- **Observabilidad** — Tracing, profiling, monitorización
- **Networking** — Load balancing, firewalls, XDP
- **Seguridad** — Sandboxing, detección de intrusiones

## Hook Points

### Kprobes

Interceptar cualquier función del kernel:

```c
SEC("kprobe/sys_execve")
int trace_execve(struct pt_regs *ctx) {
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    bpf_printk("execve: %s\n", comm);
    return 0;
}
```

### Tracepoints

Puntos de instrumentación estables:

```c
SEC("tracepoint/syscalls/sys_enter_openat")
int trace_openat(struct trace_event_raw_sys_enter *ctx) {
    // ...
    return 0;
}
```

### XDP

Procesamiento de paquetes a bajo nivel, antes del stack de red.

## Compilación

```bash
# Compilar programa BPF
clang -O2 -target bpf -c program.bpf.c -o program.bpf.o

# Cargar con bpftool
sudo bpftool prog load program.bpf.o /sys/fs/bpf/my_prog
```

## Detección

```bash
# Listar programas BPF cargados
sudo bpftool prog list

# Ver maps
sudo bpftool map list
```

---

**Recursos**: [eBPF.io](https://ebpf.io/) · [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap)
