# Introducción a eBPF

eBPF permite ejecutar programas en el kernel de forma verificada y segura (tracing, networking, observabilidad, y también casos ofensivos/defensivos).

## Ideas clave

- Mapas (BPF maps) como canal de comunicación kernel ↔ userland.
- Hooks típicos: kprobes, tracepoints, fentry/fexit, TC/XDP.
- Verifier: límites en loops, accesos a memoria, tipos, etc.

## Mini ejemplo (conceptual)

```c
// pseudo-eBPF: rastrear sys_enter
SEC("tracepoint/syscalls/sys_enter_openat")
int on_openat(struct trace_event_raw_sys_enter* ctx) {
  bpf_printk("openat called\n");
  return 0;
}
```

---

> Sustituye o amplía con tus notas reales.
