# =====================================================================
# Fase 3: Configuracao de energia "Servidor 24/7"
# Rode em PowerShell ADMINISTRADOR
# =====================================================================

Write-Host ""
Write-Host "=== FASE 3: Configurando energia para 24/7 ===" -ForegroundColor Cyan
Write-Host ""

# Verifica admin
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($current)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERRO: rode como ADMINISTRADOR." -ForegroundColor Red
    exit 1
}

Write-Host "Criando plano de energia 'Servidor 24/7'..." -ForegroundColor Yellow

# Duplica o plano "Alto desempenho"
$altoDesempenho = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
$dupOut = powercfg /duplicatescheme $altoDesempenho 2>&1
$newGuid = ($dupOut | Select-String -Pattern '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})').Matches.Value | Select-Object -First 1

if (-not $newGuid) {
    Write-Host "Falha ao duplicar plano. Tentando criar manualmente..." -ForegroundColor Yellow
    $newGuid = $altoDesempenho
} else {
    powercfg /changename $newGuid "Servidor 24-7" "Plano otimizado para uso como servidor"
    powercfg /setactive $newGuid
    Write-Host "Plano criado: $newGuid" -ForegroundColor Green
}

Write-Host ""
Write-Host "Aplicando timeouts zerados..." -ForegroundColor Yellow

# Na tomada
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 15
powercfg /change disk-timeout-ac 0

# Na bateria
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-dc 0
powercfg /change monitor-timeout-dc 15
powercfg /change disk-timeout-dc 0

Write-Host "Configurando acao da tampa (nao fazer nada)..." -ForegroundColor Yellow
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0

Write-Host "Configurando botao de energia (suspender)..." -ForegroundColor Yellow
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS PBUTTONACTION 1
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS PBUTTONACTION 1

powercfg /setactive SCHEME_CURRENT

Write-Host "Desativando hibernacao globalmente..." -ForegroundColor Yellow
powercfg /hibernate off

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "CONFIGURACAO DE ENERGIA CONCLUIDA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Notebook agora:"
Write-Host "  - NAO suspende quando fechar a tampa"
Write-Host "  - NAO hiberna nunca"
Write-Host "  - Apenas a TELA desliga apos 15 min ociosa"
Write-Host ""
Write-Host "PROXIMO PASSO MANUAL na BIOS (notebook secundario):"
Write-Host "  Configure 'AC Power Recovery' = Always On" -ForegroundColor Yellow
Write-Host "  (assim notebook religa apos queda de luz)"
Write-Host ""
Write-Host "Apos isso, configure o .env e rode: .\04_subir_docker.ps1"
