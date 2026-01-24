# Linux Privilege Escalation

> Checklist práctica y rápida para **enumeración → explotación → post**.

## Enumeración rápida

```bash
id
uname -a
cat /etc/os-release
sudo -l
```

## SUID / Capabilities

```bash
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
```

## Cron / timers

```bash
crontab -l
ls -la /etc/cron.*
systemctl list-timers --all
```

## Credenciales

```bash
grep -R "password" -n . 2>/dev/null
find / -name "*.kdbx" -o -name "*.sqlite" 2>/dev/null
```

---

> Completa con tus notas reales.
