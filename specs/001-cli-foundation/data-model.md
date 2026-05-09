# Phase 1 — Data Model: Fundação do CLI (001)

CLI stateless. "Modelo de dados" aqui = entidades de configuração (env vars), entidades de erro/resultado e payloads externos (Jira API). Sem persistência local.

---

## E1. Configuração (`Config`)

Estado imutável carregado uma vez no início do processo (em `config.ts`).

| Campo | Tipo | Origem | Validação | Default |
|-------|------|--------|-----------|---------|
| `token` | `string` (não-vazio) | env `JIRA_TOKEN` | obrigatório se comando precisar de API; ausência → erro RF-002, exit 2 (modo --help/--version: skip) | — |
| `baseUrl` | `URL` | env `JIRA_BASE_URL` | obrigatório como acima; normalização: remover barras finais (RF-004); deve parsear como URL válida | — |
| `insecure` | `boolean` | env `JIRA_INSECURE` | apenas valor `'true'` (case-insensitive) ativa (RF-003) | `false` |
| `timeoutMs` | `number` | env `JIRA_TIMEOUT` | inteiro positivo em segundos × 1000; valor inválido → exit 2 com mensagem | `30000` |
| `patternStart` | `RegExp` | env `JIRA_PATTERN_START` (spec 003) | regex case-insensitive válida; inválida → exit 2 | `/Progress|Iniciar|Start|Em andamento|Andamento/i` |
| `patternDone` | `RegExp` | env `JIRA_PATTERN_DONE` (spec 003) | idem | `/Done|Concluído|Concluido|Resolved|Resolvido|Finalizar|Fechar|Close/i` |
| `patternStop` | `RegExp` | env `JIRA_PATTERN_STOP` (spec 003) | idem | `/To Do|Reopen|Reabrir|Aberto|Pendente|Backlog/i` |
| `noColor` | `boolean` | env `NO_COLOR` (qualquer valor não-vazio) **OR** flag `--no-color` **OR** stdout não-TTY | RF-025 | `false` |

**Estado**: `Config` é congelado (`Object.freeze`) após carga. Mutação proibida.
**Lifecycle**: criado uma vez no `cli.ts` antes de despachar comando. `--help` e `--version` ignoram a fase de carga (RF-021).

---

## E2. Erro de domínio (`JiraError`)

Classe `extends Error` com metadados estruturados.

```ts
class JiraError extends Error {
  readonly exitCode: number;       // 1..6 conforme RF-008
  readonly action?: string;        // verbo do comando (para RF-019, --json action envelope)
  readonly httpStatus?: number;    // status HTTP quando origem é resposta Jira
  readonly statusText?: string;    // statusText HTTP correspondente
  readonly cause?: unknown;        // erro original (Error, Response, etc.)
}
```

**Mapeamento HTTP → exitCode** (RF-008):

| Status | exitCode | Mensagem |
|--------|----------|----------|
| 401 | 3 | `Falha na autenticação — verifique seu JIRA_TOKEN` |
| 403 | 5 | `Sem permissão: <mensagem do Jira>` |
| 404 | 4 | `Recurso não encontrado: <detalhes do Jira>` |
| qualquer outro 4xx/5xx | 1 | `<parse via RF-013>` |
| TLS error (auto-signed cert sem `JIRA_INSECURE`) | 1 | `Falha na verificação SSL — defina JIRA_INSECURE=true para certificados auto-assinados` |
| timeout / ECONNREFUSED / ENOTFOUND | 6 | `Falha de rede: <causa>. Verifique JIRA_BASE_URL e conectividade.` |
| argumento/uso inválido | 2 | mensagem específica do comando + `Execute 'jira <cmd> --help' para ver as opções.` |

**Catch global** em `cli.ts`: imprime mensagem em stderr (com cores se permitidas), em `--json` mode imprime envelope `{"ok":false,"error":"...","exitCode":N}` em stdout (RF-019), e chama `process.exit(err.exitCode)`.

---

## E3. Envelope de resultado JSON (`ResultEnvelope`)

Saída padrão do `--json` em comandos de ação (RF-019).

**Sucesso**:
```json
{ "ok": true, "key": "ABC-123", "action": "move", "transitionId": "21" }
```

**Falha**:
```json
{ "ok": false, "error": "Falha na autenticação — verifique seu JIRA_TOKEN", "exitCode": 3 }
```

Para comandos de **listagem** com `--json`, a saída é o array de objetos (sem envelope `ok`). Para **criação** (`new`/`sub`), saída é o objeto da issue criada (`{ "key": "...", "url": "..." }` etc.).

Decisão sobre listagem vs ação: comandos cujo nome verbal indica mutação (`move`, `start`, `done`, `stop`, `assign`, `unassign`, `comment`, `comment-del`, `log`, `prio`, `summary`, `label`, `label-del`, `desc`, `link`, `transition`) usam envelope. Comandos de leitura (`me`, `mine`, `get`, `find`, `status`, `trans`, `comments`, `logs`, `subs`, `links`, `projects`, `users`) usam payload direto.

---

## E4. Identidade do usuário (`Myself`) — payload da 001

Resposta de `GET /rest/api/2/myself`. Apenas campos consumidos:

| Campo | Tipo | Uso |
|-------|------|-----|
| `name` | `string` | username Jira |
| `displayName` | `string` | nome de exibição |
| `emailAddress` | `string` | email |
| `key` | `string` | identificador Jira |

**Saída humana** (`jira me`):
```
Logado como: <displayName> <<emailAddress>>
Username  : <name>
Key       : <key>
```

**Saída --json**:
```json
{ "name": "...", "displayName": "...", "emailAddress": "...", "key": "..." }
```

---

## E5. Stream de Keys do stdin (`KeyStream`)

Estado transitório em pipelines (RF-012).

- Input: `process.stdin` quando `!process.stdin.isTTY` e arg ausente.
- Processamento: ler linhas (split em `\n`/`\r\n`), `trim()`, descartar se vazio.
- Saída: array de Keys (zero ou mais) — itera sequencialmente nos comandos pipe-ready.
- Vazio após filtro: erro de uso (RF-012), exit 2.

Validação de formato local: regex `^[A-Z][A-Z0-9_]+-\d+$` (definida em spec 002 RF-008, herdada aqui pois config-foundation precisa do helper de validação reutilizável).

---

## E6. Logs / cores

Sem entidade persistente. Helpers em `output.ts`:
- `humanWrite(stream, text, color?)` — escreve com cor se permitido.
- `jsonWrite(obj)` — escreve em stdout, mensagem decorativa em stderr.
- `quietWrite(key)` — escreve apenas a Key em stdout, decorativa em stderr.

---

## Resumo

Sem banco, sem cache, sem schema persistente. Toda configuração vem de env. Todo erro carrega seu exit code. Todo output respeita os 3 modos (humano, json, quiet) e separação stdout/stderr.
