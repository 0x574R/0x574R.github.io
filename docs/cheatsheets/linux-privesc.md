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

Consulta [GTFOBins](https://gtfobins.github.io/) para explotación.

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

**Recursos**: [HackTricks](https://book.hacktricks.xyz/linux-hardening/privilege-escalation) · [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
