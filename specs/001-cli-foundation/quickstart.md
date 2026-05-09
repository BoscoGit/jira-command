# Quickstart — Validação manual da Fundação (001)

Passos para validar a feature 001 ponta-a-ponta após implementação. Executar em ordem; cada passo é independentemente verificável.

Pré-requisitos:
- Node 22 LTS instalado.
- Repositório clonado.
- Acesso a uma instância Jira Server v2 com Personal Access Token válido.

---

## Setup inicial

```powershell
cd D:\Sistemas\boscogit\jira-command
npm install
npm run build
npm link        # registra `jira` global
```

Verificar:
```powershell
where.exe jira  # Windows
which jira      # Linux/macOS
```
Deve apontar pra shim do npm prefix global.

---

## V1 — `--version` e `--help` sem token (RF-020, RF-021)

Sem definir `JIRA_TOKEN` nem `JIRA_BASE_URL`:

```powershell
jira --version
# Esperado: <versão do package.json>, exit 0

jira -V
# Esperado: idem

jira --help
# Esperado: lista de comandos com descrições, exit 0

jira             # sem args
# Esperado: igual a --help, exit 0

jira me --help
# Esperado: ajuda do subcomando me com exemplo, exit 0
```

✅ Aprovado se: nenhum erro de variável de ambiente em qualquer um.

---

## V2 — Variáveis de ambiente ausentes (RF-001, RF-002)

```powershell
$env:JIRA_TOKEN = $null
$env:JIRA_BASE_URL = $null
jira me
# Esperado: "Variável de ambiente JIRA_TOKEN é obrigatória", exit 2
```

```powershell
$env:JIRA_TOKEN = "<token>"
$env:JIRA_BASE_URL = $null
jira me
# Esperado: "Variável de ambiente JIRA_BASE_URL é obrigatória", exit 2
```

✅ Aprovado se: mensagens exatas + exit 2.

---

## V3 — Comando desconhecido (H3 critério 3)

```powershell
$env:JIRA_TOKEN = "<token>"
$env:JIRA_BASE_URL = "https://jira.example.com"
jira foo
# Esperado: "Comando desconhecido 'foo'. Execute 'jira --help' ...", exit 2
```

---

## V4 — `jira me` happy path (História 1)

```powershell
$env:JIRA_TOKEN = "<token válido>"
$env:JIRA_BASE_URL = "https://jira.example.com"
jira me
# Esperado:
# Logado como: <displayName> <<email>>
# Username  : <name>
# Key       : <key>
# exit 0
```

✅ Aprovado se: linha "Logado como" cita display name e email reais.

---

## V5 — Token inválido (H1 critério 4)

```powershell
$env:JIRA_TOKEN = "lixo123"
jira me
# Esperado: "Falha na autenticação — verifique seu JIRA_TOKEN", exit 3
```

---

## V6 — `--json` em comando de listagem (RF-009)

```powershell
jira me --json
# Esperado em stdout (única linha JSON):
# {"name":"...","displayName":"...","emailAddress":"...","key":"..."}
# exit 0
```

Validar também:
```powershell
jira me --json | ConvertFrom-Json
# Esperado: objeto sem erros de parse
```

---

## V7 — SSL auto-assinado (História 2)

Em ambiente com cert auto-assinado:

```powershell
$env:JIRA_INSECURE = "true"
jira me
# Esperado: sucesso

$env:JIRA_INSECURE = "1"        # valor não permitido
jira me
# Esperado: "Falha na verificação SSL — defina JIRA_INSECURE=true para certificados auto-assinados", exit 1

$env:JIRA_INSECURE = "TRUE"     # case-insensitive permitido
jira me
# Esperado: sucesso
```

---

## V8 — Pipeline stdin (História 5)

Embora `jira me` não use Key, validar com fixture:

```powershell
"" | jira me
# Esperado: ignora stdin vazio (me não usa Key), sucesso

# Após implementação de `jira get` (spec 002), validar:
echo "ABC-123" | jira get
# Esperado: detalhes da issue
```

(Validação completa de stdin em testes automatizados de `stdin.test.ts`.)

---

## V9 — `NO_COLOR` (RF-025)

```powershell
$env:NO_COLOR = "1"
jira me
# Esperado: saída sem códigos ANSI

$env:NO_COLOR = $null
jira me --no-color
# Esperado: idem
```

Conferir output bruto:
```powershell
jira me --no-color | Select-String "`e\["
# Esperado: nada (sem escape sequences)
```

---

## V10 — SIGINT (RF-026)

Enquanto `jira me` está executando (com latência de rede), pressionar Ctrl+C:

```powershell
jira me
# Pressionar Ctrl+C imediatamente
# Esperado: exit 130, sem stack trace
```

```powershell
echo $LASTEXITCODE
# Esperado: 130
```

---

## V11 — User-Agent (RF-023)

Usar proxy HTTP de inspeção (mitmproxy, Fiddler) ou logs do servidor Jira:

```
User-Agent: jira-cli/0.1.0 (Node/v22.x.x)
```

✅ Aprovado se: header observado no servidor.

---

## V12 — Timeout (RF-007 + Edge case timeout)

```powershell
$env:JIRA_BASE_URL = "https://10.255.255.1"  # IP roteado mas não-respondente
$env:JIRA_TIMEOUT = "3"
jira me
# Esperado em ~3s: "Falha de rede: timeout após 3s. Verifique JIRA_BASE_URL e conectividade.", exit 6
```

---

## V13 — Tests automatizados (CS-002 verificação)

```powershell
npm run test
# Esperado: todos os testes vitest passam
# Cobertura mínima esperada: config.ts, http.ts, errors.ts, output.ts, stdin.ts, version.ts, commands/me.ts
```

```powershell
npm run lint
# Esperado: biome check sem erros
```

```powershell
npm run typecheck
# Esperado: tsc --noEmit limpo
```

---

## Critério final de aprovação

Todos os 13 passos retornam o resultado esperado. CI verde no GitHub Actions. `npm link` permite usar `jira me` em qualquer pasta do shell.

Após aprovação, prosseguir para `/speckit-plan 002-issue-browsing`.
