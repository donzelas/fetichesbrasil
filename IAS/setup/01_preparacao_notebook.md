# Fase 1: Preparacao do notebook i5 8GB

Faca PRIMEIRO no PC onde voce esta construindo (testar), depois
replique no notebook secundario (rodar 24/7).

## Checklist inicial

- [ ] Notebook ligado na tomada
- [ ] Internet conectada (ethernet melhor que WiFi para 24/7)
- [ ] Login com usuario administrador
- [ ] Pelo menos 30 GB livres no disco

## 1.1 Confirmar specs

Abra PowerShell e rode:

```powershell
winver
systeminfo | Select-String "OS Name","OS Version","Total Physical Memory"
Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores
Get-PhysicalDisk | Select MediaType,Size,FriendlyName
Get-PSDrive C | Select Used,Free
```

Anote para referencia:

- Versao Windows: ___________________ (precisa ser 10 build 19041+ ou 11)
- RAM: ___________________
- CPU: ___________________
- Tipo disco: ___________________ (SSD ideal, HD funciona mas lento)
- Espaco livre em C:: ___________________

## 1.2 Confirmar virtualizacao habilitada (obrigatorio pro Docker)

Abra Gerenciador de Tarefas (Ctrl+Shift+Esc) > Desempenho > CPU.
Procure "Virtualizacao: Habilitada".

Se NAO estiver habilitada:
1. Reinicie o notebook
2. Entre na BIOS (geralmente F2, F10 ou DEL no boot)
3. Procure "Intel VT-x", "Virtualization Technology" ou "SVM Mode"
4. Habilite
5. Save & Exit

## 1.3 Desativa hibernacao

PowerShell como administrador:

```powershell
powercfg /hibernate off
```

Libera ~6 GB e evita comportamento estranho com Docker.

## 1.4 Limpeza basica

```powershell
cleanmgr /sagerun:1
```

Marca tudo e roda.

## 1.5 Atualiza Windows

Configuracoes > Windows Update > Verificar atualizacoes.
Aplica todas, reinicia.

## 1.6 Cria usuario dedicado (apenas no notebook secundario)

Pra que o notebook reinicie sozinho apos quedas de luz e
volte ao funcionamento, configure auto-login:

```powershell
netplwiz
```

Desmarca "Os usuarios devem digitar um nome..." > Aplicar
> digita a senha do usuario.

## Proximo passo

Apos terminar esta fase, vai para `02_instalar_softwares.ps1`.
