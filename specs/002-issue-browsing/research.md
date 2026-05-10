# Phase 0 — Pesquisa: Consulta de Issues (002)

Stack já fixada na 001 (registrada em `memory/project_jira_command_stack.md`). Esta feature reutiliza tudo. Pesquisa concentra-se em integrações externas novas (`fzf`, browser) e padrões de chamada Jira REST.

Sem `NEEDS CLARIFICATION` pendentes.

---

## D-001 — Cliente REST Jira

- **Decision**: Centralizar chamadas em `src/jira/issues.ts` com funções `searchIssues`, `getIssue`, `getIssueComments`. Reutilizam `jiraFetch` de 001.
- **Rationale**:
  - Comandos não duplicam construção de URL nem `JSON.parse`.
  - Mock dos comandos passa por `vi.spyOn(jiraModule, 'searchIssues')` — não precisa mock de `fetch` em cada teste de comando.
  - Mantém comandos focados em formatação/saída.
- **Alternativas consideradas**:
  - Cada comando chama `jiraFetch` direto: simples mas força mocks de fetch em todos os testes de comandos e duplica strings de URL.
  - Camada de "repositórios" tipados (Repository pattern): overkill para 6 endpoints simples.

## D-002 — Endpoints e fields query parameter

- **Decision**: Sempre passar `fields=` explícito para evitar payload gigante:
  - `searchIssues`: `summary,status,priority,assignee` (e `project` quando `mine`/`pick` precisar).
  - `getIssue`: padrão (sem `fields`) — `jira get` precisa de descrição completa, todos os campos básicos vêm.
  - `getIssueComments`: endpoint dedicado `/rest/api/2/issue/{key}/comment?maxResults=10&orderBy=-created`.
- **Rationale**: PoC PowerShell já usa essa estratégia; payloads ficam pequenos; reduz latência.

## D-003 — `jira get` — número de chamadas HTTP

- **Decision**: 1 ou 2 chamadas. Tentar 1 primeiro com `?expand=` ou campo `comment` no fields. Caso retorne objeto `comment` com lista, usar diretamente; caso o servidor não suporte expand, fazer chamada separada para `/comment`.
- **Rationale**:
  - Spec ajustada CS-002 permite ≤2 chamadas.
  - Em prática, Jira Server retorna `fields.comment.comments[]` quando `fields=*all,comment` ou `fields=comment` é usado. Implementação tentará isto primeiro.
- **Alternativas consideradas**:
  - Fixar 2 chamadas sempre (script PS atual): mais simples mas pior latência.
  - 1 chamada via expand=renderedFields/etc: campos extras desnecessários.

**Implementação concreta**: `getIssue(key)` usa `?fields=*navigable,comment` (ou similar). Se body já trouxer comentários, retorna objeto rico; senão chama `getIssueComments`.

## D-004 — Validação local de Key

- **Decision**: Regex `^[A-Z][A-Z0-9_]+-\d+$` em helper exportado por `src/jira/issues.ts` ou novo `src/jira/key.ts`. Comandos chamam antes de qualquer fetch.
- **Rationale**:
  - RF-008 do spec 002 exige validação local com exit 2.
  - Evita chamada HTTP desnecessária quando user digita errado.
  - Mensagem clara: `Formato de Key inválido: '<entrada>'. Esperado padrão tipo ABC-123.`
- **Alternativas consideradas**:
  - Deixar Jira validar: lento e mensagem da API é genérica (404).

## D-005 — Tabela alinhada para humano

- **Decision**: Novo módulo `src/format/table.ts` exportando `writeTable(rows, columns, opts)` — alinha colunas calculando largura máxima por coluna, escreve em stdout via `humanLog` ou diretamente.
- **Rationale**:
  - Reusável por todos comandos de listagem (mine, find, status, comments, logs, projects, users... features futuras).
  - Sem dependência externa (cli-table3 etc.) — overhead minimal.
- **Alternativas consideradas**:
  - `cli-table3`: +1 dep, ~30KB, formato "grid" mais bonito mas inconsistente com saída do PS atual (sem bordas).
  - Cada comando formata inline: duplicação massiva.

**Comportamento padrão**:
- Truncar células longas com `...` somente quando necessário (`maxColWidth` opcional).
- Cabeçalho em maiúsculas, sem cor por default.
- Em modo `--json`, `writeTable` é IGNORADO; comando emite `jsonOut(rows)`.

## D-006 — Abrir issue no browser (`jira open`)

- **Decision**: Novo módulo `src/platform/browser.ts` com `openInBrowser(url): Promise<void>` que detecta `os.platform()`:
  - `win32` → `cmd /c start "" <url>`
  - `darwin` → `open <url>`
  - linux/freebsd/etc → `xdg-open <url>`
- **Rationale**:
  - Consistente com convenção CLI cross-platform.
  - Sem dep extra (`open` no npm tem ~50KB e injeta env vars — overkill).
  - Fácil de mockar via `child_process.spawn` injectado.
- **Alternativas consideradas**:
  - npm `open` package: prático mas adiciona dep só para isso.
  - `Start-Process` direto: amarra a Windows/PS.

**Stdout**: comando emite `Abrindo <KEY> no navegador...` em stderr e retorna exit 0 mesmo se o spawn não bloquear (browser pode demorar).

## D-007 — Picker via `fzf`

- **Decision**: Novo módulo `src/platform/fzf.ts` com `pickWithFzf(lines: string[]): Promise<string | null>`. Spawn de `fzf` com stdin = lines, stdout coleta seleção.
- **Rationale**:
  - `fzf` é padrão de mercado para picker fuzzy em terminal.
  - Dependência externa opcional alinha com premise do spec ("dependência opcional").
  - `spawn('fzf', { stdio: ['pipe', 'pipe', 'inherit'] })` — feed lines via stdin, ler seleção via stdout, ESC produz exit code 130 → retorna null.
- **Alternativas consideradas**:
  - TUI nativo (`@clack/prompts` ou similar): adiciona dep, refatora UX e deve substituir fzf — fora de escopo.
  - Selecionar pela primeira letra: ergonomia ruim.

**Detecção de ausência**: tentativa de spawn falha com `ENOENT`. Tratar e exibir: `fzf não encontrado. Instale em: https://github.com/junegunn/fzf` + exit 1.

**Cancelamento (ESC)**: fzf retorna code 130. Wrapper retorna `null` → comando emite nada e sai com 1 (RF spec 002 H6 critério 3).

## D-008 — `jira find` — flag `--limit`

- **Decision**: `--limit N` (default 50). Aceita inteiros 1..200.
- **Rationale**: Jira `maxResults` aceita até 1000 mas valores grandes prejudicam latência e UX no terminal.
- **Alternativas consideradas**:
  - Sem limite (200 hardcoded): perde flexibilidade.
  - Pagination iterativa: complexidade desnecessária para CLI interativo.

## D-009 — `jira mine` — limite e indicador de truncagem

- **Decision**: 50 issues fixos. Quando `total > 50`, escrever em stderr (após tabela) `Mostrando 50 de <total> issues.`. Em `--json`, omitir essa linha (ela é decorativa).
- **Rationale**: Spec H1 critério 3 exige.

## D-010 — JQL escape em parâmetro de URL

- **Decision**: `encodeURIComponent` simples. JQL já permite aspas duplas internas; espaços ficam como `%20`. Não modificamos JQL.
- **Rationale**: Jira aceita JQL URL-encoded direto.

## D-011 — `jira status` — JQL gerado

- **Decision**: `assignee = currentUser() AND status = "<STATUS>" ORDER BY updated DESC`. Aspas duplas em volta do `<STATUS>` para suportar nomes com espaço (`In Progress`).
- **Rationale**: Status com espaço quebra JQL sem aspas.

## D-012 — Saída `--json` para listagens

- **Decision**: emite array de objetos com chaves consistentes:
  - `mine`/`find`/`status`/`pick (--jql)`: `[{ key, summary, status, priority, assignee?, updated }]`
  - `get`: objeto único `{ key, summary, status, priority, assignee, reporter, description, comments: [{ id, author, created, body }] }`
- **Rationale**: padrão estável para scripting; fields nomeados igual ao Jira REST mas só os relevantes.

## D-013 — `jira pick` em modo `--json`

- **Decision**: ignora silenciosamente `--json` — pick é interativo e emite só Key no stdout. Argumento `--json` é aceito mas tem efeito apenas no comando subsequente quando usado em pipe (cada comando processa próprio `--json`).
- **Rationale**: faz sentido prático: pick existe para alimentar outro comando; saída é uma string Key, não estrutura.

## D-014 — Sinais de aborto durante `fzf` / browser

- **Decision**: 
  - `fzf` herda controlador SIGINT do shell pai (Ctrl+C dentro do fzf é tratado por fzf).
  - `openInBrowser` é "fire-and-forget" — não bloqueia, processo retorna quase instantaneamente.
- **Rationale**: comportamento esperado; não precisa integração com signal.ts da 001.

---

## Saída

Sem `NEEDS CLARIFICATION`. Decisões cobrem: estrutura cliente REST, validação Key, tabela, browser, fzf, escape JQL, formatos de saída e sinais. Phase 0 OK.
