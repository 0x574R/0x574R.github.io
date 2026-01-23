# Introducción a eBPF

## ¿Qué es eBPF?

**eBPF (extended Berkeley Packet Filter)** es una tecnología del kernel de Linux que permite ejecutar programas verificados y seguros dentro del kernel.
Nació para filtrar paquetes, pero hoy se utiliza ampliamente en **observabilidad**, **seguridad** y **networking**.

!!! danger "Uso ético"
    Estas técnicas son para **investigación** y **red teaming autorizado**. No las utilices fuera de un entorno controlado.

---

## Arquitectura (alto nivel)

```mermaid
graph LR
  A[Programa eBPF] --> B[Verificador]
  B --> C[JIT / Interpretación]
  C --> D[Kernel]
  D --> E[Hook Points]
  E --> F[Maps / Ring Buffer]
  F --> G[User space]
```

### Hook points comunes

- **kprobes / kretprobes**: instrumentación dinámica de funciones del kernel
- **tracepoints**: puntos de trazado estables
- **LSM hooks**: control de seguridad (Linux Security Modules)
- **XDP / TC**: tráfico de red (alto rendimiento)

---

## Casos de uso en seguridad

| Uso | Descripción | Ejemplo |
|---|---|---|
| **Tracing** | Monitorizar syscalls, procesos y eventos | detectar ejecuciones sospechosas |
| **Policy / LSM** | Enforzar reglas (permitir/bloquear) | bloquear `execve` por ruta |
| **Detección** | Señales de comportamiento malicioso | TTPs (MITRE) por patrones |
| **Networking** | Filtrado y telemetría | XDP para DDoS / C2 |

---

## Ejemplo rápido (tracing de `execve`)

=== "bpftool prog dump"
    ```bash
    # Listar programas cargados
    bpftool prog list

    # Dump de un programa (si tienes su id)
    bpftool prog dump xlated id <ID>
    ```

=== "libbpf + skeleton"
    ```bash
    # Generar skeleton desde un .o
    bpftool gen skeleton trace_execve.bpf.o > trace_execve.skel.h
    ```

=== "Userspace loader (C)"
    ```c
    #include "trace_execve.skel.h"

    int main() {
      struct trace_execve_bpf *skel;
      skel = trace_execve_bpf__open_and_load();
      trace_execve_bpf__attach(skel);

      /* keep running */
      while (1) sleep(1);
      return 0;
    }
    ```

---

## Maps: el puente con user-space

Los **BPF maps** son estructuras de datos persistentes y compartibles:

- `hash`: pares clave/valor
- `array`: acceso por índice
- `lru_hash`: hash con LRU
- `ringbuf`: streaming de eventos (muy usado para telemetría)

!!! tip "Recomendación"
    Para eventos, `ringbuf` suele ser la mejor opción: latencia baja y consumo controlado.

---

## Recursos

| Recurso | Enlace |
|---|---|
| eBPF.io | https://ebpf.io |
| libbpf-bootstrap | https://github.com/libbpf/libbpf-bootstrap |
| bcc tools | https://github.com/iovisor/bcc |
