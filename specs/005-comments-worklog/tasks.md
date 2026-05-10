---
description: "Task list for 005 — Comentários e Registro de Tempo (jira-command)"
---

# Tasks: Comentários e Registro de Tempo

**Input**: Design documents from `/specs/005-comments-worklog/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes); 001..004 mergeadas em `master`.

**Tests**: Incluídos. TDD por US.

**Organization**:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — `jira comment` | P1 (MVP) |
| 4 | US2 | História 4 — `jira log` | P1 |
| 5 | US3 | História 2 — `jira comments` | P2 |
| 6 | US4 | História 5 — `jira logs` | P2 |
| 7 | US5 | História 3 — `jira comment-del` | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável
- **[Story]**: rótulo de user story (US1..US5)
- Caminhos relativos a `D:\Sistemas\boscogit\jira-command`

---

## Phase 1: Setup

- [X] T001 Rodar `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` — esperado: 292 testes verdes (acumulado 001..004)

---

## Phase 2: Foundational

**Purpose**: helpers compartilhados (REST de comentários e worklog, preview, confirm prompt).

- [X] T002 [P] Criar `src/format/preview.ts` exportando `previewText(text: string, max: number): string` — retorna `text` quando `text.length <= max`, senão `text.slice(0, max - 3) + '...'`. Não despeja `...` quando o texto cabe (corrige bug do `jira.ps1`)
- [X] T003 [P] Criar `tests/format/preview.test.ts` cobrindo: (a) texto curto retorna como veio (sem `...`); (b) texto exatamente do tamanho `max` retorna sem `...`; (c) texto maior que `max` é truncado para `max-3` chars + `...`; (d) `max` <= 3 trunca direto para `max` chars sem `...`
- [X] T004 [P] Criar `src/jira/comments.ts` exportando: (a) `Comment` type (id, author, created, body); (b) `createComment(config, key, body): Promise<Comment>` que faz `POST /rest/api/2/issue/<key>/comment` com body `{ body }`, retorna comment criado (parseia 201); (c) `listComments(config, key, max=50): Promise<Comment[]>` que faz `GET /rest/api/2/issue/<key>/comment?maxResults=<N>&orderBy=-created`; (d) `deleteComment(config, key, commentId): Promise<void>` que faz `DELETE /rest/api/2/issue/<key>/comment/<id>` (204). Todos validam Key local
- [X] T005 [P] Criar `tests/jira/comments.test.ts` cobrindo: (a) `createComment` envia POST com body `{body}` e retorna Comment parseado; (b) `listComments` envia GET com `maxResults` e `orderBy=-created`, parseia `comments[]`; (c) `deleteComment` envia DELETE para URL correta + aceita 204 sem JSON parse; (d) Key inválida em todas três → exitCode 2 sem chamar fetch; (e) 404 propaga via mapHttpToError
- [X] T006 [P] Criar `src/jira/worklog.ts` exportando: (a) `Worklog` type (id, author, started, timeSpent, comment); (b) `createWorklog(config, key, timeSpent, comment?): Promise<Worklog>` que faz `POST /rest/api/2/issue/<key>/worklog` com body `{ timeSpent, comment? }` (omite `comment` se ausente/vazio), retorna worklog criado; (c) `listWorklog(config, key): Promise<Worklog[]>` que faz `GET /rest/api/2/issue/<key>/worklog`. Validam Key local
- [X] T007 [P] Criar `tests/jira/worklog.test.ts` cobrindo: (a) `createWorklog` sem comment envia body apenas com `{timeSpent}` (sem chave `comment`); (b) com comment envia ambos; (c) parseia 201; (d) `listWorklog` parseia `worklogs[]`; (e) Key inválida → exitCode 2 sem fetch
- [X] T008 [P] Criar `src/platform/prompt.ts` exportando `confirmInteractive(question: string): Promise<boolean>` — retorna `false` quando `!process.stdin.isTTY` ou `!process.stdout.isTTY`; senão escreve `question` em stderr e lê uma linha via `node:readline`, retorna `true` se resposta (após trim, lowercase) for `s` ou `y`. Expõe `setReadlineImplForTests` para mock
- [X] T009 [P] Criar `tests/platform/prompt.test.ts` cobrindo: (a) stdin TTY+stdout TTY+resposta "s" → true; (b) "S" → true; (c) "y"/"Y" → true; (d) "n"/"N"/"qualquer-outro" → false; (e) string vazia → false; (f) stdin não-TTY → false sem ler; (g) stdout não-TTY → false sem ler

**Checkpoint Phase 2**: `npm run typecheck` limpo; novos testes verdes.

---

## Phase 3: US1 — `jira comment` (Priority: P1) 🎯 MVP

**Goal**: usuário adiciona comentário a uma issue.

**Independent Test**: `quickstart.md` V1, V2.

### Tests for US1

- [X] T010 [P] [US1] Criar `tests/commands/comment.test.ts` cobrindo: (a) `createComment(key, "<TEXTO>")` chamado, stderr `Comentário adicionado em <KEY> (#<id>).`, exit 0; (b) texto vazio → "O texto do comentário não pode ser vazio." + exit 2 sem chamar API; (c) texto só com espaços → idem; (d) `--json` envelope `{ok, key, action:'comment', commentId}`; (e) Key inválida → exit 2; (f) pipe stdin

### Implementation for US1

- [X] T011 [US1] Criar `src/commands/comment.ts` com 2 args posicionais — `key` opc + `text` obrig. Usa `resolveKeys`. Para cada Key: `validateKey` + valida texto não-vazio (após trim) → senão JiraError exitCode 2 mensagem específica + `createComment(config, key, text)` + log com `id` retornado. Depende T004
- [X] T012 [US1] Em `src/commands/root.ts`, registrar `commentCommand` (chave `comment`)

---

## Phase 4: US2 — `jira log` (Priority: P1)

**Goal**: usuário registra tempo trabalhado.

**Independent Test**: `quickstart.md` V7, V8.

### Tests for US2

- [X] T013 [P] [US2] Criar `tests/commands/log.test.ts` cobrindo: (a) `createWorklog(key, "1h 30m")` chamado sem comment, stderr `Worklog 1h 30m registrado em <KEY>.`, exit 0; (b) com 3o arg posicional → comment passado; (c) formato inválido (mock 400) → mensagem do servidor + exit 1; (d) `--json` envelope `{ok, key, action:'log', time, worklogId}`; (e) Key inválida → exit 2; (f) pipe stdin

### Implementation for US2

- [X] T014 [US2] Criar `src/commands/log.ts` com 3 args posicionais — `key` opc + `time` obrig + `comment` opc. Usa `resolveKeys`. Para cada Key: `validateKey` + `createWorklog(config, key, time, comment)` + log. Depende T006
- [X] T015 [US2] Em `src/commands/root.ts`, registrar `logCommand` (chave `log`)

---

## Phase 5: US3 — `jira comments` (Priority: P2)

**Goal**: lista comentários (50 mais recentes).

**Independent Test**: `quickstart.md` V3.

### Tests for US3

- [X] T016 [P] [US3] Criar `tests/commands/comments.test.ts` cobrindo: (a) tabela ID/AUTOR/DATA/COMENTÁRIO com preview 80 (assert via mock `listComments`); (b) sem comentários → "Nenhum comentário em <KEY>."; (c) `--json` array; (d) data formatada para 10 chars (substring ISO); (e) Key inválida → exit 2

### Implementation for US3

- [X] T017 [US3] Criar `src/commands/comments.ts` com arg posicional opc `key`. Usa `resolveKeys` + `validateKey` + `listComments(config, key, 50)`. Saída humana via `writeTable` com colunas ID/AUTOR/DATA/COMENTÁRIO; data trunca para 10 chars (`created.slice(0,10)`); body via `previewText(body, 80)`. `--json` emite array sem envelope. Depende T002, T004
- [X] T018 [US3] Em `src/commands/root.ts`, registrar `commentsCommand` (chave `comments`)

---

## Phase 6: US4 — `jira logs` (Priority: P2)

**Goal**: lista worklogs.

**Independent Test**: `quickstart.md` V9.

### Tests for US4

- [X] T019 [P] [US4] Criar `tests/commands/logs.test.ts` cobrindo: (a) tabela ID/AUTOR/DATA/TEMPO/COMENTÁRIO com preview 60 (`comment` field); (b) sem worklogs → "Nenhum apontamento em <KEY>."; (c) `--json` array; (d) Key inválida → exit 2

### Implementation for US4

- [X] T020 [US4] Criar `src/commands/logs.ts` com arg posicional opc `key`. Usa `resolveKeys` + `validateKey` + `listWorklog(config, key)`. Saída humana via `writeTable` com 5 colunas; `started` para 10 chars; `comment` via `previewText(comment, 60)`. `--json` array. Depende T002, T006
- [X] T021 [US4] Em `src/commands/root.ts`, registrar `logsCommand` (chave `logs`)

---

## Phase 7: US5 — `jira comment-del` (Priority: P3)

**Goal**: deleta comentário com confirmação interativa, ou `--yes` para bypass.

**Independent Test**: `quickstart.md` V4, V5, V6.

### Tests for US5

- [X] T022 [P] [US5] Criar `tests/commands/comment-del.test.ts` cobrindo: (a) `--yes` chama `deleteComment(key, id)` direto sem prompt + stderr `Comentário <ID> deletado.` + exit 0; (b) interativo (stdin+stdout TTY) com mock `confirmInteractive` retornando true → deleta + log; (c) interativo com confirm retornando false → "Operação cancelada." + exit 0, sem deleteComment; (d) modo não-interativo (stdin não-TTY) sem `--yes` → "Operação cancelada (modo não-interativo). Use --yes para confirmar." + exit 2 sem deleteComment; (e) `--json` envelope `{ok, key, action:'comment-del', commentId}`; (f) Key inválida → exit 2; (g) 403 mapeado para exit 5

### Implementation for US5

- [X] T023 [US5] Criar `src/commands/comment-del.ts` com 2 args posicionais — `key` opc + `id` obrig — e flag `--yes`. Usa `resolveKeys`. Para cada Key: `validateKey` + se `args.yes` pula confirm; senão se `!process.stdin.isTTY || !process.stdout.isTTY` → JiraError exitCode 2 mensagem RF; senão `confirmInteractive(...)` → false retorna "Operação cancelada." sem JiraError (exit 0); true → `deleteComment(config, key, id)` + log. Depende T004, T008
- [X] T024 [US5] Em `src/commands/root.ts`, registrar `commentDelCommand` (chave `comment-del`)

---

## Phase 8: Polish

- [X] T025 [P] Atualizar `README.md` com seção feature 005, exemplos dos 5 comandos, observação sobre `--yes`
- [X] T026 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` — todos verdes
- [ ] T027 Executar V1..V13 de `quickstart.md` em terminal real (incluindo V4/V5/V6 confirm interativo)
- [X] T028 Push branch + abrir PR + verificar CI verde
- [X] T029 Avaliar `npx vitest run --coverage` — meta 80% nos novos módulos: `src/format/preview.ts`, `src/jira/comments.ts`, `src/jira/worklog.ts`, `src/platform/prompt.ts`, `src/commands/{comment,comments,comment-del,log,logs}.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): trivial.
- Foundational (Phase 2): T002-T009 todos [P] entre si (arquivos distintos).
- US1..US5 dependem de Phase 2.
  - US1+US2 (P1) MVP — comment + log.
  - US3+US4 (P2) listagens.
  - US5 (P3) — confirmação.
- Polish: depende de todas.

### Within-task Dependencies

- T004 → T011 (comment), T017 (comments), T023 (comment-del)
- T006 → T014 (log), T020 (logs)
- T002 → T017 (comments preview), T020 (logs preview)
- T008 → T023 (comment-del confirm)
- T011/T014/T017/T020/T023 → T012/T015/T018/T021/T024 (registros sequenciais em root.ts)

### Parallel Opportunities

- Phase 2: T002, T003, T004, T005, T006, T007, T008, T009 todos [P].
- Cada teste de comando [P].
- US distintas paralelizáveis após Phase 2.

---

## Parallel Example: Phase 2

```bash
Task: "src/format/preview.ts (previewText)"                          # T002
Task: "tests/format/preview.test.ts"                                  # T003
Task: "src/jira/comments.ts (createComment, listComments, deleteComment)"  # T004
Task: "tests/jira/comments.test.ts"                                  # T005
Task: "src/jira/worklog.ts (createWorklog, listWorklog)"              # T006
Task: "tests/jira/worklog.test.ts"                                   # T007
Task: "src/platform/prompt.ts (confirmInteractive)"                   # T008
Task: "tests/platform/prompt.test.ts"                                # T009
```

---

## Implementation Strategy

### MVP (US1 comment + US2 log)

1. Phase 1 → Phase 2 (foundational).
2. Phase 3 (US1) + Phase 4 (US2) → write actions disponíveis.
3. Validar V1, V2, V7, V8 do quickstart.
4. Demo / merge.

### Incremental Delivery

1. Setup + Foundational.
2. + US1 comment (V1, V2).
3. + US2 log (V7, V8).
4. + US3 comments (V3).
5. + US4 logs (V9).
6. + US5 comment-del — interatividade (V4-V6).
7. Polish + CI.

### Parallel Team

Após Phase 2:
- Dev A: US1 + US3 (comment + comments).
- Dev B: US2 + US4 (log + logs).
- Dev C: US5 (comment-del — interatividade).

---

## Notes

- [P] = arquivos diferentes.
- TDD: testes precedem implementação.
- Reutilizar `validateKey` (002), `resolveKeys` (001), `writeTable` (002), `humanLog/jsonOut` (001).
- `--yes` em `comment-del` é mandatório em pipe (RF-003 + CS-002).
- Texto vazio em `comment` validado LOCAL antes do POST (D-009 do research).
- `previewText` adiciona `...` apenas quando truncou (corrige bug do `jira.ps1`).
- Todos comandos pipe-ready via `resolveKeys` para Key (args adicionais ficam fixos).
