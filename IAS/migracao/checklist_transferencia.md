# Checklist para mover o setup do PC atual para o notebook secundario

Use este checklist quando o sistema estiver funcionando perfeitamente
no PC de desenvolvimento e voce quiser migrar tudo para o notebook
secundario dedicado.

## Antes de mover

- [ ] Tudo funcionando no PC atual por pelo menos 7 dias seguidos
- [ ] Pelo menos 10 workflows TikTok ja postados sem erro
- [ ] Workflows do n8n exportados para o Git
- [ ] Backup do `.env` salvo em local seguro (Bitwarden, KeePass)
- [ ] Senhas anotadas: N8N basic auth, Cloudflare account, etc

## Passo 1: Para os containers no PC atual

```powershell
cd E:\CAUS\FETICHES\IAS\docker
docker compose --env-file ..\.env down
```

NAO use `down -v` (apagaria os volumes).

## Passo 2: Backup completo

Rode o script de backup:

```powershell
.\E:\CAUS\FETICHES\IAS\migracao\backup_restore.ps1 -Action Backup
```

Vai gerar um arquivo `backup_ias_YYYYMMDD_HHMMSS.zip` na raiz do projeto.

## Passo 3: Transferir o backup

Opcoes em ordem de praticidade:

| Metodo | Tempo | Observacao |
|--------|-------|-----------|
| Pendrive USB 3.0 | 5-10 min | Backup tipicamente 1-3 GB |
| Compartilhamento de rede local | 10-15 min | SMB do Windows |
| Backblaze B2 / Google Drive | 30 min-2h | Depende da internet |
| Cabo Ethernet PC <-> Notebook | 5 min | Mais rapido |

## Passo 4: Preparar notebook secundario

No notebook secundario, execute as Fases 1 a 3 do setup:

```powershell
# Fase 1 - manual, segue 01_preparacao_notebook.md
# Fase 2
.\E:\CAUS\FETICHES\IAS\setup\02_instalar_softwares.ps1
# REBOOT
# Fase 3
.\E:\CAUS\FETICHES\IAS\setup\03_configurar_energia.ps1
```

Tambem clona o repositorio:

```powershell
cd E:\CAUS
git clone https://github.com/donzelas/fetichesbrasil.git FETICHES
```

## Passo 5: Restaurar dados no notebook secundario

Copia o `backup_ias_*.zip` para o notebook e rode:

```powershell
.\E:\CAUS\FETICHES\IAS\migracao\backup_restore.ps1 `
    -Action Restore `
    -BackupFile "C:\caminho\para\backup_ias_20260521_120000.zip"
```

## Passo 6: Configurar Cloudflare Tunnel novo

O tunnel antigo continua apontando pro PC velho. Voce precisa:

Opcao A: Criar tunnel NOVO no notebook (recomendado)
1. Cloudflare > Zero Trust > Networks > Tunnels > Create
2. Nome: `notebook-dedicado`
3. Instala o conector NO NOTEBOOK
4. Configura os mesmos public hostnames apontando pra `localhost:porta`
5. Apos confirmar que funciona, DELETA o tunnel antigo

Opcao B: Migrar credenciais do tunnel
1. Para o cloudflared no PC antigo
2. Copia `C:\Windows\System32\config\systemprofile\.cloudflared\` pro notebook
3. Instala servico no notebook usando as mesmas credenciais
- Menos seguro, prefere Opcao A

## Passo 7: Subir stack no notebook

```powershell
.\E:\CAUS\FETICHES\IAS\setup\04_subir_docker.ps1
```

## Passo 8: Validar tudo

- [ ] `docker compose ps` mostra todos containers `Up`
- [ ] `http://localhost:5678` abre n8n
- [ ] `http://localhost:3000` abre Postiz
- [ ] Workflows do n8n estao todos la
- [ ] Postiz tem as contas TikTok conectadas
- [ ] `https://n8n.seudominio.com.br` acessivel de fora
- [ ] Health check rodando: `cat logs\health.log`
- [ ] Ja rodou pelo menos 1 ciclo manual via "Execute Workflow"

## Passo 9: Configurar auto-start

```
.\E:\CAUS\FETICHES\IAS\setup\07_auto_start.md (segue manual)
```

## Passo 10: Apagar do PC original

APENAS APOS 48 HORAS DO NOTEBOOK FUNCIONANDO PERFEITAMENTE:

```powershell
cd E:\CAUS\FETICHES\IAS\docker
docker compose --env-file ..\.env down -v   # CUIDADO: apaga volumes
docker system prune -a -f                    # libera espaco
# E pode deletar a pasta IAS toda do PC antigo
```

## Em caso de problema

Se algo der errado durante a migracao:

1. NAO apaga o PC original
2. Volta a rodar `docker compose up -d` no PC original
3. Investiga o problema com calma
4. So apaga o PC original quando notebook estiver perfeito

## Backup continuo apos migracao

Configura backup automatico do notebook pra Backblaze B2 ou
Google Drive, semanalmente. Veja `backup_restore.ps1` com flag
`-Action Backup -Auto`.
