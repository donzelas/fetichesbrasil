# =====================================================================
# Fase 4: Sobe os containers do stack IAS
# Rode em PowerShell (pode ser usuario comum se ja iniciou Docker Desktop)
# =====================================================================

$rootDir = "E:\CAUS\FETICHES\IAS"

Write-Host ""
Write-Host "=== FASE 4: Subindo containers do stack IAS ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$rootDir\.env")) {
    Write-Host "ERRO: arquivo .env nao encontrado em $rootDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Crie copiando .env.example:"
    Write-Host "  Copy-Item $rootDir\.env.example $rootDir\.env"
    Write-Host ""
    Write-Host "Depois preencha as variaveis obrigatorias:"
    Write-Host "  - GROQ_API_KEY"
    Write-Host "  - GEMINI_API_KEY"
    Write-Host "  - PEXELS_API_KEY"
    Write-Host "  - SUPABASE_*"
    Write-Host "  - N8N_BASIC_AUTH_PASSWORD"
    Write-Host "  - N8N_ENCRYPTION_KEY"
    Write-Host "  - POSTIZ_JWT_SECRET"
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: docker nao encontrado." -ForegroundColor Red
    Write-Host "Abra o Docker Desktop e aguarde inicializar antes de rodar este script."
    exit 1
}

# Confirma que Docker esta rodando
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker Desktop nao esta rodando." -ForegroundColor Red
    Write-Host "Abra o Docker Desktop e aguarde aparecer 'Engine running'."
    exit 1
}

Write-Host "Criando pastas de dados..." -ForegroundColor Yellow
$pastas = @("n8n_data", "postiz_data", "postiz_db_data", "output", "broll_cache", "uptime_data", "logs")
foreach ($p in $pastas) {
    $path = Join-Path $rootDir $p
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  criado: $path"
    } else {
        Write-Host "  ja existe: $path"
    }
}

Write-Host ""
Write-Host "Subindo containers (primeira vez vai baixar ~3GB de imagens)..." -ForegroundColor Yellow
Set-Location "$rootDir\docker"
docker compose --env-file "$rootDir\.env" up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO ao subir containers. Veja logs:" -ForegroundColor Red
    Write-Host "  docker compose --env-file $rootDir\.env logs"
    exit 1
}

Write-Host ""
Write-Host "Aguardando containers iniciarem (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Status:" -ForegroundColor Cyan
docker compose --env-file "$rootDir\.env" ps

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "STACK NO AR" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse localmente:"
Write-Host "  n8n     -> http://localhost:5678"
Write-Host "  postiz  -> http://localhost:3000"
Write-Host "  whisper -> http://localhost:9000/docs"
Write-Host "  uptime  -> http://localhost:3001"
Write-Host ""
Write-Host "Login do n8n: usar credenciais do .env (N8N_BASIC_AUTH_*)"
Write-Host ""
Write-Host "Proximo passo: configure o Cloudflare Tunnel."
Write-Host "Veja: $rootDir\setup\05_cloudflare_tunnel.md"
