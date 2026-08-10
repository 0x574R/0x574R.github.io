---
date: 2026-05-12
description: How the Linux kernel manages the identity and privileges of a process. UIDs, capabilities, securebits and credential structs.
---

<div class="article-header">
<h1>Identity and Privileges of a Process</h1>
<span class="article-meta">12/05/2026 · 45 min</span>
</div>

How the Linux kernel manages the identity and privileges of a process

---

!!! info "Context"
    This article covers the theory underlying offensive techniques that manipulate process credentials. Understanding the kernel's identity and privilege model is a fundamental prerequisite before implementing tools that operate on `struct cred`.

## Introduction

The Linux kernel concentrates all identity and privilege information for a process in a single structure: `struct cred`. Within it coexist two complementary systems, **UIDs/GIDs** (who the process belongs to) and **capabilities** (which privileged operations it can perform). Both are closely related: modifications to UIDs trigger automatic changes in capabilities, and certain capabilities are required to freely modify UIDs. This article covers both systems jointly for a deeper understanding of how the system operates with processes.

## Location of Credentials in the Kernel

Credentials are not direct fields of `task_struct` (the data structure that represents a process in the kernel). Instead, `task_struct` contains two RCU ([Read-Copy Update](https://handwiki.org/wiki/Read-copy-update))-protected pointers to a separate structure:

```c
const struct cred __rcu *real_cred;  // Objective context (real identity)
const struct cred __rcu *cred;       // Subjective context (active identity)
```

- The **subjective context** (`*cred`) is what the kernel checks when the process acts **on other objects**: opening files, sending signals, accessing IPC.
- The **objective context** (`*real_cred`) is what the kernel checks when **other processes act on this one**: sending it signals, attaching via `ptrace`.

!!! note ""
    Generally, both pointers reference the same `struct cred` instance.

`struct cred` contains all the identity and privilege information for the process:

```c
struct cred {
    // ...
    kuid_t uid;     // Real UID
    kgid_t gid;     // Real GID
    kuid_t suid;    // Saved set-user-ID
    kgid_t sgid;    // Saved set-group-ID
    kuid_t euid;    // Effective UID
    kgid_t egid;    // Effective GID
    kuid_t fsuid;   // Filesystem UID
    kgid_t fsgid;   // Filesystem GID
    unsigned securebits;
    kernel_cap_t cap_inheritable;
    kernel_cap_t cap_permitted;
    kernel_cap_t cap_effective;
    kernel_cap_t cap_bset;
    kernel_cap_t cap_ambient;
    // ...
    struct group_info *group_info;   // Contains the supplementary groups
};
```

!!! note "File permission evaluation"
    File permission evaluation follows a strict hierarchy: first it checks whether the process's effective UID matches the file owner's UID, in which case owner permissions apply. If not, it checks whether any of the process's GIDs (effective or supplementary) match the file's GID, applying group permissions. If there are no matches, other permissions apply.

!!! info ""
    Supplementary groups are additional groups associated with a user that allow a process to belong to multiple groups simultaneously.

When a process wants to change a UID, the process enters kernel mode through a syscall (for example, `setuid`), triggering a CPU transition from **ring 3 (user mode) to ring 0 (kernel mode)**. Once in kernel mode, the syscall handler checks whether the process has permission to make the change based on the current UID values and its capabilities. If the operation is viable, the kernel enters its credentials subsystem and applies a safe update pattern: first it calls `prepare_creds` to clone the process's current `struct cred`, then modifies the relevant fields (UID, EUID, GID or capabilities as appropriate), and finally executes `commit_creds` to atomically replace the process's active credentials.

!!! danger ""
    From an offensive perspective, `prepare_kernel_cred(NULL)` generates a `struct cred` with UIDs set to 0 and capabilities at maximum. The combination `commit_creds(prepare_kernel_cred(NULL))` is the standard privilege escalation pattern in kernel exploits.

## UIDs

When a user runs a program, the operating system does not use the username directly but instead relies on a numeric identifier called a UID. This UID represents the user's identity within the system and is associated with all processes that user runs. The kernel uses this identifier to enforce permission policies and access control.

Each running process maintains a set of UID-related identities. This is because in certain situations (especially when elevated privileges are involved), a process may need to operate under different identities depending on the context. For this reason, the system distinguishes between several types of UID:

- **Real UID (RUID)**: Identifies the user who originally created the process. The RUID is what the kernel consults when applying resource limits (`RLIMIT_NPROC`) and what determines the process owner for signal delivery.
- **Effective UID (EUID)**: The identifier the kernel checks during access control decisions.
- **Saved Set-User-ID (SUID)**: Acts as a storage slot for a previously held EUID. Its purpose is to allow a process to temporarily drop its privileges (by changing the EUID to an unprivileged value) and recover them later (by restoring the EUID to the value preserved in SUID).

!!! note ""
    When the kernel loads an executable with the setuid bit set, it sets the EUID and SUID to the UID of the file owner, keeping the RUID as that of the original user.

### Query Syscalls

#### **GETRESUID (no. 118)**

`getresuid` is a system call that **simultaneously returns the three UIDs associated with the process** and writes them into three user-space buffers.

**Inputs (syscall arguments)**

```nasm
rax = 118           ; syscall number (getresuid)
rdi = ruid          ; pointer to uid_t where the real UID will be written
rsi = euid          ; pointer to uid_t where the effective UID will be written
rdx = suid          ; pointer to uid_t where the saved set-user-ID will be written
```

- `ruid` (RDI): pointer to a writable memory region of at least 4 bytes (`uid_t` = 32 bits). The kernel writes the current **real UID** here.
- `euid` (RSI): pointer to a writable memory region of at least 4 bytes (`uid_t` = 32 bits). The kernel writes the current **effective UID** here.
- `suid` (RDX): pointer to a writable memory region of at least 4 bytes (`uid_t` = 32 bits). The kernel writes the current **saved set-user-ID** here.

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error
```

Common errors:

- `14` → `EFAULT`: one of the three pointers points to inaccessible or non-writable memory.

### Modification Syscalls

#### **SETRESUID (no. 117)**

`setresuid` atomically and independently sets all three UIDs of the process (real, effective and saved) in a single invocation. Each argument accepts -1 to preserve the current value.

**Inputs (syscall arguments)**

```nasm
rax = 117            ; syscall number (setresuid)
rdi = ruid           ; new real UID (or -1 to leave unchanged)
rsi = euid           ; new effective UID (or -1 to leave unchanged)
rdx = suid           ; new saved set-user-ID (or -1 to leave unchanged)
```

!!! note ""
    Without `CAP_SETUID`, each argument must be -1 or a value already present in one of the three current process IDs (they can be redistributed across positions and repeated), but no new values can be introduced. With `CAP_SETUID` there is no restriction.

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error (all-or-nothing semantics)
```

Common errors:

- `1` → `EPERM`: the process does not have `CAP_SETUID` and one of the three requested values does not match any of the three current IDs (`ruid`, `euid`, `suid`).
- `22` → `EINVAL`: one of the UIDs is outside the valid range for the user namespace.
- `11` → `EAGAIN`: changing `ruid` would exceed the `RLIMIT_NPROC` of the target UID.

## GIDs

The GID model (comprising the Real GID, Effective GID and Saved set-group-ID) follows the same semantics, applied to group-based access control.

---

There is a fourth pair, **FSUID** and **FSGID**, used exclusively for filesystem access checks. In modern kernels, FSUID automatically follows EUID in most scenarios and is rarely manipulated independently. We will not cover it here, but it exists within the same `struct cred`.

### Query Syscalls

#### **GETRESGID (no. 120)**

`getresgid` is a system call that **simultaneously returns the three GIDs associated with the process** and writes them into three user-space buffers. It is the exact counterpart of `getresuid` but operating on group identifiers.

**Inputs (syscall arguments)**

```nasm
rax = 120   ; syscall number (getresgid)
rdi = rgid  ; pointer to gid_t where the real GID will be written (4 bytes)
rsi = egid  ; pointer to gid_t where the effective GID will be written (4 bytes)
rdx = sgid  ; pointer to gid_t where the saved set-group-ID will be written (4 bytes)
```

- `rgid` (RDI): address where the kernel will write the process's **real GID** as a `gid_t` (4 bytes, unsigned integer). The real GID represents the group of the user who originally launched the process.
- `egid` (RSI): address where the kernel will write the **effective GID**, which is what the kernel actually uses for DAC permission checks on files, SysV IPC, signals, etc.
- `sgid` (RDX): address where the kernel will write the **saved set-group-ID**. Its purpose is to allow the process to recover a previous EGID.

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error
```

Common errors:

- `14` → `EFAULT`: one of the three pointers (`rgid`, `egid`, `sgid`) points to non-writable, unmapped, or out-of-bounds memory.

In practice, a `getresgid` call with valid pointers to the process's own memory **never returns an error**.

### Modification Syscalls

#### **SETRESGID (no. 119)**

`setresgid` is a system call that **atomically sets all three GIDs of the process** in a single operation. It is the counterpart of `setresuid` applied to group identifiers and constitutes the most explicit and predictable way to manipulate GIDs.

**Inputs (syscall arguments)**

```nasm
rax = 119   ; syscall number (setresgid)
rdi = rgid  ; new real GID       (-1 to leave unchanged)
rsi = egid  ; new effective GID  (-1 to leave unchanged)
rdx = sgid  ; new saved set-group-ID  (-1 to leave unchanged)
```

!!! note ""
    Without `CAP_SETGID`, each argument must be -1 or a value already present in one of the three current GIDs of the process (they can be redistributed across positions and repeated), but no new values can be introduced. With `CAP_SETGID` there is no restriction.

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error (all-or-nothing semantics)
```

Common errors:

- `1` → `EPERM`: the process does not have `CAP_SETGID` in its user namespace and at least one of the requested values (`rgid`, `egid`, or `sgid`) does not match any of the current GIDs in the triplet.
- `22` → `EINVAL`: one of the values is not a valid GID in the current user namespace.
- `11` → `EAGAIN`: the change would cause the number of processes for the new Real GID to exceed `RLIMIT_NPROC`. Only triggered when `rgid` is modified.

## Capabilities

The traditional Unix model is binary: EUID=0 grants all privileges, any other EUID grants none. Capabilities decompose that monolithic power into 41 independent bits (from `CAP_CHOWN=0` to `CAP_CHECKPOINT_RESTORE=40`), each controlling a subset of operations. This allows assigning to a process only those privileges necessary for its operation.

### The Five Sets

- **Permitted (P)**: The complete set of privileges for the process. It can only shrink, never grow. No other set can have a bit that is not in P (except bounding, which is independent).
- **Effective (E)**: The set the kernel checks on every privileged action. A process can have `CAP_SYS_RESOURCE` in P without having it in E. This privilege has no effect until it is activated by setting the corresponding bit to 1 in the effective set.
- **Inheritable (I)**: Controls which capabilities can propagate across `execve` when the binary has [file capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html). To activate a bit, it must be in P and in B (or the process must have `CAP_SETPCAP` in E).
- **Bounding set (B)**: Upper bound on what can be acquired during `execve`. Can only be reduced (`PR_CAPBSET_DROP`).
- **Ambient (A)**: Allows specifying which capabilities propagate across `execve` when the binary has no special privileges (file capabilities or setuid/setgid).

### Query Syscalls

#### **CAPGET (no. 125)**

`capget` is the kernel interface that allows **reading the capabilities** of a process/thread. Unlike `capset` (which can only operate on the invoking thread), `capget` allows querying the capabilities of **any process or thread** in the system by specifying its PID or TID, making it a fundamental reconnaissance tool in post-exploitation phases.

**Inputs (syscall arguments)**

```nasm
rax = 125            ; syscall number (capget)
rdi = hdrp           ; pointer to struct __user_cap_header_struct
rsi = datap          ; pointer to struct __user_cap_data_struct[2] (or NULL)
```

- `hdrp` (RDI): pointer to the header.

    Pointer to a `__user_cap_header_struct` structure that specifies the capabilities protocol version and the target thread. Cannot be NULL.

    ```c
    struct __user_cap_header_struct {
        __u32 version;    // Protocol version   (4 bytes)
        int   pid;        // TID/PID of target (0 = current)  (4 bytes)
    };
    ```

    - `version` must be `_LINUX_CAPABILITY_VERSION_3` (`0x20080522`). This is the only current version and supports up to 64 capabilities (represented in two `u32`, one per 32-bit half).

- `datap` (RSI): pointer to the output buffer.

    Pointer to an array of two contiguous `__user_cap_data_struct` structures in memory where the kernel will write the target's capabilities. `datap[0]` receives bits for capabilities 0–31 and `datap[1]` for capabilities 32–63.

    ```c
    struct __user_cap_data_struct {
        __u32 effective;     // Active capabilities (those the kernel checks)
        __u32 permitted;     // Ceiling: superset of effective and inheritable
        __u32 inheritable;   // Capabilities propagable across execve
    };
    ```

    **Memory layout after a successful `capget` (version 3):**

    ```nasm
    datap (RSI) ──→ ┌──────────────────────────────────────┐
                    │ datap[0].effective     (caps 0–31)   │ offset +0   ← kernel writes
                    │ datap[0].permitted     (caps 0–31)   │ offset +4   ← kernel writes
                    │ datap[0].inheritable   (caps 0–31)   │ offset +8   ← kernel writes
                    ├──────────────────────────────────────┤
                    │ datap[1].effective     (caps 32–63)  │ offset +12  ← kernel writes
                    │ datap[1].permitted     (caps 32–63)  │ offset +16  ← kernel writes
                    │ datap[1].inheritable   (caps 32–63)  │ offset +20  ← kernel writes
                    └──────────────────────────────────────┘
                             Total: 24 bytes
    ```

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error
```

Common errors:

- `14` → `EFAULT`: `hdrp` points to inaccessible memory (cannot be NULL) or `datap` points to non-writable memory and is not NULL.
- `22` → `EINVAL`: the `version` field in the header is not a recognized version. The kernel overwrites `version` with the preferred version (`0x20080522`). This error is expected when using `capget` to probe the version.
- `3` → `ESRCH`: no process/thread with the specified PID/TID exists.

### Modification Syscalls

#### **CAPSET (no. 126)**

`capset` is the kernel interface that allows **setting the capabilities** of the invoking thread. Capabilities are Linux's mechanism for decomposing superuser privileges into discrete units, instead of being root or not, a process can possess specific subsets of privileges (opening raw sockets, mounting filesystems, using `ptrace`, etc.).

**Inputs (syscall arguments)**

```nasm
rax = 126            ; syscall number (capset)
rdi = hdrp           ; pointer to struct __user_cap_header_struct
rsi = datap          ; pointer to struct __user_cap_data_struct[2]
```

- `hdrp` (RDI): pointer to the header (same structure as in `capget`). `version` must be `0x20080522`. `pid` only allows `0` or the thread's own TID on modern kernels.

- `datap` (RSI): pointer to the capabilities data.

    Pointer to an **array of two** contiguous `__user_cap_data_struct` structures in memory. `datap[0]` contains bits for capabilities 0–31 and `datap[1]` for capabilities 32–63.

    **Memory layout (version 3):**

    ```nasm
    datap (RSI) ──→ ┌──────────────────────────────────────┐
                    │ datap[0].effective     (caps 0–31)   │ offset +0
                    │ datap[0].permitted     (caps 0–31)   │ offset +4
                    │ datap[0].inheritable   (caps 0–31)   │ offset +8
                    ├──────────────────────────────────────┤
                    │ datap[1].effective     (caps 32–63)  │ offset +12
                    │ datap[1].permitted     (caps 32–63)  │ offset +16
                    │ datap[1].inheritable   (caps 32–63)  │ offset +20
                    └──────────────────────────────────────┘
                             Total: 24 bytes
    ```

**Return values**

```nasm
rax = 0              ; success
rax < 0              ; error
```

Common errors:

- `14` → `EFAULT`: `hdrp` or `datap` point to inaccessible memory. `hdrp` can never be NULL.
- `22` → `EINVAL`: the `version` field in the header is not a recognized version. The kernel overwrites `version` with the preferred version (`0x20080522`), which allows probing the supported version.
- `1` → `EPERM`: an attempt was made to add a capability to the **permitted** set (permitted can only shrink), to activate in **effective** a capability not in **permitted**, to add to **inheritable** a capability not in the **bounding set** or not in **permitted** while the process lacks `CAP_SETPCAP` in effective, or to modify capabilities of a thread other than the current one.
- `3` → `ESRCH`: the specified PID/TID does not exist (only occurs when a non-zero pid different from one's own is passed on kernels that allow it).

### Capabilities Relevant from an Offensive Perspective

**Capabilities 0–31:**

| Index | Constant | Offensive use |
|--------|-----------|----------------|
| 0 | `CAP_CHOWN` | Change owner of any file |
| 1 | `CAP_DAC_OVERRIDE` | Full bypass of read/write/execute permissions on files |
| 2 | `CAP_DAC_READ_SEARCH` | Bypass read permissions on files and directory search |
| 3 | `CAP_FOWNER` | Bypass owner checks on file operations |
| 5 | `CAP_KILL` | Send signals to any process (no UID restriction) |
| 6 | `CAP_SETGID` | Manipulate process GIDs (`setgid`, `setregid`, `setresgid`) |
| 7 | `CAP_SETUID` | Manipulate process UIDs (`setuid`, `setreuid`, `setresuid`) |
| 8 | `CAP_SETPCAP` | Modify the inheritable set and bounding set of the process, and manage certain securebits |
| 10 | `CAP_NET_BIND_SERVICE` | Bind to privileged ports (< 1024) |
| 12 | `CAP_NET_ADMIN` | Network configuration: interfaces, routes, firewall, promiscuous sniffing |
| 13 | `CAP_NET_RAW` | Create raw sockets and packet sockets (traffic capture, packet injection) |
| 16 | `CAP_SYS_MODULE` | Load and unload kernel modules (`init_module`, `delete_module`) |
| 17 | `CAP_SYS_RAWIO` | Direct I/O access: `ioperm`, `iopl`, `/dev/mem`, `/dev/kmem` |
| 18 | `CAP_SYS_CHROOT` | Invoke chroot (chroot jail escape when combined with other caps) |
| 19 | `CAP_SYS_PTRACE` | `ptrace` any process |
| 21 | `CAP_SYS_ADMIN` | Swiss-army capability: mount, umount, namespaces, BPF, CRIU, syslog, etc. |
| 24 | `CAP_SYS_RESOURCE` | Override resource limits (`RLIMIT_*`, disk quotas) |
| 25 | `CAP_SYS_TIME` | Modify the system clock |
| 27 | `CAP_MKNOD` | Create device nodes (`mknod`) |
| 31 | `CAP_SETFCAP` | Set file capabilities on executables |

**Capabilities 32–63:**

| Index | Constant | Offensive use |
|--------|-----------|----------------|
| 33 | `CAP_MAC_ADMIN` | Override MAC policies (Smack, AppArmor in certain modes) |
| 34 | `CAP_SYSLOG` | Read the kernel ring buffer (`dmesg`), may leak KASLR addresses |
| 37 | `CAP_AUDIT_READ` | Read audit records via multicast netlink |
| 38 | `CAP_PERFMON` | Performance monitoring, access to `perf_events`. Combined with `CAP_BPF` allows loading BPF tracing programs |
| 39 | `CAP_BPF` | BPF operations, create maps, load programs, advanced verifier access, and with `CAP_NET_ADMIN` allows network BPF programs |
| 40 | `CAP_CHECKPOINT_RESTORE` | Checkpoint/restore operations (CRIU) |

## UID Transitions and Capabilities

### The UID Fixup Concept

The design premise is: if a process ceases to be root, the capabilities it held by virtue of being root should disappear. Otherwise, a process with UID 1000 and `CAP_SYS_ADMIN` would be as dangerous as root yet invisible to tools that only check the UID.

UID fixup is the mechanism that implements this premise. Every time a process modifies its UIDs (via `setresuid`, `setreuid` or `setuid`), the kernel evaluates whether the transition implies a change in privilege level and adjusts the capability sets accordingly. The adjustment works in both directions. A process dropping root loses capabilities, and a process that gains EUID=0 recovers capabilities from its permitted set.

Fixup prevents a process from degrading its UID to evade detection while retaining full privileges. But it also creates a problem for any tool that legitimately needs to operate with unprivileged UIDs and active capabilities. The retention mechanisms (`SECURE_KEEP_CAPS` and securebits, covered below) exist precisely for cases where the fixup's default behavior is too aggressive.

**Implementation via `cap_emulate_setxuid`**

The function consists of three independent conditional blocks evaluated sequentially:

```c
static int cap_task_fix_setuid(struct cred *new, const struct cred *old, int flags)
{
    switch (flags) {
    case LSM_SETID_RE:
    case LSM_SETID_ID:
    case LSM_SETID_RES:
        /* If SECURE_NO_SETUID_FIXUP is active, no changes are made */
        if (!issecure(SECURE_NO_SETUID_FIXUP))
            cap_emulate_setxuid(new, old);
        break;
    // ...
    }
    return 0;
}

static inline void cap_emulate_setxuid(struct cred *new, const struct cred *old)
{
    kuid_t root_uid = make_kuid(old->user_ns, 0);

    /* Block 1: Complete abandonment of root */
    if ((uid_eq(old->uid, root_uid) ||
         uid_eq(old->euid, root_uid) ||
         uid_eq(old->suid, root_uid)) &&
        (!uid_eq(new->uid, root_uid) &&
         !uid_eq(new->euid, root_uid) &&
         !uid_eq(new->suid, root_uid))) {
        if (!issecure(SECURE_KEEP_CAPS)) {
            cap_clear(new->cap_permitted);
            cap_clear(new->cap_effective);
        }
        cap_clear(new->cap_ambient);
    }

    /* Block 2: Loss of EUID=0 */
    if (uid_eq(old->euid, root_uid) && !uid_eq(new->euid, root_uid))
        cap_clear(new->cap_effective);

    /* Block 3: Gain of EUID=0 */
    if (!uid_eq(old->euid, root_uid) && uid_eq(new->euid, root_uid))
        new->cap_effective = new->cap_permitted;
}
```

| Block | Condition | What happens | Effect on capabilities |
|--------|-----------|--------------|------------------------|
| **Block 1** | The process **had at least one UID = 0** (RUID, EUID or SUID) and **afterward none are 0** | The process fully abandons root privileges | If `SECURE_KEEP_CAPS` is **not** set, `cap_permitted` and `cap_effective` are cleared. `cap_ambient` is always cleared. |
| **Block 2** | **EUID was 0 and no longer is** | The process loses **root EUID** | `cap_effective` is cleared. This action is independent of `SECURE_KEEP_CAPS`. |
| **Block 3** | **EUID was not 0 and becomes 0** | The process gains **root EUID** | `cap_effective` is set equal to `cap_permitted`. |

### Retention Mechanisms

To address the problem of UID demotion clearing capabilities, there are two solutions with different properties:

#### **PR_SET_KEEPCAPS (`prctl` option 8)**

Controls whether the process retains its capabilities in the permitted (P) set when it changes its UIDs.

```nasm
mov rax, 157
mov rdi, 8              ; PR_SET_KEEPCAPS
mov rsi, value           ; 1 = enable
syscall
```

- `value` (RSI):
    - 0 → default behavior: when a process with UID 0 (root) transitions all its UIDs (real, effective, saved) to non-zero values (e.g. `setresuid(1000, 1000, 1000)`), the kernel clears the permitted, effective and ambient sets.
    - 1 → capabilities in the permitted set are preserved after the UID transition. The effective and ambient sets are still cleared (`PR_SET_KEEPCAPS` only protects the permitted set). Capabilities can be recovered afterward, from permitted to effective using the `capset` syscall and from permitted to ambient using `PR_CAP_AMBIENT_RAISE` (requires the capability to also be in inheritable).

!!! danger ""
    A process that starts as root can call `prctl(PR_SET_KEEPCAPS, 1)`, then `setuid(1000)` to appear as a normal user while retaining critical capabilities such as `CAP_NET_RAW`, `CAP_DAC_READ_SEARCH` or `CAP_SYS_PTRACE` in its permitted set. From there, it can elevate them to the effective set or propagate them via ambient capabilities. Tools that only alert on processes running as root will not detect a process with UID 1000 that retains privileged capabilities.

#### **PR_SET_SECUREBITS (`prctl` option 28)**

Sets the secure bits for the process. Securebits control in a granular way how the kernel handles capabilities during UID transitions and `execve`. **Requires `CAP_SETPCAP` in the effective set.**

```nasm
mov rax, 157
mov rdi, 28             ; PR_SET_SECUREBITS
mov rsi, flags          ; bitmask of securebits
syscall
```

`flags` (RSI): OR-combinable bitmask:

- `SECBIT_NOROOT` = `0x01` → Disables the special treatment of UID 0 in `execve`. Normally, if a process with UID 0 calls `execve`, the kernel grants it full capabilities. With `NOROOT`, UID 0 no longer receives automatic capabilities, it only gets them if the binary has explicit file capabilities.
- `SECBIT_NOROOT_LOCKED` = `0x02` → Locks `SECBIT_NOROOT` so it cannot be disabled.
- `SECBIT_NO_SETUID_FIXUP` = `0x04` → Disables all automatic capability adjustment when UIDs change. Neither permitted, effective, nor ambient sets are modified. If this bit is set, `KEEP_CAPS` is redundant (it is a subset). Unlike `KEEP_CAPS`, it is not cleared on `execve`.
- `SECBIT_NO_SETUID_FIXUP_LOCKED` = `0x08` → Locks `SECBIT_NO_SETUID_FIXUP` so it cannot be disabled.
- `SECBIT_KEEP_CAPS` = `0x10` → When root drops to a non-zero UID, the kernel does not clear the permitted set. The effective and ambient sets are cleared, but capabilities remain in permitted and can be recovered later. Automatically cleared on each `execve`.
- `SECBIT_KEEP_CAPS_LOCKED` = `0x20` → Locks `SECBIT_KEEP_CAPS` so it cannot be disabled.
- `SECBIT_NO_CAP_AMBIENT_RAISE` = `0x40` → Prevents using `PR_CAP_AMBIENT_RAISE`. If set, no one can add capabilities to the ambient set. This closes that propagation path.
- `SECBIT_NO_CAP_AMBIENT_RAISE_LOCKED` = `0x80` → Locks `SECBIT_NO_CAP_AMBIENT_RAISE` so it cannot be disabled.

A process that starts with UID 0 sets `SECBIT_NO_SETUID_FIXUP` + `SECBIT_NO_SETUID_FIXUP_LOCKED`, then calls `setresuid(1000,1000,1000)`. The result is a process that appears to be UID 1000 but retains all its capabilities intact (all sets), and no one (not even root) can revert that configuration because the locked bit is irreversible.

## Credential Inheritance: `fork`, `clone` and `execve`

The initial credential state of a process depends on how it was created.

### `fork` / `clone`

`fork` and `clone` create a new child process with an **exact copy** of the parent's credentials. The three UIDs, three GIDs and five capability sets are duplicated. The child starts with the same `struct cred` (initially shared by reference, cloned on the first modification thanks to the copy-on-write pattern).

This means a process that has escalated to root and maximized capabilities before calling `fork`/`clone` will produce a child with the same elevated credentials.

### `execve` and the setuid bit

`execve` replaces the current process image with the invoked one, **recalculating credentials** according to the properties of the new binary:

**Without setuid bit**: RUID, EUID and SUID remain unchanged. Capabilities are recalculated according to the transition formulas described above.

**With setuid bit set** (`chmod u+s`): the kernel sets the EUID and SUID to the UID of the executable file's owner. RUID is maintained. The resulting credential state:

```c
Before execve:  RUID=1000, EUID=1000, SUID=1000
Binary with setuid owned by root (uid=0, u+s)
After execve: RUID=1000, EUID=0, SUID=0
```

## Credentials and User Namespaces

In a user namespace, UIDs are remapped. A process with UID 0 inside a user namespace does not have root privileges in the parent namespace (UIDs are relative to the namespace). `CLONE_NEWUSER` creates a user namespace where the process gets full capabilities, but only within that namespace. Operations on the parent namespace remain subject to the original credentials.

## Acknowledgements

Thanks for making it this far.

If you find errors or want to improve/extend the article, the blog content is open to Pull Requests. All contributions are welcome.

See you in the next article! ;)
