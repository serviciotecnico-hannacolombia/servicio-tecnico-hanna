# Backup de la base de datos de Supabase con pg_dump.
#
# La cadena de conexión (Session pooler, con contraseña) se lee de la variable
# de entorno de usuario SUPABASE_DB_URL; nunca va en el repo.
#
# Genera dos archivos por fecha en la carpeta de destino:
#   public_<fecha>.dump  esquema + datos de la app (tablas, funciones, RLS)
#   auth_<fecha>.dump    solo datos de auth (usuarios)
# Formato custom (-Fc): comprimido; se restaura con pg_restore.
# Conserva los últimos $Conservar backups de cada tipo.
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1

param(
  [string]$Destino = "$env:USERPROFILE\OneDrive - Hanna Instruments SAS\Backups Supabase",
  [int]$Conservar = 30
)

$ErrorActionPreference = 'Stop'

$dbUrl = $env:SUPABASE_DB_URL
if (-not $dbUrl) { $dbUrl = [Environment]::GetEnvironmentVariable('SUPABASE_DB_URL', 'User') }
if (-not $dbUrl) { throw 'Falta la variable de entorno SUPABASE_DB_URL.' }

$pgDump = 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe'
if (-not (Test-Path $pgDump)) { throw "No se encontró pg_dump en $pgDump" }

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$fecha = Get-Date -Format 'yyyy-MM-dd_HHmm'

# Cuando corre desde el Programador de tareas no hay consola: se deja registro.
Start-Transcript -Path (Join-Path $Destino 'backup.log') -Append | Out-Null

$respaldos = @(
  @{ Nombre = 'public'; Args = @('--schema=public', '--no-owner', '--no-privileges') },
  @{ Nombre = 'auth';   Args = @('--schema=auth', '--data-only') }
)

foreach ($r in $respaldos) {
  $archivo = Join-Path $Destino "$($r.Nombre)_$fecha.dump"
  Write-Host "Respaldando $($r.Nombre) -> $archivo"
  & $pgDump $dbUrl -Fc @($r.Args) -f $archivo
  if ($LASTEXITCODE -ne 0) {
    Remove-Item $archivo -ErrorAction SilentlyContinue
    throw "pg_dump falló para $($r.Nombre) (código $LASTEXITCODE)"
  }
  $kb = [math]::Round((Get-Item $archivo).Length / 1KB)
  Write-Host "  OK ($kb KB)"

  Get-ChildItem $Destino -Filter "$($r.Nombre)_*.dump" |
    Sort-Object Name -Descending |
    Select-Object -Skip $Conservar |
    Remove-Item
}

Write-Host 'Backup terminado.'
Stop-Transcript | Out-Null
