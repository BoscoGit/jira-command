# Quickstart — Validação manual de Transições (003)

Pré-requisitos:
- Foundation 001 + Feature 002 mergeadas em master.
- `JIRA_TOKEN`, `JIRA_BASE_URL` setados.
- Pelo menos 1 issue Jira com transições disponíveis no estado atual.

---

## V1 — `jira trans <KEY>` (História 4)

```powershell
jira trans ABC-123
# Esperado: tabela com colunas ID, NOME, PARA
```

`--json`:
```powershell
jira trans ABC-123 --json
# Esperado: array [{ id, name, to }]
```

Issue sem transições disponíveis:
```powershell
# Esperado: "Nenhuma transição disponível para <KEY> no estado atual."
```

## V2 — `jira start <KEY>` happy path (História 1)

```powershell
jira start ABC-123
# Esperado em stderr: "ABC-123 movida para 'In Progress'." (ou nome real)
# exit 0
```

`--json`:
```powershell
jira start ABC-123 --json
# stdout: {"ok":true,"key":"ABC-123","action":"start","transitionId":"21","to":"In Progress"}
```

## V3 — `jira start` em workflow sem match (História 1 critério 2)

Issue em projeto cujo workflow não tem nome casando o padrão:
```powershell
jira start XYZ-1
# Esperado:
#   stderr: "Transição 'Em Andamento' não disponível em XYZ-1. Transições disponíveis:"
#   stderr: "  21 - Custom Workflow Step -> Doing"
#   stderr: "  ..."
#   exit 1
```

Override via env:
```powershell
$env:JIRA_PATTERN_START = "Custom"
jira start XYZ-1
# Esperado: agora casa "Custom Workflow Step" e aplica
```

## V4 — `jira done <KEY>` (História 2)

```powershell
jira done ABC-123
# Esperado: "ABC-123 movida para 'Done'." (ou nome real), exit 0
```

## V5 — `jira stop <KEY>` (História 3)

```powershell
jira stop ABC-123
# Esperado: "ABC-123 movida para 'To Do'." (ou nome real), exit 0
```

## V6 — Match ambíguo (RF-007)

Issue com 2+ transições casando o padrão (ex: workflow com "Start Progress" E "Resume Progress"):
```powershell
jira start ABC-123
# Esperado:
#   stderr: "Várias transições correspondem ao padrão em ABC-123: 21 - Start Progress, 31 - Resume Progress. Use 'jira move ABC-123 <ID>' para escolha exata."
#   exit 1
#   NÃO aplica nenhuma transição
```

## V7 — `jira move <KEY> <ID>` happy path (História 5)

```powershell
jira move ABC-123 21
# Esperado: "Transição 21 aplicada em ABC-123. Estado atual: '<TO>'.", exit 0
```

`--json`:
```powershell
jira move ABC-123 21 --json
# stdout: {"ok":true,"key":"ABC-123","action":"move","transitionId":"21","to":"<TO>"}
```

## V8 — `jira move` ID inexistente (História 5 critério 2)

```powershell
jira move ABC-123 9999
# Esperado: "Transição 9999 não encontrada para ABC-123. Execute 'jira trans ABC-123' para ver as disponíveis."
# exit 1
```

## V9 — Pipeline `jira pick | jira start` (CS-003)

```powershell
jira pick | jira start
# Esperado: pick → seleção → start aplica na Key escolhida
```

```powershell
echo "ABC-1" | jira move 21
# Esperado: aplica transição 21 em ABC-1
```

## V10 — 403 sem permissão

Issue cujo workflow exige permissão que o usuário não tem:
```powershell
jira start RESTR-1
# Esperado: "Sem permissão para realizar esta transição em RESTR-1.", exit 5
```

## V11 — Key inválida local

```powershell
jira start lixo
# Esperado: "Formato de Key inválido: 'lixo'. Esperado padrão tipo ABC-123.", exit 2
# Não chama API
```

## V12 — `--no-color` / `NO_COLOR`

```powershell
jira start ABC-1 --no-color
# Esperado: saída sem ANSI
```

## V13 — Tests automatizados

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
# Esperado: tudo verde, novos testes da 003 incluídos
```

```powershell
npx vitest run --coverage
# Esperado: coverage > 80% nos novos módulos (jira/patterns, jira/transitions, commands/start|done|stop|trans|move)
```

---

## Critério final

V1..V13 passam. CI verde no PR. Após aprovação, `/speckit-plan 004-assignment-editing`.
