# =====================================================================
# Fase 2: Instalacao de softwares base
# Rode em PowerShell ADMINISTRADOR
# =====================================================================

Write-Host ""
Write-Host "=== FASE 2: Instalando softwares base ===" -ForegroundColor Cyan
Write-Host ""

# Verifica winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: winget nao encontrado." -ForegroundColor Red
    Write-Host "Instale 'App Installer' pela Microsoft Store primeiro."
    exit 1
}

# Verifica se esta como admin
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($current)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERRO: rode como ADMINISTRADOR." -ForegroundColor Red
    exit 1
}

$pacotes = @(
    @{Id="Docker.DockerDesktop";              Nome="Docker Desktop"},
    @{Id="Cloudflare.cloudflared";            Nome="Cloudflare Tunnel"},
    @{Id="AnyDeskSoftwareGmbH.AnyDesk";       Nome="AnyDesk (acesso remoto)"},
    @{Id="Git.Git";                           Nome="Git"},
    @{Id="Notepad++.Notepad++";               Nome="Notepad++"},
    @{Id="Python.Python.3.12";                Nome="Python 3.12"}
)

Write-Host "Instalando WSL2..." -ForegroundColor Yellow
wsl --install --no-distribution

foreach ($p in $pacotes) {
    Write-Host ""
    Write-Host "Instalando $($p.Nome)..." -ForegroundColor Yellow
    winget install -e --id $p.Id --accept-source-agreements --accept-package-agreements
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "INSTALACAO CONCLUIDA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ACOES MANUAIS NECESSARIAS AGORA:" -ForegroundColor Yellow
Write-Host "  1. REINICIE o notebook"
Write-Host "  2. Apos reiniciar, abra Docker Desktop e aceite os termos"
Write-Host "  3. Confirme que Docker esta usando WSL2 (Settings > General)"
Write-Host "  4. Depois rode: .\03_configurar_energia.ps1"
Write-Host ""
