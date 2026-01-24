# Kernel Security

Notas rápidas sobre superficie de ataque y mitigaciones comunes.

## Mitigaciones modernas (resumen)

- KASLR / ASLR
- SMEP / SMAP
- PTI
- STRICT_KERNEL_RWX
- CFI / IBT (según configuración)

## Debugging y análisis

```bash
cat /proc/kallsyms | head
cat /proc/sys/kernel/kptr_restrict
sysctl kernel.dmesg_restrict
```

---

> Continúa añadiendo apartados: LSMs, eBPF hardening, perf events, etc.
