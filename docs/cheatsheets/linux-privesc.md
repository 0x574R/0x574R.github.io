# Linux Privilege Escalation

<figure class="hero-image" markdown>
  ![Linux Privesc](../assets/images/cheatsheets-hero.svg){ width="100%" }
</figure>

Guía de referencia rápida para escalada de privilegios en sistemas Linux.

---

## System info

```bash
# Sistema
uname -a
cat /etc/issue
cat /etc/*-release

# Hostname
hostname
```

## Current user

```bash
id
whoami
sudo -l
```

## Users

```bash
cat /etc/passwd | grep -E '/bin/(ba)?sh'
cat /etc/shadow  # si tenemos permisos
```

## Network

```bash
ip a
ss -tulpn
netstat -antup
```

## SUID Binaries

```bash
find / -perm -4000 -type f 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
```

## Capabilities

```bash
getcap -r / 2>/dev/null
```

## Cron Jobs

```bash
cat /etc/crontab
ls -la /etc/cron.*
crontab -l
```

## Writable directories

```bash
find / -writable -type d 2>/dev/null
find / -perm -222 -type d 2>/dev/null
```

---

!!! tip "GTFOBins"
    Consulta [GTFOBins](https://gtfobins.github.io/) para exploits de binarios SUID.

---

!!! recursos "Enlaces útiles"
    - [HackTricks - Linux Privesc](https://book.hacktricks.xyz/linux-hardening/privilege-escalation)
    - [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
    - [LinPEAS](https://github.com/carlospolop/PEASS-ng)
