---
description: "Task list for 002 — Consulta de Issues (jira-command)"
---

# Tasks: Consulta de Issues

**Input**: Design documents from `/specs/002-issue-browsing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes); foundation 001 mergeada em `master`.

**Tests**: Incluídos. Cada US ganha tests primeiro (TDD).

**Organization**: Tarefas agrupadas por user story em ordem de prioridade. Mapeamento:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — `jira mine` | P1 (MVP) |
| 4 | US2 | História 2 — `jira get` (pipe-ready) | P1 |
| 5 | US3 | História 3 — `jira find "<JQL>"` | P2 |
| 6 | US4 | História 4 — `jira status "<STATUS>"` | P2 |
| 7 | US5 | História 5 — `jira open` (pipe-ready) | P3 |
| 8 | US6 | História 6 — `jira pick` (fzf) | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência em tarefa incompleta)
- **[Story]**: rótulo de user story (US1..US6); ausente em Setup/Foundational/Polish
- Caminhos absolutos relativos à raiz: `D:\Sistemas\boscogit\jira-command`

## Path Conventions

- Single project. Foundation 001 já em `master`; só adicionamos arquivos novos em `src/format/`, `src/jira/`, `src/platform/`, `src/commands/` e tests análogos. Nenhuma config nova (`package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, CI) — herdadas.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirmar que a base 001 mergeada está saudável antes de adicionar comandos novos.

- [X] T001 Rodar `npm install`, `npm run lint`, `npm run typecheck` e `npm run test` na raiz para confirmar que a foundation 001 importa sem erros e os 92 testes passam — se falhar, investigar antes de prosseguir

**Checkpoint Phase 1**: testes verdes; nenhum arquivo modificado.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: módulos compartilhados pelos 6 comandos: validador de Key, helper de tabela, cliente REST de issues.

**⚠️ CRITICAL**: nenhuma US começa antes de Phase 2 fechar.

- [X] T002 [P] Criar `src/jira/key.ts` com `KEY_REGEX = /^[A-Z][A-Z0-9_]+-\d+$/` e função `validateKey(input: string): string` que retorna `input` quando casa o regex, ou lança `JiraError` exitCode 2 com mensagem `Formato de Key inválido: '<entrada>'. Esperado padrão tipo ABC-123.` (RF-008 do spec 002)
- [X] T003 [P] Criar `src/format/table.ts` com tipo `TableColumn { header, key, align?, maxWidth? }` e função `writeTable<T extends object>(rows: T[], columns: TableColumn[], opts?: { stream?: NodeJS.WriteStream }): void` — calcula largura máxima por coluna, alinha (left default), trunca com `...` quando excede `maxWidth`, escreve linha por linha via `humanLog`. NÃO escreve nada quando `rows` vazio. Em modo `--json` o caller NÃO chama esta função
- [X] T004 [P] Criar `tests/jira/key.test.ts` cobrindo: (a) Keys válidas (ABC-1, MTET-9999, A1_B-42), (b) Keys inválidas (123, ABC, abc-1, ABC-, ABC-x) → JiraError exitCode 2, (c) input vazio → exitCode 2
- [X] T005 [P] Criar `tests/format/table.test.ts` cobrindo: (a) alinhamento básico (3 colunas, 2 rows), (b) cabeçalho em maiúsculas, (c) `maxWidth` trunca célula com `...`, (d) `rows` vazio → não escreve nada, (e) chave ausente da row → célula vazia
- [X] T006 Criar `src/jira/issues.ts` exportando: (a) `Issue` e `IssueSummary` types, (b) `searchIssues(config, jql, fields, maxResults): Promise<{ issues: IssueSummary[]; total: number }>` que chama `GET /rest/api/2/search?jql=<encoded>&maxResults=N&fields=<csv>` via `jiraFetch`, (c) `getIssue(config, key): Promise<Issue>` que chama `GET /rest/api/2/issue/<key>?fields=*navigable,comment` e, se `fields.comment.comments` ausente, faz fallback para `getIssueComments`, (d) `getIssueComments(config, key, max=10): Promise<Comment[]>`. Usa `validateKey` em `getIssue` antes do fetch. Depende T002
- [X] T007 [P] Criar `tests/jira/issues.test.ts` cobrindo: (a) `searchIssues` envia URL com `jql` URL-encoded, `maxResults` e `fields` corretos (mock fetch), (b) parseia `total` e `issues[]`, (c) `getIssue` chama `?fields=*navigable,comment` e retorna comentários inline quando presentes, (d) `getIssue` faz fallback para `/comment` quando inline ausente, (e) `getIssue` valida Key local — passa `123abc` → JiraError exitCode 2 ANTES de qualquer fetch (assert `fetch` NÃO foi chamado), (f) 404 propaga JiraError exitCode 4

**Checkpoint Phase 2**: `npm run typecheck` limpo; `npm run test` verde com novos testes.

---

## Phase 3: User Story 1 — `jira mine` (Priority: P1) 🎯 MVP

**Goal**: usuário lista suas issues abertas em ordem de prioridade.

**Independent Test**: `quickstart.md` V1.

### Tests for User Story 1

- [X] T008 [P] [US1] Criar `tests/commands/mine.test.ts` cobrindo: (a) saída humana imprime tabela com colunas Key/Prioridade/Status/Resumo (mock `searchIssues`), (b) sem issues → "Nenhuma issue encontrada." em stdout, (c) `total > 50` → tabela + `Mostrando 50 de <total> issues.` em stderr, (d) `--json` emite array de objetos com chaves `key, summary, status, priority, assignee?, updated`, (e) JQL chamado: `assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC` (assert via mock)

### Implementation for User Story 1

- [X] T009 [US1] Criar `src/commands/mine.ts` exportando `mineCommand` via `citty.defineCommand`: chama `searchIssues` com JQL fixo, `fields=summary,status,priority`, `maxResults=50`. Em modo padrão usa `writeTable` (colunas Key, Prioridade, Status, Resumo); em `--json` chama `jsonOut` com array. Quando `total > 50` escreve aviso em stderr via `humanLog(process.stderr, ...)`. Depende T006
- [X] T010 [US1] Em `src/commands/root.ts`, registrar `mineCommand` em `subCommands` (chave `mine`)

**Checkpoint US1**: `jira mine` funciona contra Jira real com tabela alinhada.

---

## Phase 4: User Story 2 — `jira get` (Priority: P1)

**Goal**: usuário vê detalhes completos + 10 últimos comentários, com pipe via stdin.

**Independent Test**: `quickstart.md` V2..V5.

### Tests for User Story 2

- [X] T011 [P] [US2] Criar `tests/commands/get.test.ts` cobrindo: (a) saída humana inclui `=== <KEY> ===`, Summary/Status/Priority/Assignee/Reporter, Description e seção Comments com 10 mais recentes, (b) `--json` emite objeto único com `comments` aninhado, (c) Key inválida (`123abc`) → exitCode 2 antes do fetch (mock `searchIssues`/`getIssue` não chamados), (d) 404 → "Issue <KEY> não encontrada." em stderr + exitCode 4, (e) sem comentários → não imprime seção Comments, (f) pipe via stdin: `runRootSafe(['get'])` com stdin `"ABC-1\n"` mockado processa ABC-1, (g) múltiplas linhas no stdin processa sequencialmente

### Implementation for User Story 2

- [X] T012 [US2] Criar `src/commands/get.ts` exportando `getCommand`: aceita arg posicional opcional `key`; usa `resolveKeys` (RF-012) para combinar arg+stdin; itera Keys; para cada Key chama `validateKey` + `getIssue`. Em humano formata bloco multi-linha (ver `data-model.md` E2). Em `--json` emite objeto via `jsonOut`. 404 traduz para "Issue <KEY> não encontrada." com exitCode 4 (intercepta `JiraError.httpStatus === 404`). Depende T002, T006, stdin.resolveKeys
- [X] T013 [US2] Em `src/commands/root.ts`, registrar `getCommand` em `subCommands` (chave `get`)

**Checkpoint US2**: `jira get ABC-123` mostra detalhes; `echo ABC-123 | jira get` funciona; Key inválida sai com 2 sem chamar API.

---

## Phase 5: User Story 3 — `jira find "<JQL>"` (Priority: P2)

**Goal**: busca livre via JQL com `--limit`.

**Independent Test**: `quickstart.md` V6.

### Tests for User Story 3

- [X] T014 [P] [US3] Criar `tests/commands/find.test.ts` cobrindo: (a) tabela com colunas Key/Prioridade/Status/Responsável/Resumo, (b) `--limit 10` propaga para `searchIssues` (mock recebe `maxResults=10`), (c) `--limit` default 50, (d) JQL inválido → mensagem do servidor (RF-013 da 001) e exit 1, (e) sem resultados → "Nenhuma issue encontrada para o JQL informado.", (f) `--json` emite array

### Implementation for User Story 3

- [X] T015 [US3] Criar `src/commands/find.ts` com arg posicional `jql` (obrigatório) e `--limit` (number, default 50, validate 1..200). Chama `searchIssues` com `fields=summary,status,priority,assignee`. Saída humana usa `writeTable` com 5 colunas; `--json` emite array. Mensagem de "sem resultados" diferente da `mine`. Depende T006
- [X] T016 [US3] Em `src/commands/root.ts`, registrar `findCommand` em `subCommands` (chave `find`)

**Checkpoint US3**: `jira find "project = X"` funciona; `--limit` respeita; JQL inválido propaga erro do servidor.

---

## Phase 6: User Story 4 — `jira status "<STATUS>"` (Priority: P2)

**Goal**: minhas issues filtradas por status.

**Independent Test**: `quickstart.md` V7.

### Tests for User Story 4

- [X] T017 [P] [US4] Criar `tests/commands/status.test.ts` cobrindo: (a) JQL gerado: `assignee = currentUser() AND status = "In Progress" ORDER BY updated DESC` (assert via mock — atenção: aspas no JQL para STATUS com espaço), (b) status sem matches → "Nenhuma issue com status \"<STATUS>\" encontrada.", (c) status com espaço (`"Code Review"`) gera JQL correto, (d) tabela: Key/Prioridade/Status/Resumo

### Implementation for User Story 4

- [X] T018 [US4] Criar `src/commands/status.ts` com arg posicional `status` (obrigatório). Constrói JQL com aspas duplas (escape `"` no STATUS via `JSON.stringify` ou substituição). Chama `searchIssues` com `fields=summary,status,priority`, `maxResults=50`. Saída humana via `writeTable`; `--json` emite array. Depende T006
- [X] T019 [US4] Em `src/commands/root.ts`, registrar `statusCommand` em `subCommands` (chave `status`)

**Checkpoint US4**: `jira status "In Progress"` retorna minhas issues nesse estado.

---

## Phase 7: User Story 5 — `jira open <KEY>` (Priority: P3)

**Goal**: abre issue no browser; pipe-ready.

**Independent Test**: `quickstart.md` V8.

### Tests for User Story 5

- [X] T020 [P] [US5] Criar `tests/platform/browser.test.ts` cobrindo: (a) mock `child_process.spawn` (via `vi.mock('node:child_process')`) — em `os.platform()='win32'` chama `cmd /c start "" <url>`, (b) em `darwin` chama `open <url>`, (c) em `linux` chama `xdg-open <url>`, (d) spawn falha (ENOENT) → JiraError exitCode 6 com mensagem "Falha ao abrir browser"
- [X] T021 [P] [US5] Criar `src/platform/browser.ts` exportando `openInBrowser(url: string): Promise<void>`. Detecta `os.platform()` e usa `spawn` com `detached: true, stdio: 'ignore'` + `unref()` (fire-and-forget). Trata ENOENT lançando JiraError exitCode 6
- [X] T022 [P] [US5] Criar `tests/commands/open.test.ts` cobrindo: (a) saída humana: stderr `Abrindo <KEY> no navegador...`, exit 0, (b) `--json`: stdout `{"ok":true,"key":"<KEY>","action":"open"}` + exit 0 (RF-019 da 001), (c) Key inválida → exitCode 2, (d) pipe stdin processa múltiplas Keys, (e) URL construída: `<JIRA_BASE_URL>/browse/<KEY>`

### Implementation for User Story 5

- [X] T023 [US5] Criar `src/commands/open.ts` com arg posicional opcional `key`. Usa `resolveKeys` (RF-012). Para cada Key: `validateKey` + `openInBrowser(`${baseUrl}/browse/${key}`)` + log apropriado conforme `--json` ou humano. Depende T002, T021, stdin.resolveKeys, config (apenas baseUrl)
- [X] T024 [US5] Em `src/commands/root.ts`, registrar `openCommand` em `subCommands` (chave `open`)

**Checkpoint US5**: `jira open ABC-123` abre browser; `echo ABC-123 | jira open` funciona; `--json` envelope correto.

---

## Phase 8: User Story 6 — `jira pick` (Priority: P3)

**Goal**: picker fuzzy via `fzf` para alimentar pipe.

**Independent Test**: `quickstart.md` V9.

### Tests for User Story 6

- [X] T025 [P] [US6] Criar `tests/platform/fzf.test.ts` cobrindo: (a) mock `spawn`: stdin recebe linhas, stdout retorna seleção → função retorna string trim, (b) spawn falha ENOENT → JiraError exitCode 1 com mensagem "fzf não encontrado..." + URL de instalação, (c) fzf retorna code 130 (ESC) → função retorna `null`, (d) fzf retorna code 0 com seleção vazia → `null`
- [X] T026 [P] [US6] Criar `src/platform/fzf.ts` exportando `pickWithFzf(lines: string[]): Promise<string | null>`. Spawn `fzf` com `stdio: ['pipe', 'pipe', 'inherit']`. Escreve `lines.join('\n')` em stdin, fecha. Coleta stdout. Em `close` event: code 130 ou 1 com stdout vazio → `null`; code 0 → trim e retorna; ENOENT → JiraError exitCode 1
- [X] T027 [P] [US6] Criar `tests/commands/pick.test.ts` cobrindo: (a) usa JQL default (idêntico ao `mine`), (b) `--jql` propaga JQL custom, (c) sem fzf → JiraError exitCode 1 (catch global emite mensagem RF-013 da 001), (d) ESC (pickWithFzf retorna null) → exit 1, sem stdout, (e) seleção válida → stdout = `<KEY>\n`, exit 0, (f) `searchIssues` chamado com `fields=summary,status,priority`, `maxResults=200`

### Implementation for User Story 6

- [X] T028 [US6] Criar `src/commands/pick.ts` com flag `--jql` opcional. Constrói linhas formatadas (`<KEY> [<STATUS>] <SUMMARY>`), chama `pickWithFzf`. Sucesso: extrai Key (primeiro token) via split + emite via `quietOut`. ESC: retorna exit 1 sem mensagem. Depende T026
- [X] T029 [US6] Em `src/commands/root.ts`, registrar `pickCommand` em `subCommands` (chave `pick`)

**Checkpoint US6**: `jira pick` lista issues no fzf; seleção emite Key; `jira pick | jira get` funciona.

---

## Phase 9: Polish & Cross-Cutting

- [X] T030 [P] Atualizar `README.md` na raiz adicionando seção dos 6 comandos novos (mine/get/find/status/open/pick) com exemplo de uso e link para `specs/002-issue-browsing/`
- [X] T031 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` localmente — TODOS devem passar
- [ ] T032 Executar V1..V13 de `quickstart.md` em terminal real contra Jira
- [ ] T033 Push branch `002-issue-browsing` + abrir PR para `master` + verificar workflow CI verde
- [X] T034 Avaliar `npx vitest run --coverage` — meta mínima 80% nos novos módulos: `src/jira/key.ts`, `src/jira/issues.ts`, `src/format/table.ts`, `src/platform/browser.ts`, `src/platform/fzf.ts`, `src/commands/mine.ts`, `src/commands/get.ts`, `src/commands/find.ts`, `src/commands/status.ts`, `src/commands/open.ts`, `src/commands/pick.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: trivial; pode iniciar imediatamente.
- **Foundational (Phase 2)**: independente da 001 (já em master). T002, T003, T004, T005 [P] entre si. T006 depende de T002. T007 [P] após T006.
- **User Stories (Phase 3-8)**: dependem de Phase 2.
  - US1, US2 (P1) podem ser feitas em sequência ou paralelo (US1 é MVP, faça primeiro).
  - US3, US4 (P2) paralelizáveis após Phase 2.
  - US5, US6 (P3) paralelizáveis após Phase 2.
- **Polish (Phase 9)**: depende de todas as US desejadas.

### Within Phase Dependencies

- T002 → T006 (issues.ts usa validateKey)
- T006 → T009 (mine), T012 (get), T015 (find), T018 (status), T028 (pick) — tudo que chama searchIssues/getIssue
- T021 → T023 (open usa openInBrowser)
- T026 → T028 (pick usa pickWithFzf)
- T009/T012/T015/T018/T023/T028 → T010/T013/T016/T019/T024/T029 (registro em root.ts é sequencial entre si — todas tocam mesmo arquivo)

### Parallel Opportunities

- **Phase 2**: T002, T003 [P] entre si (arquivos diferentes); T004, T005, T007 [P] (testes).
- **Cada US**: o teste é [P] em relação aos demais comandos. Implementação é sequencial dentro da US (test → impl → registro).
- **US5/US6 platform**: T020, T021, T022, T025, T026, T027 todos [P] entre si (arquivos distintos); só os respectivos commands (T023, T028) e registros (T024, T029) são sequenciais.
- Stories independentes: US1..US6 podem rodar em paralelo após Phase 2 fechar (cuidado: T010, T013, T016, T019, T024, T029 todos editam `src/commands/root.ts` — coordenar via PR pequenos ou consolidar).

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "src/jira/key.ts com KEY_REGEX + validateKey"                    # T002
Task: "src/format/table.ts com writeTable"                             # T003
Task: "tests/jira/key.test.ts (válidas, inválidas, vazia)"             # T004
Task: "tests/format/table.test.ts (alinhamento, maxWidth, vazio)"      # T005
```

## Parallel Example: User Story 5 (testes + platform)

```bash
Task: "tests/platform/browser.test.ts (mock spawn, 3 SOs, ENOENT)"     # T020
Task: "src/platform/browser.ts (openInBrowser detached unref)"         # T021
Task: "tests/commands/open.test.ts (humano, --json, pipe stdin)"       # T022
```

---

## Implementation Strategy

### MVP First (US1 + US2 — ambos P1)

1. Phase 1 (trivial) → confirmar 92 testes da 001 verdes.
2. Phase 2 (Foundational) — key, table, issues client + testes.
3. Phase 3 (US1 mine) → entrega listagem básica.
4. Phase 4 (US2 get) → entrega visualização detalhada.
5. **STOP**: validar V1..V5 do quickstart contra Jira real.
6. Demo / merge.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. + US1 mine → primeiro comando útil (V1).
3. + US2 get → workflow básico ler-issue (V2..V5).
4. + US3 find → JQL livre (V6).
5. + US4 status → filtros frequentes (V7).
6. + US5 open → atalho UI (V8).
7. + US6 pick → ergonomia avançada (V9).
8. Polish + CI verde + quickstart fim-a-fim (V12, V13).

### Parallel Team Strategy

Após Phase 2:
- Dev A: US1 + US2 (testes + impl + registro).
- Dev B: US3 + US4 (P2).
- Dev C: US5 + US6 (P3 + plataforma).

Coordenação no `src/commands/root.ts`: cada dev faz o registro do seu comando como último step da US e abre PR pequeno.

---

## Notes

- [P] = arquivos diferentes, sem dependência → seguro paralelizar.
- [Story] = traceabilidade ao spec.md.
- TDD: cada US começa pelos testes; eles devem falhar antes da implementação.
- Cada teste de comando mocka `searchIssues`/`getIssue` (NÃO mocka `fetch` direto — abstração mais limpa).
- `--quiet` NÃO é flag local desta feature (RF-010 da 001 cobre só `new`/`sub`/`assign`).
- `jira pick` não suporta `--quiet` — saída sempre é só Key (RF do spec H6 critério 2).
- Commit após cada T concluído (ou grupo lógico [P]) para rastro fino.
- `quickstart.md` é o gate final de cada US.
