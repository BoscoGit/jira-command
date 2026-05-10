# Quickstart — Validação manual de Atribuição e Edição (004)

Pré-requisitos:
- 001 + 002 + 003 mergeadas.
- `JIRA_TOKEN`, `JIRA_BASE_URL` setados.
- 1+ issue Jira onde você tenha permissão de editar.

---

## V1 — `jira assign <KEY>` happy path (História 1)

```powershell
jira assign ABC-123
# Esperado em stderr: "ABC-123 atribuído a <seu-username>."
# exit 0
```

Com `--user`:
```powershell
jira assign ABC-123 --user joao.silva
# Esperado: "ABC-123 atribuído a joao.silva."
```

`--user me` explícito:
```powershell
jira assign ABC-123 --user me
# Esperado: idêntico a sem --user
```

`--json`:
```powershell
jira assign ABC-123 --json
# stdout: {"ok":true,"key":"ABC-123","action":"assign","user":"<seu-username>"}
```

`--quiet`:
```powershell
jira assign ABC-123 --quiet
# stdout: ABC-123
# stderr: "ABC-123 atribuído a <seu-username>."
```

Username inexistente:
```powershell
jira assign ABC-123 --user nao-existe-xyz
# Esperado: erro do servidor parseado em stderr, exit 1
```

## V2 — `jira unassign <KEY>` (História 2)

```powershell
jira unassign ABC-123
# stderr: "ABC-123 sem responsável.", exit 0
```

Issue já sem responsável: idem (idempotente).

## V3 — `jira prio <KEY> <PRIORIDADE>` (História 3)

```powershell
jira prio ABC-123 High
# stderr: "ABC-123 prioridade definida para High.", exit 0
```

Prioridade inválida:
```powershell
jira prio ABC-123 Lixo
# Esperado: erro do servidor com lista de prioridades aceitas, exit 1
```

## V4 — `jira summary <KEY> "<TITULO>"` (História 4)

```powershell
jira summary ABC-123 "Novo título com espaços"
# stderr: "ABC-123 título atualizado.", exit 0
```

## V5 — `jira label <KEY> <LABEL>` (História 5)

```powershell
jira label ABC-123 backend
# stderr: "Label 'backend' adicionada em ABC-123.", exit 0
```

Verificar labels preservadas no Jira (CS-002): adicionar segunda label e confirmar que primeira ainda está lá.

```powershell
jira label ABC-123 hotfix
# Esperado: backend continua presente, hotfix adicionada
```

## V6 — `jira label-del <KEY> <LABEL>` (História 5)

```powershell
jira label-del ABC-123 backend
# stderr: "Label 'backend' removida de ABC-123.", exit 0
```

Label inexistente: idempotente, sem erro.

## V7 — `jira desc <KEY>` happy path (História 6)

```powershell
$env:EDITOR = "notepad"   # Windows
jira desc ABC-123
# Editor abre com descrição atual; salvar e fechar
# Esperado: "ABC-123 descrição atualizada.", exit 0
```

## V8 — `jira desc` sem alterações (CS-003)

Abrir, fechar sem editar:
```powershell
jira desc ABC-123
# Esperado: "Sem alterações em ABC-123.", exit 0
# Verificar via Jira web: descrição inalterada
```

## V9 — `jira desc` em pipe (RF-010)

```powershell
echo ABC-123 | jira desc
# Esperado: "desc requer terminal interativo.", exit 2
```

## V10 — `jira desc` editor com erro (RF-009)

Configurar editor que sai com erro:
```powershell
$env:EDITOR = "powershell -c exit 1"
jira desc ABC-123
# Esperado: "Editor saiu com erro; descrição não foi alterada.", exit 1
```

## V11 — Pipe `jira pick | jira assign` (CS-004)

```powershell
jira pick | jira assign --quiet
# Esperado: pick → seleção → assign aplica + emite Key
```

```powershell
jira pick | jira assign --quiet | jira start
# Esperado: pipeline completo
```

## V12 — Múltiplas Keys via stdin

```powershell
"ABC-1`nABC-2" | jira label hotfix
# Esperado: label adicionada em ambas
```

## V13 — Tests automatizados

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
# Esperado: tudo verde
```

```powershell
npx vitest run --coverage
# Esperado: > 80% nos novos módulos
```

---

## Critério final

V1..V13 passam. CI verde no PR. Após aprovação, `/speckit-plan 005-comments-worklog`.
