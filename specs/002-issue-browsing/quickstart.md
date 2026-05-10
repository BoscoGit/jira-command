# Quickstart — Validação manual da Consulta de Issues (002)

Pré-requisitos:
- Foundation 001 mergeada (`jira me` funciona).
- `JIRA_TOKEN` e `JIRA_BASE_URL` setados.
- Acesso a um projeto Jira com pelo menos 2 issues atribuídas a você.
- `fzf` instalado e no PATH (apenas para V11).

---

## V1 — `jira mine` (História 1)

```powershell
jira mine
# Esperado: tabela com Key, Prioridade, Status, Resumo das suas issues abertas
# ordenada por Prioridade DESC e Atualização DESC, máximo 50.
```

Com mais de 50 issues:
```powershell
# stderr deve incluir: "Mostrando 50 de <total> issues."
```

Sem issues:
```powershell
# Output: "Nenhuma issue encontrada."
```

`--json`:
```powershell
jira mine --json | ConvertFrom-Json
# Esperado: array de objetos { key, summary, status, priority, assignee?, updated }
```

---

## V2 — `jira get <KEY>` happy path (História 2)

```powershell
jira get ABC-123
# Esperado: bloco multi-linha com === ABC-123 ===, Summary, Status,
# Priority, Assignee, Reporter, Description, e até 10 comentários
# (mais recentes primeiro).
```

`--json`:
```powershell
jira get ABC-123 --json
# Esperado: objeto único { key, summary, ..., comments: [...] }
```

---

## V3 — `jira get` issue inexistente

```powershell
jira get FAKE-9999
# Esperado: stderr "Issue FAKE-9999 não encontrada.", exit 4
```

```powershell
echo $LASTEXITCODE  # PowerShell → 4
```

---

## V4 — `jira get` Key inválida (RF-008)

```powershell
jira get 123-abc
# Esperado: stderr "Formato de Key inválido: '123-abc'. Esperado padrão tipo ABC-123.", exit 2
```

---

## V5 — `jira get` via pipeline (RF-012 da 001)

```powershell
"ABC-123" | jira get
# Esperado: idem V2
```

```powershell
"ABC-1`nABC-2" | jira get
# Esperado: detalhes de ABC-1 seguidos de ABC-2 (sequencial)
```

```powershell
"" | jira get
# Esperado: "Nenhuma Key recebida via stdin nem como argumento.", exit 2
```

---

## V6 — `jira find` (História 3)

```powershell
jira find "project = ABC AND status = Open"
# Esperado: tabela com Key, Prioridade, Status, Responsável, Resumo, máx 50
```

`--limit`:
```powershell
jira find "project = ABC" --limit 10
# Esperado: máximo 10 issues
```

JQL inválido:
```powershell
jira find "isso nao eh JQL"
# Esperado: stderr com mensagem do Jira (parser RF-013), exit 1
```

JQL sem resultados:
```powershell
jira find "summary ~ 'string-impossivel-xyz123'"
# Esperado: "Nenhuma issue encontrada para o JQL informado."
```

---

## V7 — `jira status "<STATUS>"` (História 4)

```powershell
jira status "In Progress"
# Esperado: minhas issues em "In Progress", ordenadas por updated DESC
```

Status sem matches:
```powershell
jira status "Closed"
# Esperado: "Nenhuma issue com status \"Closed\" encontrada."
```

Status com espaço (aspas necessárias):
```powershell
jira status "Code Review"
# Esperado: funciona (aspas no JQL gerado)
```

---

## V8 — `jira open <KEY>` (História 5)

```powershell
jira open ABC-123
# Esperado:
#   stderr: "Abrindo ABC-123 no navegador..."
#   browser: abre <JIRA_BASE_URL>/browse/ABC-123
#   exit 0
```

`--json`:
```powershell
jira open ABC-123 --json
# Esperado em stdout: {"ok":true,"key":"ABC-123","action":"open"}
```

Pipe:
```powershell
"ABC-123" | jira open
# Esperado: idem
```

Multi:
```powershell
"ABC-1`nABC-2" | jira open
# Esperado: abre as duas em abas/janelas separadas, sequencialmente
```

---

## V9 — `jira pick` (História 6)

Com `fzf` instalado:
```powershell
jira pick
# Esperado: TUI fzf abre, lista issues abertas (Key Status Resumo)
# Selecionar com Enter → stdout: "<KEY>"
# ESC → exit 1, stdout vazio
```

Sem `fzf`:
```powershell
# remover fzf do PATH ou usar terminal sem fzf
jira pick
# Esperado: "fzf não encontrado. Instale em: https://github.com/junegunn/fzf"
# exit 1
```

`--jql`:
```powershell
jira pick --jql "project = ABC AND status = Open"
# Esperado: TUI carrega issues do JQL informado
```

Pipeline ergonômico:
```powershell
jira pick | jira get
# Esperado: pick → seleção → get carrega detalhes
```

---

## V10 — `--quiet` em comandos de listagem

`--quiet` é flag local de `new`/`sub`/`assign` (spec 006/004). Comandos de 002 NÃO suportam `--quiet` — passar a flag é tolerado mas inerte (citty pode reportar arg desconhecido se não declarado; comportamento aceitável).

---

## V11 — `--no-color` em qualquer comando (RF-025 da 001)

```powershell
jira mine --no-color
# Esperado: tabela sem ANSI escape sequences
```

---

## V12 — Pipeline complexo

```powershell
jira pick | jira get | tee output.txt
# Esperado: pick → get; output redirecionado a arquivo
```

```powershell
jira mine --json | ConvertFrom-Json | Where-Object status -eq "In Progress" | ForEach-Object key
# Esperado: lista de Keys em status In Progress
```

---

## V13 — Tests automatizados

```powershell
npm run test
# Esperado: todos os testes vitest verdes (foundation + 002).
```

```powershell
npm run lint
npm run typecheck
# Esperado: limpos.
```

```powershell
npx vitest run --coverage
# Esperado: cobertura > 80% nos novos módulos (format/, jira/, platform/, commands/).
```

---

## Critério final de aprovação

Todos os passos V1..V13 retornam o resultado esperado. CI verde no PR. Após aprovação, prosseguir para `/speckit-plan 003-workflow-transitions`.
