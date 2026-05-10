# Quickstart — Validação manual de Criação e Gerenciamento (006)

Pré-requisitos:
- 001..005 mergeadas.
- `JIRA_TOKEN`, `JIRA_BASE_URL` setados.
- 1+ projeto Jira onde você pode criar issues, criar links e listar usuários.

---

## V1 — `jira new` happy path (História 1)

```powershell
jira new --project ABC --summary "Bug no login"
# Esperado em stderr:
#   Issue criada: ABC-456
#   https://jira.example.com/browse/ABC-456
# stdout: ABC-456
# exit 0
```

Com `--type Bug`:
```powershell
jira new --project ABC --summary "Bug crítico" --type Bug
# Esperado: idem com type Bug
```

Com flags opcionais:
```powershell
jira new --project ABC --summary "X" --desc "ver INC-1234" --priority High --assignee joao
```

`--json`:
```powershell
jira new --project ABC --summary "X" --json
# stdout: {"ok":true,"key":"ABC-457","action":"new","url":"..."}
```

`--quiet`:
```powershell
jira new --project ABC --summary "X" --quiet
# stdout: ABC-458 (sem URL, sem mensagem)
```

## V2 — `jira new` summary ausente

```powershell
jira new --project ABC
# Esperado: erro citty + exit 2
```

## V3 — `jira sub` happy path (História 2)

```powershell
jira sub --parent ABC-123 --summary "Implementar handler"
# Esperado em stderr:
#   Subtask criada: ABC-501 (parent ABC-123)
#   https://jira.example.com/browse/ABC-501
# stdout: ABC-501
```

Com `--type Subtarefa` (PT-BR):
```powershell
jira sub --parent ABC-123 --summary "Testes E2E" --type Subtarefa
```

`--quiet`:
```powershell
jira sub --parent ABC-123 --summary "X" --quiet
# stdout: ABC-502
```

## V4 — `jira sub` parent inexistente

```powershell
jira sub --parent FAKE-999 --summary "x"
# Esperado: "Issue FAKE-999 não encontrada." + exit 4
```

## V5 — `jira subs` (História 3)

```powershell
jira subs ABC-123
# Esperado: tabela KEY/STATUS/TIPO/RESUMO
```

Sem subtasks:
```powershell
jira subs ABC-1
# Esperado: "ABC-1 não tem subtasks."
```

`--json`: array.

## V6 — `jira link` happy path (História 4)

```powershell
jira link --from ABC-1 --type Blocks --to ABC-2
# stderr: "Link criado: ABC-1 -[Blocks]-> ABC-2.", exit 0
```

`--json`:
```powershell
jira link --from ABC-1 --type Relates --to ABC-3 --json
# stdout: {"ok":true,"action":"link","from":"ABC-1","to":"ABC-3","type":"Relates"}
```

Tipo inválido:
```powershell
jira link --from ABC-1 --type Lixo --to ABC-2
# Esperado: erro do servidor + exit 1; mensagem sugere consultar /rest/api/2/issueLinkType
```

## V7 — `jira links` (História 5)

```powershell
jira links ABC-1
# Esperado: tabela DIREÇÃO/TIPO/ISSUE/STATUS/RESUMO
```

Sem links:
```powershell
jira links ABC-99
# Esperado: "ABC-99 não tem links."
```

`--json`: array com `direction: '->'` ou `'<-'`.

## V8 — `jira projects` (História 6)

Sem `--all`:
```powershell
jira projects
# Esperado: tabela KEY/ID/NOME/ISSUES — apenas projetos onde você é assignee/reporter
```

Com `--all`:
```powershell
jira projects --all
# Esperado: tabela KEY/ID/NOME — todos os projetos visíveis, ordenados por KEY
```

`--json`:
```powershell
jira projects --all --json
# Array de objetos
```

Truncamento (>500 issues):
```powershell
# Esperado: aviso em stderr "Mostrando projetos baseados em até 500 issues — ..."
```

## V9 — `jira users` (História 7)

Com `--filter` (1 chamada, rápida):
```powershell
jira users MTET --filter silva
# Esperado: tabela USERNAME/NOME/EMAIL/ATIVO + rodapé "<N> usuários encontrados."
# Tempo: <3s
```

Sem `--filter` (varredura a-z, 26 chamadas paralelas):
```powershell
jira users MTET
# Esperado: lista completa, todos os usuários atribuíveis
# Tempo: <5s típico
```

Vazio:
```powershell
jira users PROJETO_VAZIO
# Esperado: "Nenhum usuário encontrado em PROJETO_VAZIO."
```

`--json`: array.

## V10 — Pipeline `new --quiet | assign` (CS-004)

```powershell
jira new --project ABC --summary "X" --quiet | jira assign --quiet
# Esperado: cria issue, atribui para você, emite Key final
```

```powershell
jira new --project ABC --summary "X" --quiet | jira start
# Esperado: cria + inicia (transição via 003)
```

## V11 — Key inválida local

```powershell
jira sub --parent lixo --summary "x"
# Esperado: "Formato de Key inválido: 'lixo'.", exit 2 sem chamar API
```

```powershell
jira link --from 123 --type Blocks --to ABC-2
# Esperado: idem
```

## V12 — `--no-color` global

```powershell
jira projects --no-color
# Esperado: saída sem ANSI
```

## V13 — Tests automatizados

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
# Esperado: tudo verde — última feature do MVP
```

```powershell
npx vitest run --coverage
# Esperado: > 80% nos novos módulos
```

---

## Critério final do MVP

V1..V13 passam. CI verde no PR. Após aprovação, MVP do `jira-command` está completo: 31 comandos cobrindo todo o `jira.ps1`.
