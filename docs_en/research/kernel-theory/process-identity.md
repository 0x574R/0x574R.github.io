---
date: 2026-06-03
description: Visible identity sources of a Linux process, manipulation mechanisms via prctl and PR_SET_MM, virtual memory, VMAs and anonymization.
---

<div class="article-header">
<h1>Process Identity Spoofing: What Linux Exposes and How to Fake It</h1>
<span class="article-meta">03/06/2026 · 60 min</span>
</div>

What information Linux exposes about its processes, where it resides, and how it can be manipulated

---

!!! note "Context"
    This article covers the information the operating system exposes about each process and how it can be modified from userspace. It is the third article in the DARKCLOAK series and assumes prior knowledge of the [credential and capabilities model](identity-model.md) (article 1) and the [ELF format](elf-internals.md) (article 2).

## Introduction

On a Linux system, every process can be said to have two distinct identities. One is the **internal identity**, made up of the UIDs, GIDs and capabilities stored in the `cred` structure, which determine who the process belongs to and what it can do. The other is the **visible identity**. The information the operating system exposes about the process to any observer, whether another process or a system user.

The internal identity and the visible identity are not tightly coupled. A process can have UID 1000 in its credentials but show UID 0 in `/proc/PID/status` if the appropriate fields are manipulated. It can execute the code of its binary while `/proc/PID/exe` points to a completely different one.

Each visible identity source operates independently, and each has its own query mechanism and its own manipulation path.

## Where to Query a Process's Identity

### Through tools such as `ps`

Perhaps the most commonly used tool, available by default on most Linux distributions, is `ps`. It reads its data from `/proc/PID/stat`, `/proc/PID/status` (name, state, UIDs, capabilities), `/proc/PID/cmdline` (command line) and `/proc/PID/exe` (binary path). A process that modifies these sources in `/proc` alters what `ps` displays.

### Querying the process's own memory directly

`argv[0]` contains the first element of the argument array a process receives at startup.

```c
# Direct execution
argv[0] = "./darkcloak"

# Execution using the full path
argv[0] = "/home/user/darkcloak"
```

This value is not stored by the kernel. It lives in the process's own memory (`[rsp+8]` relative to the entry point). Overwriting it is a direct write to a known address. No intermediate syscalls required:

```asm
    mov r12, [rsp+8]                   ; r12 = address of the original argv[0] string on the stack
    mov r13, [rel mimic_argv]          ; r13 = content of the replacement string (e.g. "./sshd\0")
    mov [r12], r13                     ; overwrite the original string with the replacement
```

### Inspecting the `/proc/<PID>/` directory

Every process has a directory in `/proc/` determined by its PID. The files inside that directory do not exist on disk. They belong to **`procfs`**, a virtual filesystem where each read operation invokes a kernel function that generates the content dynamically from the process's internal structures.

<h4 style="font-size: 1.15em; font-weight: normal;">Identity sources and their manipulation mechanisms in <code>/proc/&lt;PID&gt;/</code></h4>

Every queryable value originates from the kernel's internal structures linked to the process.

| Source in `/proc` | Involved structure | Field |
|---|---|---|
| `/proc/PID/comm` | `task_struct` | `comm[16]` |
| `/proc/PID/cmdline` | `mm_struct` | `arg_start` → `arg_end` |
| `/proc/PID/environ` | `mm_struct` | `env_start` → `env_end` |
| `/proc/PID/exe` | `mm_struct` | `exe_file` |
| `/proc/PID/maps` | `mm_struct` | `vm_area_struct` (VMAs) |
| `/proc/PID/status` (User) | `cred` | `euid` |
| `/proc/PID/status` (Group) | `cred` | `egid` |
| `/proc/PID/status` (Caps) | `cred` | `cap_*` |

!!! note ""
    The `struct cred` sources (UIDs, GIDs and capabilities) were covered in the [first article](identity-model.md) of this series.

These sources are primarily manipulated through two mechanisms:

**Via process management syscall**

- Process name (`/proc/PID/comm`) → `prctl(PR_SET_NAME)`
- Command line (`/proc/PID/cmdline`) → `prctl(PR_SET_MM, ARG_START/ARG_END)`
- Environment variables (`/proc/PID/environ`) → `prctl(PR_SET_MM, ENV_START/ENV_END)`
- Executable link (`/proc/PID/exe`) → `prctl(PR_SET_MM, EXE_FILE)`

**Via memory management syscalls**

- Virtual memory map of the process (`/proc/PID/maps`) → `mmap`, `munmap`, `mremap` and `mprotect`

## The Process Management Interface

Unlike specialized syscalls such as `setresuid` (which only handles UIDs) or `capset` (which only handles capabilities), `prctl` is a system call that allows performing a multitude of management operations on the invoking process.

From an offensive perspective, `prctl` concentrates most of the operations that modify the process's visible identity without altering its execution. For this reason, defensive monitoring of `prctl` (via auditd or eBPF) is a critical detection point.

The sections below cover the operations most relevant from an offensive standpoint:

### `PR_SET_NAME`

The `comm` field in `task_struct` is a 16-byte array (15 usable characters + NULL). It is what tools such as `ps -o comm` display when reading `/proc/PID/comm`. Modifying this value does not require any capabilities.

```asm
    mov rax, 157                ; PRCTL
    mov rdi, 15                 ; PR_SET_NAME
    lea rsi, [rel new_name]     ; pointer to buffer with the new name
    syscall
```

!!! note ""
    Names in brackets (`[kworker/0:1]`, `[migration/0]`) are by convention kernel threads, so a user-space process can adopt one of these to blend in with legitimate system processes.

### `PR_SET_DUMPABLE`

Each process has a `dumpable` attribute that controls whether the kernel allows other processes of the same user to inspect its memory and attach a debugger.

```asm
    mov rax, 157                ; PRCTL
    mov rdi, 4                  ; PR_SET_DUMPABLE
    xor esi, esi                ; DUMPABLE = 0 (DEFAULT IS DUMPABLE = 1)
    syscall
```

!!! note ""
    This attribute is automatically disabled when the process executes a `setuid` or `setgid` binary.

Setting `dumpable` to 0:

- `/proc/PID/maps`, `/proc/PID/mem`, `/proc/PID/environ`, `/proc/PID/auxv` become owned by `root:root`. Processes of the same user cannot read them without `CAP_SYS_PTRACE`.
- `ptrace(PTRACE_ATTACH)` from processes with the same UID fails with `EPERM`.
- Core dumps are not generated.

It remains visible in `/proc/PID/stat`, `/proc/PID/status`, `/proc/PID/comm`, `/proc/PID/cmdline` and `/proc/PID/exe`. **Therefore, this operation acts only as an anti-debugging and anti-dumping barrier.**

### `PR_SET_MM`

A process's `mm_struct` contains the fields the kernel consults to generate `/proc/PID/cmdline` (arguments with which the process was launched: `argv[0] \0 argv[1] \0...`), `/proc/PID/environ` (process environment variables: `KEY1=VALUE1 \0 KEY2=VALUE2 \0...`) and `/proc/PID/exe` (symlink pointing to the binary the kernel loaded when `execve` was called).

`PR_SET_MM` allows directly modifying these fields, altering what the kernel reads when an observer queries them.

!!! danger ""
    Using this option requires the `CAP_SYS_RESOURCE` capability (bit 24) in the effective set.

#### **`PR_SET_MM_ARG_START` / `PR_SET_MM_ARG_END`**

Allow modifying `arg_start` and `arg_end`. Any subsequent read of `/proc/PID/cmdline` reads the memory between these two addresses.

```asm
    ; --- PR_SET_MM_ARG_START ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 8                  ; PR_SET_MM_ARG_START
    lea rdx, [rel fake_cmdline] ; pointer to the start of the buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall

    ; --- PR_SET_MM_ARG_END ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 9                  ; PR_SET_MM_ARG_END
    lea rdx, [rel fake_cmdline]
    add rdx, fake_cmdline_len   ; pointer to the end of the buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

!!! note ""
    There is a relationship between `/proc/PID/cmdline` and `argv[0]`: by default, `arg_start` points to the stack area where `argv[0]` resides, so both share the same memory region. As long as that relationship is not altered, overwriting `argv[0]` also changes what `cmdline` returns, because the kernel reads the content from that address rather than from a separately stored copy. If `arg_start` is redirected to another buffer via `PR_SET_MM`, the two sources decouple: `cmdline` reads from the new buffer and the `argv[0]` overwrite only affects tools that access the process's stack directly.

#### **`PR_SET_MM_ENV_START` / `PR_SET_MM_ENV_END`**

Equivalent for `/proc/PID/environ`.

```asm
    ; --- PR_SET_MM_ENV_START ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 10                 ; PR_SET_MM_ENV_START
    lea rdx, [rel fake_environ] ; pointer to the start of the buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall

    ; --- PR_SET_MM_ENV_END ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 11                 ; PR_SET_MM_ENV_END
    lea rdx, [rel fake_environ]
    add rdx, fake_environ_len   ; pointer to the end of the buffer
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

#### **`PR_SET_MM_EXE_FILE`**

Allows modifying the `/proc/PID/exe` symlink. Unlike the previous ones, it receives a file descriptor to the target binary rather than a memory address. The kernel replaces the `exe_file` in the `mm_struct` with the `struct file` associated with the FD (a change in a structure linked to the process at the kernel level).

```asm
    ; --- Get FD of the target binary ---
    mov rax, 257                ; OPENAT
    mov rdi, -100               ; AT_FDCWD
    lea rsi, [rel target_path]  ; pointer to the path of the target binary
    xor edx, edx                ; O_RDONLY
    xor r10d, r10d
    syscall
    mov r14, rax                ; save FD in r14

    ; --- PR_SET_MM_EXE_FILE ---
    mov rax, 157                ; PRCTL
    mov rdi, 35                 ; PR_SET_MM
    mov rsi, 13                 ; PR_SET_MM_EXE_FILE
    mov rdx, r14                ; fd of the target binary
    xor r10d, r10d
    xor r8d, r8d
    syscall
```

!!! danger ""
    **This operation fails with `EBUSY` if the process has VMAs whose `vm_file` points to the original executable. All initial file-backed VMAs must be replaced before the call, which leads directly to the VMA anonymization block.**

## Virtual Memory and VMAs

Every process on Linux operates on a virtual address space that the **MMU (Memory Management Unit)** translates to physical addresses. The process never touches RAM directly: it works with virtual addresses that the hardware transparently maps to physical ones.

**That virtual address space is not fully mapped from the start but is mapped in regions as the process needs them** (the binary's code, its data, the stack, the heap, shared libraries and any explicit mappings the process requests). Each of these regions is internally represented by a **VMA (Virtual Memory Area)**, a `vm_area_struct` structure within the process's `mm_struct`.

The entries that appear in `/proc/PID/maps` are the process's VMAs.

```c
struct vm_area_struct {
    unsigned long vm_start;      // Start address
    unsigned long vm_end;        // End address
    pgprot_t vm_page_prot;       // Page protection
    unsigned long vm_flags;      // VM_READ, VM_WRITE, VM_EXEC, ...
    struct file *vm_file;        // Associated file (NULL if anonymous)
    unsigned long vm_pgoff;      // Offset within the file
    // ...
};
```

!!! note ""
    The flags `VM_READ`, `VM_WRITE`, `VM_EXEC` determine the permissions shown in `/proc/PID/maps` (`r`, `w`, `x`). The flag `VM_SHARED` distinguishes `MAP_SHARED` mapping (`s`) from `MAP_PRIVATE` mapping (`p`).

### File-backed VMAs vs Anonymous VMAs

#### **File-backed VMAs**

Created explicitly when the kernel maps a file into memory, either because a program requests a file mapping via `mmap` with a file descriptor, or implicitly during `execve`, when the kernel loads the `PT_LOAD` segments of the ELF binary into the new process's address space. In both cases, the resulting VMA holds a reference to the original file through its `vm_file` field.

In `/proc/PID/maps` the following information is shown:

```text
00400000-00402000 r--p 00000000 08:01 1234567  /path/to/binary
│               │ │  │ │        │     │        └─ path of the mapped file
│               │ │  │ │        │     └─ file inode
│               │ │  │ │        └─ device (major:minor)
│               │ │  │ └─ offset within the file
│               │ │  └─ type: p=private, s=shared
│               │ └─ permissions: r=read, w=write, x=execute
└───────────────└─ virtual address range
```

#### **Anonymous VMAs**

Created by the kernel for the stack and heap, or explicitly with `mmap(MAP_ANONYMOUS)`. The VMA's `vm_file` field is NULL.

In `/proc/PID/maps` no path is shown:

```text
7f8a00000000-7f8a00004000 rw-p 00000000 00:00 0
│                         │    │        │     │
│                         │    │        │     └─ inode 0: no file
│                         │    │        └─ device 00:00
│                         │    └─ offset 0
│                         └─ permissions: read + write, type: private
└─ virtual address range
```

### Virtual Memory Management Primitives

A process cannot allocate memory, free it, move it or change its permissions without going through the kernel. The four syscalls that allow this are `mmap` (allocate), `munmap` (free), `mremap` (move or resize) and `mprotect` (change permissions).

#### **`MMAP`**

Creates a new mapping in the process's virtual address space.

```asm
rax = 9          ; syscall number (mmap)
rdi = addr       ; suggested address (0 to let the kernel choose)
rsi = length     ; size in bytes to allocate (e.g. 4096 = 1 page)
rdx = prot       ; protection permissions (PROT_* flags)
r10 = flags      ; mapping options (MAP_*)
r8  = fd         ; file descriptor (for file mapping; -1 if not applicable)
r9  = offset     ; offset within the file (multiple of page size)
```

| Flag | Value | Description |
|---|---|---|
| `MAP_SHARED` | `0x01` | Modifications to memory are written to the shared file and modifications by other processes on the same file are reflected in the mapping. |
| `MAP_PRIVATE` | `0x02` | Private copy. Changes do not propagate. |
| `MAP_FIXED` | `0x10` | Forces use of the address specified in `addr`. Silently unmaps anything in that range. |
| `MAP_ANONYMOUS` | `0x20` | No associated file. `fd` must be `-1`. Memory is zero-initialized. |

The combination `MAP_PRIVATE | MAP_ANONYMOUS` (`0x22`) is the primary use case for allocating anonymous memory. The result is zero-initialized pages, with no path visible in `/proc/PID/maps` and writes isolated to the process that created them.

| Permission | Value | Access |
|---|---|---|
| `PROT_NONE` | `0x0` | No access |
| `PROT_READ` | `0x1` | Read |
| `PROT_WRITE` | `0x2` | Write |
| `PROT_EXEC` | `0x4` | Execute |

#### **`MREMAP`**

Allows **resizing, moving or relocating an existing mapping** within the process's virtual memory space. Preserves the protection permissions and type of the original mapping.

```asm
rax = 25          ; syscall number (mremap)
rdi = old_address ; base address of the existing mapping (page-aligned)
rsi = old_size    ; current size of the mapping in bytes
rdx = new_size    ; new size in bytes
r10 = flags       ; MREMAP_* bitmask (0 if no move desired)
r8  = new_address ; target address (only if flags includes MREMAP_FIXED)
```

| Flag | Value | Description |
|---|---|---|
| `MREMAP_MAYMOVE` | `0x01` | Authorizes the kernel to move the mapping to a different virtual address if no contiguous space is available. Without this flag, any growth that requires relocation fails with `ENOMEM`. In practice, almost mandatory for expanding regions. |
| `MREMAP_FIXED` | `0x02` | Forces placement of the mapping at the address specified by `r8` (`new_address`). Requires `MREMAP_MAYMOVE` or returns `EINVAL`. |
| `MREMAP_DONTUNMAP` | `0x04` | Moves PTEs (page table entries) to `new_address` without destroying the original VMA; from `old_address` an empty VMA remains (with no pages behind it). Valid only on `MAP_PRIVATE` anonymous mappings. |

#### **`MPROTECT`**

Allows **changing the protections (read/write/execute) of an already mapped memory region**.

```asm
rax = 10         ; syscall number (mprotect)
rdi = addr       ; base address of the region (rounded down to page)
rsi = len        ; length in bytes (rounded up to pages)
rdx = prot       ; permission mask (PROT_*) (OR-combinable)
```

| Flag | Value | Permission |
|---|---|---|
| `PROT_NONE` | `0x0` | No permission |
| `PROT_READ` | `0x1` | Read |
| `PROT_WRITE` | `0x2` | Write |
| `PROT_EXEC` | `0x4` | Execute |
| `PROT_READ \| PROT_WRITE \| PROT_EXEC` | `0x7` | Read + Write + Execute |

#### **`MUNMAP`**

**Removes a mapping from the process's virtual address space.** After the call, any access to addresses in the unmapped range generates `SIGSEGV`.

```asm
rax = 11            ; syscall number (munmap)
rdi = addr          ; base address of the mapping to remove
rsi = length        ; size in bytes to unmap
```

`length` need not match the original size of the mapping exactly. A portion of an existing mapping can be unmapped.

### VMA Anonymization

**VMA anonymization is the process of replacing file-backed VMAs with anonymous VMAs of identical content.** The result is a process that continues executing the same code at the same addresses with the same permissions, but with no VMA referencing the original binary. In `/proc/PID/maps`, the VMAs change from showing the executable path to showing device `00:00` and inode `0`.

!!! note ""
    Performing this process on all file-backed VMAs makes `PR_SET_MM_EXE_FILE` with the `CAP_SYS_RESOURCE` capability succeed, enabling `/proc/PID/exe` spoofing.

#### **Anonymization procedure**

For each binary segment:

1. **Create an anonymous region** (`mmap` with `MAP_PRIVATE | MAP_ANONYMOUS`): allocate a new anonymous region in memory of the same size as the segment, with read and write permissions (needed to copy data).

2. **Copy the content** (`rep movsb`): transfer the entire segment content byte by byte to the new memory region.

3. **Remove the original mapping** (`munmap`): unmap the file-backed region, removing the reference to the binary on disk. From this point, accessing the original segment's addresses causes a segmentation fault.

4. **Relocate the copy** (`mremap` with `MREMAP_MAYMOVE | MREMAP_FIXED`): move the anonymous region to the address range previously occupied by the original segment. The content is identical, the addresses are the same, in practical terms, only the VMA type changed.

5. **Restore permissions** (`mprotect`): apply the original segment permissions to the new memory region (R for headers, RX for code, RW for data).

```text
Before (file-backed):
00400000-00402000 r--p 00000000 08:01 1234567  /path/to/binary
00402000-00405000 r-xp 00002000 08:01 1234567  /path/to/binary
00405000-00407000 rw-p 00005000 08:01 1234567  /path/to/binary

After (anonymous):
00400000-00402000 r--p 00000000 00:00 0
00402000-00405000 r-xp 00000000 00:00 0
00405000-00407000 rw-p 00000000 00:00 0
```

#### **The `.text` segment problem**

The `.text` segment contains the executable code (RIP points to addresses within this segment). Unmapping it with `munmap` while executing code from it destroys the page holding the next instruction to execute, causing an immediate segmentation fault.

The solution is to execute the anonymization code **from outside** the binary's initial executable segments. To do this, a trampoline is built:

1. **Allocate a temporary page** (`mmap` with `MAP_PRIVATE | MAP_ANONYMOUS`): create an anonymous page to copy the code and data needed for anonymization.

2. **Copy the anonymization code** (`rep movsb`): copy to the temporary page the block of instructions that executes the `mmap`→`movsb`→`munmap`→`mremap`→`mprotect` sequence for each segment, along with the data the syscalls need (start/end addresses, permissions and return addresses).

3. **Make the page executable** (`mprotect` with `PROT_READ | PROT_EXEC`): the page must be created with RW permissions to copy data, once copied, it is changed to RX to allow transferring execution flow to it.

4. **Jump to the temporary page** (`jmp`): the binary's execution flow must leave the `.text` segment and jump to the anonymous page. From this point, RIP points to the temporary page and it is safe to unmap any binary segment.

5. **Anonymize segments**: from the temporary page, execute the full anonymization sequence for each segment (the temporary page must hold the data needed for the anonymization process).

6. **Jump back to the anonymized `.text`** (`jmp` to the return address stored in the temporary page): return execution flow to the anonymized `.text` segment, which has the same content at the same addresses.

7. **Unmap the temporary page** (`munmap`): the page used for the trampoline is no longer needed and can be removed.

The anonymization of all segments together with the construction of the relocatable trampoline can be found in the DARKCLOAK code, present in the next article (June 17).

---

## Acknowledgements

Thanks for making it this far.

If you find errors or want to improve/extend the article, the blog content is open to Pull Requests. All contributions are welcome.

See you in the next article! ;)
