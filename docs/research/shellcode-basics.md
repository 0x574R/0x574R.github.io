# Shellcode Basics

Fundamentos rápidos para x86_64 (Linux).

## Registros y syscalls

En Linux x86_64 los argumentos de syscall van en:

- `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`
- número de syscall en `rax`

## Ejemplo: write(1, "hi\n", 3)

```nasm
; nasm -f elf64 sc.asm && ld -o sc sc.o
BITS 64

section .text
global _start

_start:
  mov rax, 1        ; sys_write
  mov rdi, 1        ; fd=stdout
  lea rsi, [rel msg]
  mov rdx, 3
  syscall

  mov rax, 60       ; sys_exit
  xor rdi, rdi
  syscall

section .data
msg: db "hi\n"
```

---

> Completa con: encoding, null-bytes, JMP-CALL-POP, etc.
