# Phase 0 — Pesquisa: Atribuição e Edição (004)

Stack já fixada (001..003). Sem `NEEDS CLARIFICATION`. Pesquisa cobre apenas decisões específicas desta feature.

---

## D-001 — Endpoints REST

| Operação | Endpoint | Body |
|----------|----------|------|
| Atribuir | `PUT /rest/api/2/issue/{key}/assignee` | `{ "name": "<username>" }` |
| Desatribuir | `PUT /rest/api/2/issue/{key}/assignee` | `{ "name": null }` |
| Alterar prioridade | `PUT /rest/api/2/issue/{key}` | `{ "fields": { "priority": { "name": "<X>" } } }` |
| Alterar summary | `PUT /rest/api/2/issue/{key}` | `{ "fields": { "summary": "<X>" } }` |
| Adicionar label | `PUT /rest/api/2/issue/{key}` | `{ "update": { "labels": [{ "add": "<L>" }] } }` |
| Remover label | `PUT /rest/api/2/issue/{key}` | `{ "update": { "labels": [{ "remove": "<L>" }] } }` |
| Ler descrição | `GET /rest/api/2/issue/{key}?fields=description` | — |
| Editar descrição | `PUT /rest/api/2/issue/{key}` | `{ "fields": { "description": "<X>" } }` |

Todos retornam **204 No Content** em sucesso. 4xx parseados via `parseJiraErrorBody` da 001.

## D-002 — `assign --user me` resolução

- **Decision**: quando `--user` ausente OU `--user me`, fazer `GET /rest/api/2/myself` para descobrir `name`. Cachear em memória do processo (`let cachedMe: string | null = null`).
- **Rationale**: `me` literal não é entendido pelo endpoint `/assignee`. Spec H1 critério 2 / Premise alinha — comportamento idêntico ao script PowerShell.
- **Alternativas**:
  - Endpoint `currentUser()`: não existe diretamente para PUT, só em JQL.
  - Cache em arquivo: overhead, persistência indesejada.

## D-003 — `prio` aceita string livre

- **Decision**: passar `name` direto sem validação local. Erro vem do servidor se inválido (parseado via RF-013 da 001).
- **Rationale**: prioridades dependem da configuração do Jira (premise do spec). Enumerar localmente arrisca lista desatualizada.

## D-004 — `label` / `label-del` usam `update.labels[].add|remove`

- **Decision**: usar operação `update` em vez de `fields` para preservar labels existentes (CS-002).
- **Rationale**: `fields.labels = ["x"]` SOBRESCREVERIA. `update.labels = [{ add: "x" }]` é incremental.
- **API check**: 204 retornado mesmo se label já existir (idempotente em add) ou não existir (idempotente em remove). Spec aceita esse comportamento.

## D-005 — `desc` fluxo completo

1. **TTY check**: se `!process.stdout.isTTY` → `JiraError` exitCode 2 com mensagem RF-010.
2. **GET descrição atual** via `GET /rest/api/2/issue/<KEY>?fields=description` (1 chamada).
3. **Tmp file**: `path.join(os.tmpdir(), `jira-${key}-${Date.now()}.md`)`. Conteúdo inicial = descrição atual ou `''`.
4. **`registerTmpFile(path)`** da 001 (signal handler limpa em SIGINT).
5. **Spawn editor**: `$EDITOR` || `$VISUAL` || (Windows: `notepad.exe`, Linux/macOS: `nano` → `vi` fallback).
6. **Aguardar exit**: `child.on('close', resolve)`. Code != 0 → `JiraError` exitCode 1 RF-009; tmp removido sem PUT.
7. **Read conteúdo**: `fs.readFileSync(path, 'utf8')`.
8. **Trim**: `.replace(/[\r\n]+$/, '')` (apenas trailing newlines/CRLFs — RF-007 d).
9. **Comparar**: se igual à descrição original (após mesmo trim), exibe `Sem alterações em <KEY>.` e retorna. Sem PUT (CS-003).
10. **PUT descrição** via `updateField(config, key, 'description', newContent)`.
11. **`unregisterTmpFile(path)` + `fs.rmSync(path, { force: true })`** em `finally`.

## D-006 — Editor cross-platform

- **Decision**: `commandFor(platform, env)` exportado puramente; `openEditor(text): Promise<string>` faz spawn com `stdio: 'inherit'` (editor herda terminal). Aguarda `close`. Lê arquivo.
- **Order de resolução**:
  1. `process.env.EDITOR`
  2. `process.env.VISUAL`
  3. Win32 → `notepad.exe`
  4. Outros → `nano` (fallback para `vi` se ENOENT)
- **stdio: 'inherit'**: necessário para editores TUI (vim, nano) interagirem com o terminal do user.
- **Encoding**: UTF-8 sem BOM (Node `fs.writeFileSync(path, text, 'utf8')` é default UTF-8 sem BOM).
- **Extensão**: `.md` no nome do tmp file (sintaxe highlight em editores que detectam por extensão).

## D-007 — `assign --quiet`

- **Decision**: aceita flag local `--quiet` que faz comando emitir só a Key no stdout (chamando `quietOut` da 001). Mensagem normal (`<KEY> atribuído a <username>`) vai para stderr (assim mesmo em modo padrão).
- **Rationale**: alinhamento com 001 RF-010 e CS-004 do spec 004 (`jira pick | jira assign --quiet | jira start`).

## D-008 — Saída JSON envelope

| Comando | `--json` |
|---------|----------|
| `assign` | `{ ok, key, action: 'assign', user }` |
| `unassign` | `{ ok, key, action: 'unassign' }` |
| `prio` | `{ ok, key, action: 'prio', priority }` |
| `summary` | `{ ok, key, action: 'summary', summary }` |
| `label` | `{ ok, key, action: 'label', added }` |
| `label-del` | `{ ok, key, action: 'label-del', removed }` |
| `desc` (com mudança) | `{ ok, key, action: 'desc', updated: true }` |
| `desc` (sem mudança) | `{ ok, key, action: 'desc', updated: false }` |

Falhas: `{ ok: false, error, exitCode }` (RF-019 da 001).

## D-009 — Pipe-ready

- **Decision**: `assign`, `unassign`, `prio`, `summary`, `label`, `label-del`, `desc` aceitam `<KEY>` posicional opcional + stdin via `resolveKeys` (001).
- **Edge `desc` em pipe**: TTY check (D-005) recusa antes de tentar abrir editor. Exit code 2 com mensagem RF-010.
- **Edge `prio`/`summary`/`label*` em pipe**: arg obrigatório (`PRIORIDADE`/`TITULO`/`LABEL`) NÃO vem do stdin — só Key. Aplicável para múltiplas Keys com mesmo valor (`echo ABC-1 ABC-2 | jira prio High`).

## D-010 — Encoding tmp file (Windows)

- **Decision**: usar `fs.writeFileSync(path, text, 'utf8')` (default Node — sem BOM). Usar `fs.readFileSync(path, 'utf8')` na leitura.
- **Rationale**: RF-007 b. Notepad.exe moderno (Win10+) lida com UTF-8 sem BOM. Editores TUI (vim/nano) também.
- **Alternativas**:
  - BOM: invalida descrição quando enviada para o Jira (caracter inicial estranho).

## D-011 — Validação de Key local

Reutiliza `validateKey` (002) em todos comandos. Falha → exitCode 2 antes de qualquer fetch.

## D-012 — `assign` sem `--user` quando JIRA_TOKEN aponta para usuário diferente

Cenário: `me` resolve para o usuário do token. Comportamento alinhado com `currentUser()` do JQL.

## D-013 — Cleanup de tmp file em SIGINT

- **Decision**: `desc` chama `registerTmpFile(path)` da 001 logo após criar; `unregisterTmpFile(path) + fs.rmSync(path, { force: true })` em `finally`. Se user pressionar Ctrl+C durante edição, signal handler da 001 (handleSigint) já remove o arquivo.

---

## Saída

Sem clarificações pendentes. Phase 0 OK.
