# Quickstart — Validação manual de Comentários e Worklog (005)

Pré-requisitos:
- 001..004 mergeadas.
- `JIRA_TOKEN`, `JIRA_BASE_URL` setados.
- 1+ issue Jira onde você tem permissão de comentar e logar tempo.

---

## V1 — `jira comment <KEY> "<TEXTO>"` happy path (História 1)

```powershell
jira comment ABC-123 "PR enviado para revisão"
# stderr: "Comentário adicionado em ABC-123 (#<id>).", exit 0
```

`--json`:
```powershell
jira comment ABC-123 "..." --json
# stdout: {"ok":true,"key":"ABC-123","action":"comment","commentId":"..."}
```

## V2 — `jira comment` texto vazio

```powershell
jira comment ABC-123 ""
# stderr: "O texto do comentário não pode ser vazio.", exit 2
```

## V3 — `jira comments <KEY>` (História 2)

```powershell
jira comments ABC-123
# Esperado: tabela ID/AUTOR/DATA/COMENTÁRIO (preview 80, mais recentes primeiro)
```

Vazio:
```powershell
jira comments XYZ-1
# Esperado: "Nenhum comentário em XYZ-1." (caso XYZ-1 não tenha comentários)
```

`--json`:
```powershell
jira comments ABC-123 --json
# Array de objetos
```

## V4 — `jira comment-del` interativo (História 3)

```powershell
jira comments ABC-123    # pegar o ID
jira comment-del ABC-123 12345
# Prompt: "Deletar comentário 12345 de ABC-123? (s/n):"
# Digite "s" + Enter
# Esperado: "Comentário 12345 deletado.", exit 0
```

Cancelar:
```powershell
jira comment-del ABC-123 12345
# Prompt aparece, digitar "n"
# Esperado: "Operação cancelada.", exit 0
```

## V5 — `jira comment-del --yes`

```powershell
jira comment-del ABC-123 12345 --yes
# Sem prompt, deleta direto, exit 0
```

## V6 — `jira comment-del` em pipe sem `--yes` (RF-003)

```powershell
echo ABC-123 | jira comment-del 12345
# Esperado: "Operação cancelada (modo não-interativo). Use --yes para confirmar.", exit 2
```

## V7 — `jira log <KEY> <TEMPO>` happy path (História 4)

```powershell
jira log ABC-123 "1h 30m"
# stderr: "Worklog 1h 30m registrado em ABC-123.", exit 0
```

Com descrição:
```powershell
jira log ABC-123 "45m" "investigação do bug"
# Esperado: idem + descrição salva
```

`--json`:
```powershell
jira log ABC-123 "30m" --json
# stdout: {"ok":true,"key":"ABC-123","action":"log","time":"30m","worklogId":"..."}
```

## V8 — `jira log` formato inválido

```powershell
jira log ABC-123 "1h30m"   # sem espaço
# Esperado: erro do servidor + exit 1
```

## V9 — `jira logs <KEY>` (História 5)

```powershell
jira logs ABC-123
# Esperado: tabela ID/AUTOR/DATA/TEMPO/COMENTÁRIO (preview 60)
```

Vazio:
```powershell
jira logs XYZ-1
# Esperado: "Nenhum apontamento em XYZ-1."
```

`--json`: array.

## V10 — Pipe `jira pick | jira log` (CS-004)

```powershell
jira pick | jira log "1h"
# Esperado: pick → seleção → log aplica em ambas (KEY do stdin, TEMPO arg fixo)
```

## V11 — Múltiplas Keys via stdin

```powershell
"ABC-1`nABC-2" | jira comment "atualização"
# Esperado: comentário adicionado em ambas
```

## V12 — Key inválida local

```powershell
jira log lixo "1h"
# Esperado: "Formato de Key inválido: 'lixo'.", exit 2 (sem chamar API)
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

V1..V13 passam. CI verde no PR. Após aprovação, `/speckit-plan 006-create-manage`.
