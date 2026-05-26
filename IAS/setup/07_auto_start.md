# Fase 7: Auto-start de tudo no boot

Objetivo: garantir que se o notebook reiniciar (update, queda de luz),
TODO o stack volta a funcionar sozinho em ate 3 minutos, sem voce
precisar fazer nada.

## 7.1 Docker Desktop ao iniciar Windows

1. Abre Docker Desktop (icone na bandeja)
2. Engrenagem (Settings) > General
3. MARCA: "Start Docker Desktop when you log in"
4. Desmarca "Open Docker Dashboard at startup" (opcional)
5. Apply & Restart

## 7.2 Containers ja sobem com Docker

Como usamos `restart: always` no `docker-compose.yml`, basta o
Docker inicializar que os containers seguem automaticamente.

Confirma:

```powershell
docker compose --env-file E:\CAUS\FETICHES\IAS\.env -f E:\CAUS\FETICHES\IAS\docker\docker-compose.yml ps
```

Todos devem estar `Up`.

## 7.3 Cloudflared como servico Windows

Ja configurado na Fase 5.5 com o comando `cloudflared.exe service install`.
Verifica:

```powershell
Get-Service cloudflared
```

Status: `Running`, StartType: `Automatic`. OK.

## 7.4 Agendar Health Check no Task Scheduler

Roda este comando UMA vez em PowerShell ADMIN para criar a tarefa:

```powershell
$scriptPath = "E:\CAUS\FETICHES\IAS\setup\06_health_check.ps1"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 10)

$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName "IAS Health Check" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force
```

Verifica na interface grafica:
Win+R > `taskschd.msc` > Procurar "IAS Health Check"

## 7.5 Auto-login do usuario Windows

Pra que tudo suba mesmo apos reboot por queda de luz, o Windows
precisa logar sozinho no usuario administrador:

```powershell
netplwiz
```

- Desmarca "Os usuarios devem digitar um nome..."
- Aplicar > digita a senha do usuario atual
- OK

## 7.6 BIOS - religar apos queda de energia

Apenas para o notebook secundario (24/7):

1. Reinicia notebook
2. Entra na BIOS (F2/F10/DEL no boot)
3. Procura "AC Power Recovery" ou "Restore on AC Power Loss"
   ou "After Power Failure"
4. Seta como: `Always On` (ou `Last State`)
5. Save & Exit

## 7.7 Desativar reinicio automatico do Windows Update

Configuracoes > Windows Update > Opcoes avancadas

- Marca "Notificar antes de baixar e instalar"
- Define horario ativo das 0h as 23h (Windows NUNCA reinicia sozinho)
- Pausa atualizacoes por 5 semanas

A cada 5 semanas voce renova manualmente via AnyDesk.

## 7.8 Teste final - simular reboot

Forca reboot e cronometra:

```powershell
Restart-Computer -Force
```

Tempo esperado ate tudo voltar:
- Boot Windows + login automatico: ~1 min
- Docker Desktop iniciar: ~30s
- Containers up (com restart always): ~30s
- Cloudflared service: ~10s

Total: 2-3 minutos do boot ate `https://n8n.seudominio.com.br` voltar.

Apos o reboot:
1. Acessa via celular (sem rede de casa) pra confirmar tunnel
2. Verifica logs do health check em `IAS\logs\health.log`
3. Verifica que os containers estao `Up`:
   ```powershell
   cd E:\CAUS\FETICHES\IAS\docker
   docker compose --env-file ..\.env ps
   ```

## Pronto

A partir daqui o sistema e auto-suficiente. Voce so precisa:
- Aprovar roteiros via Telegram (5 min/dia)
- Renovar Windows Update a cada 5 semanas
- Acompanhar metricas no TikTok Analytics

## Proximo passo

Ja com o stack 24/7 rodando, configure os workflows do n8n.
Veja: `..\n8n\README.md`
