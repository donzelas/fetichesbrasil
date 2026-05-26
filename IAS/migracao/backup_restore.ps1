# =====================================================================
# Backup e restauracao do stack IAS
# Uso:
#   .\backup_restore.ps1 -Action Backup
#   .\backup_restore.ps1 -Action Restore -BackupFile path\to\backup.zip
# =====================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Backup","Restore")]
    [string]$Action,

    [string]$BackupFile,

    [string]$RootDir = "E:\CAUS\FETICHES\IAS"
)

function Backup-Stack {
    param([string]$RootDir)

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "$RootDir\..\backup_ias_$timestamp"
    $backupZip = "$backupDir.zip"

    Write-Host "Criando backup em $backupZip" -ForegroundColor Cyan

    if (-not (Test-Path $RootDir)) {
        Write-Host "ERRO: pasta IAS nao encontrada em $RootDir" -ForegroundColor Red
        exit 1
    }

    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    $itensBackup = @(
        "n8n_data",
        "postiz_data",
        "postiz_db_data",
        "broll_cache",
        ".env"
    )

    foreach ($item in $itensBackup) {
        $origem = Join-Path $RootDir $item
        if (Test-Path $origem) {
            Write-Host "  copiando $item..."
            Copy-Item -Recurse -Path $origem -Destination $backupDir -Force
        } else {
            Write-Host "  pulando $item (nao existe)" -ForegroundColor Yellow
        }
    }

    Write-Host "Comprimindo..." -ForegroundColor Cyan
    Compress-Archive -Path "$backupDir\*" -DestinationPath $backupZip -CompressionLevel Optimal

    Write-Host "Removendo diretorio temporario..."
    Remove-Item -Recurse -Force $backupDir

    $size = (Get-Item $backupZip).Length / 1MB
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "BACKUP CONCLUIDO" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Arquivo: $backupZip"
    Write-Host "Tamanho: $($size.ToString('0.00')) MB"
    Write-Host ""
    Write-Host "Transfira esse zip para o notebook secundario."
}

function Restore-Stack {
    param([string]$RootDir, [string]$BackupFile)

    if (-not $BackupFile) {
        Write-Host "ERRO: especifique -BackupFile caminho\para\backup.zip" -ForegroundColor Red
        exit 1
    }
    if (-not (Test-Path $BackupFile)) {
        Write-Host "ERRO: arquivo nao encontrado: $BackupFile" -ForegroundColor Red
        exit 1
    }

    Write-Host "Restaurando $BackupFile em $RootDir" -ForegroundColor Cyan

    # Verifica se containers estao parados
    Set-Location "$RootDir\docker"
    $running = docker compose ps -q 2>$null
    if ($running) {
        Write-Host "AVISO: containers estao rodando. Parando..." -ForegroundColor Yellow
        docker compose --env-file "$RootDir\.env" down
    }

    # Confirma sobrescrever
    if ((Test-Path "$RootDir\n8n_data") -or (Test-Path "$RootDir\.env")) {
        $confirm = Read-Host "Dados existentes serao sobrescritos. Continuar? (s/N)"
        if ($confirm -ne "s") {
            Write-Host "Cancelado."
            exit 0
        }
    }

    Write-Host "Extraindo..." -ForegroundColor Cyan
    Expand-Archive -Path $BackupFile -DestinationPath $RootDir -Force

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "RESTAURACAO CONCLUIDA" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximo passo: subir os containers"
    Write-Host "  cd $RootDir\docker"
    Write-Host "  docker compose --env-file ..\.env up -d"
}

# ============================================
switch ($Action) {
    "Backup"  { Backup-Stack -RootDir $RootDir }
    "Restore" { Restore-Stack -RootDir $RootDir -BackupFile $BackupFile }
}
