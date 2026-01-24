# Linux Privilege Escalation

Técnicas de escalada de privilegios en Linux.

---

## Enumeration

```bash
# System info
uname -a
cat /etc/issue

# Current user
id
sudo -l

# Users
cat /etc/passwd | grep -E '/bin/(ba)?sh'

# Network
ip a
ss -tulpn
```

## SUID Binaries

```bash
find / -perm -4000 -type f 2>/dev/null
```

!!! tip "GTFOBins"
    Consulta [GTFOBins](https://gtfobins.github.io/) para técnicas de explotación de binarios SUID.

## Capabilities

```bash
getcap -r / 2>/dev/null
```

## Cron Jobs

```bash
cat /etc/crontab
ls -la /etc/cron.*
```

## Writable Files

```bash
find / -writable -type f 2>/dev/null
```

!!! warning "Archivos críticos"
    Si `/etc/passwd` o `/etc/shadow` son escribibles, puedes añadir un usuario con privilegios root.

## Kernel Exploits

| Kernel | CVE | Nombre |
|--------|-----|--------|
| 2.6.22 - 3.9 | CVE-2016-5195 | DirtyCow |
| 5.8 - 5.16.11 | CVE-2022-0847 | DirtyPipe |

## Automated Tools

```bash
# LinPEAS
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh
```

---

!!! note "Recursos"
    - [HackTricks - Linux Privesc](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
    - [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
