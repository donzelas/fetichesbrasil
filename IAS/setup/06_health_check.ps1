# =====================================================================
# Fase 6: Health check do stack IAS
# Roda a cada 10 minutos via Agendador de Tarefas
# Se algum servico cair, reinicia containers automaticamente
# =====================================================================

$rootDir = "E:\CAUS\FETICHES\IAS"
$logFile = Join-Path $rootDir "logs\health.log"

# Garante pasta de logs
$logDir = Split-Path $logFile -Parent
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$endpoints = @(
    @{Name="n8n";     Url="http://localhost:5678"},
    @{Name="postiz";  Url="http://localhost:3000"},
    @{Name="whisper"; Url="http://localhost:9000"},
    @{Name="uptime";  Url="http://localhost:3001"}
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$todosOk = $true
$resultados = @()

foreach ($ep in $endpoints) {
    try {
        $resp = Invoke-WebRequest -Uri $ep.Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        $resultados += "$timestamp OK     $($ep.Name) (HTTP $($resp.StatusCode))"
    } catch {
        $resultados += "$timestamp FAIL   $($ep.Name) - $($_.Exception.Message)"
        $todosOk = $false
    }
}

$resultados | Out-File -Append $logFile

if (-not $todosOk) {
    "$timestamp ACAO   reiniciando containers" | Out-File -Append $logFile
    Set-Location "$rootDir\docker"
    docker compose --env-file "$rootDir\.env" restart 2>&1 | Out-File -Append $logFile
}

# Trunca log se passar de 5MB
if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 5MB)) {
    $tail = Get-Content $logFile -Tail 1000
    $tail | Out-File $logFile
}
