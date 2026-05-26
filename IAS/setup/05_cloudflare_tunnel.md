# Fase 5: Cloudflare Tunnel (acesso publico sem abrir porta)

Objetivo: acessar n8n, Postiz, etc de qualquer lugar (celular, viagem)
sem expor IP de casa e sem abrir porta no roteador.

Funciona criando um tunel TLS do notebook ate a Cloudflare. Eles
expoem na internet por subdominios SEUS.

## 5.1 Criar conta Cloudflare (gratis, sem cartao obrigatorio)

1. https://dash.cloudflare.com/sign-up
2. Cadastra com email
3. Confirma email no link recebido

## 5.2 Conseguir um dominio

Voce PRECISA de um dominio proprio (subdominio do tipo
.duckdns.org NAO funciona pro Tunnel diretamente).

Opcoes em ordem de custo/conveniencia:

| Opcao | Custo | Onde | Observacao |
|-------|-------|------|------------|
| Comprar .xyz na Cloudflare | ~US$1/ano | Cloudflare Registrar | Pede cartao |
| Comprar .com.br no Registro.br | R$40/ano | registro.br | Pix funciona |
| Conseguir gratis via Freenom | R$0 | freenom.com | .tk .ml .ga, menos confiavel |
| GitHub Student Pack | R$0 se for estudante | education.github.com | .me gratis 1 ano |

Recomendacao: gasta R$40/ano no .com.br do Registro.br.
Vale o investimento porque domino BR e mais confiavel pro publico
e voce paga com Pix sem cartao internacional.

## 5.3 Adicionar dominio na Cloudflare

Se comprou na Cloudflare: ja vem configurado, pule pro 5.4.

Se comprou fora:
1. Cloudflare Dashboard > Websites > Add a site
2. Cola o dominio
3. Escolhe plano Free
4. Cloudflare scaneia DNS atual (pode ser nada)
5. ANOTA os 2 nameservers que aparecerem (algo tipo
   `xxx.ns.cloudflare.com`)
6. Vai no painel onde comprou o dominio
   - Registro.br: Painel > Editar Zona > DNS > Servidores DNS
   - Troca os nameservers pelos da Cloudflare
7. Volta no Cloudflare > Check nameservers
8. Espera propagar (1h-24h, geralmente 30min)

## 5.4 Criar o Tunnel

1. Cloudflare Dashboard > menu esquerdo, scrolla ate em baixo
2. Clica em "Zero Trust" (abre nova area)
3. Networks > Tunnels > Create a tunnel
4. Tipo: Cloudflared
5. Nome do tunnel: `notebook-casa` (ou qualquer nome)
6. Save tunnel

## 5.5 Instalar o conector no notebook

Na tela seguinte aparece o comando de instalacao:

1. Sistema operacional: Windows
2. Arquitetura: 64-bit
3. Copia o comando completo, fica parecido com:
   ```
   cloudflared.exe service install eyJhIjoiMTIzNDU2NzgiLCJ0IjoiZWVlZWU....
   ```
4. Abre PowerShell ADMIN
5. Cola e roda
6. Aguarda mensagem `Service installed`

Verifica que o servico esta rodando:

```powershell
Get-Service cloudflared
```

Status: `Running`, StartType: `Automatic`. OK.

Verifica no painel Cloudflare: o tunnel deve aparecer como `HEALTHY`.

## 5.6 Configurar rotas publicas (Public Hostnames)

No mesmo tunnel, aba "Public Hostnames" > "Add a public hostname".

Adiciona 4 rotas (uma por servico):

| Subdomain | Domain | Service Type | URL |
|-----------|--------|--------------|-----|
| n8n       | seudominio.com.br | HTTP | localhost:5678 |
| postiz    | seudominio.com.br | HTTP | localhost:3000 |
| whisper   | seudominio.com.br | HTTP | localhost:9000 |
| uptime    | seudominio.com.br | HTTP | localhost:3001 |

Save cada uma. Cloudflare cria automaticamente os registros DNS
e o certificado HTTPS.

## 5.7 IMPORTANTE: Proteger com Cloudflare Access

n8n exposto na internet = ataques diarios de bots.
Adiciona uma camada de autenticacao por email:

1. Zero Trust > Access > Applications > Add Application
2. Tipo: Self-hosted
3. Application name: `n8n`
4. Session duration: 24 hours
5. Application domain: `n8n.seudominio.com.br`
6. Next > Add policy
7. Policy name: `Apenas eu`
8. Action: Allow
9. Configure rules > Include > Emails
10. Adiciona seu email
11. Save

Identity providers > Add new > One-time PIN
(Cloudflare manda codigo por email cada login)

REPITA esse processo para `postiz.`, `whisper.` e `uptime.`.

## 5.8 Testar

Abre seu celular (rede 4G, sem WiFi de casa) e acessa:

```
https://n8n.seudominio.com.br
```

Deve pedir email > codigo no email > apos validar mostra login do n8n.

Pronto. Servidor publico, seguro, gratis, sem abrir porta no roteador.

## 5.9 Atualizar .env

Depois de tudo configurado, edita o `.env`:

```
DOMAIN_BASE=seudominio.com.br
N8N_DOMAIN=n8n.seudominio.com.br
POSTIZ_DOMAIN=postiz.seudominio.com.br
WHISPER_DOMAIN=whisper.seudominio.com.br
UPTIME_DOMAIN=uptime.seudominio.com.br
```

E recria os containers pra pegar os novos valores:

```powershell
cd E:\CAUS\FETICHES\IAS\docker
docker compose --env-file ..\.env up -d --force-recreate
```

## Proximo passo

Configure o health check: `06_health_check.ps1`.
