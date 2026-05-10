---
description: "Task list for 006 — Criação e Gerenciamento de Issues (jira-command)"
---

# Tasks: Criação e Gerenciamento de Issues

**Input**: Design documents from `/specs/006-create-manage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes); 001..005 mergeadas em `master`. Última feature do MVP.

**Tests**: Incluídos. TDD por US.

**Organization**:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — `jira new` | P1 (MVP) |
| 4 | US2 | História 2 — `jira sub` | P2 |
| 5 | US3 | História 3 — `jira subs` | P2 |
| 6 | US4 | História 4 — `jira link` | P2 |
| 7 | US5 | História 5 — `jira links` | P2 |
| 8 | US6 | História 6 — `jira projects` | P3 |
| 9 | US7 | História 7 — `jira users` | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável
- **[Story]**: rótulo de user story (US1..US7)
- Caminhos relativos a `D:\Sistemas\boscogit\jira-command`

---

## Phase 1: Setup

- [ ] T001 Rodar `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` — esperado: 352 testes verdes (acumulado 001..005)

---

## Phase 2: Foundational

**Purpose**: 4 módulos REST + tests.

- [ ] T002 [P] Criar `src/jira/create.ts` exportando: (a) tipo `CreatedIssue { key, url }`; (b) `createIssue(config, fields: Record<string, unknown>): Promise<CreatedIssue>` que faz `POST /rest/api/2/issue` com body `{ fields }`, parseia 201, monta `url` como `<baseUrl>/browse/<key>`; (c) `getParentProjectKey(config, parentKey): Promise<string>` que faz `GET /rest/api/2/issue/<parent>?fields=project` e retorna `fields.project.key`; (d) `getSubtasks(config, key): Promise<Subtask[]>` que faz `GET /rest/api/2/issue/<key>?fields=subtasks` e mapeia. `Subtask = { key, status, type, summary }`. Validam Key local quando aplicável
- [ ] T003 [P] Criar `tests/jira/create.test.ts` cobrindo: (a) `createIssue` envia POST com body `{fields}`, parseia `key`, monta `url` correto; (b) campos opcionais omitidos no body quando ausentes; (c) `getParentProjectKey` parseia `fields.project.key`; (d) `getSubtasks` parseia array; (e) Key inválida em `getParentProjectKey`/`getSubtasks` → exit 2 sem fetch
- [ ] T004 [P] Criar `src/jira/links.ts` exportando: (a) tipo `IssueLink { direction: '->'|'<-', type, key, status, summary }`; (b) `createLink(config, from, type, to): Promise<void>` que faz `POST /rest/api/2/issueLink` com body `{ type:{name}, outwardIssue:{key:from}, inwardIssue:{key:to} }`; (c) `getIssueLinks(config, key): Promise<IssueLink[]>` que faz `GET /rest/api/2/issue/<key>?fields=issuelinks` e mapeia: outwardIssue → `{direction:'->', type: type.outward, ...}`; inwardIssue → `{direction:'<-', type: type.inward, ...}`. Valida Keys
- [ ] T005 [P] Criar `tests/jira/links.test.ts` cobrindo: (a) `createLink` envia POST com body shape correto; (b) `getIssueLinks` mapeia outward → '->'; (c) inward → '<-'; (d) tipo `outward` vs `inward` da API (rótulo direcional); (e) Keys inválidas → exit 2 sem fetch
- [ ] T006 [P] Criar `src/jira/projects.ts` exportando: (a) tipo `Project { key, id, name, issues? }`; (b) `listAllProjects(config): Promise<Project[]>` que faz `GET /rest/api/2/project` e ordena por `key` alfabeticamente; (c) `listMyProjects(config): Promise<{ projects: Project[]; truncated: boolean }>` que usa JQL `assignee = currentUser() OR reporter = currentUser()` em `GET /search?fields=project&maxResults=500`, agrupa por project.key contando issues, ordena por `key`. `truncated` = `total > 500`
- [ ] T007 [P] Criar `tests/jira/projects.test.ts` cobrindo: (a) `listAllProjects` parseia + ordena por key; (b) `listMyProjects` agrupa por project.key + conta issues; (c) `truncated` true quando total > 500; (d) sem projetos → array vazio
- [ ] T008 [P] Criar `src/jira/users.ts` exportando: (a) tipo `User { username, name, email, active }`; (b) `listAssignableUsers(config, project, filter?): Promise<User[]>` que: se `filter`, faz 1 chamada `GET /user/assignable/search?project=<P>&username=<filter>&maxResults=1000`; senão faz 26 chamadas paralelas (`Promise.all`) iterando `username` em `a..z`, deduplicando por `name` (username) via `Map`. Ordena resultado por `displayName`
- [ ] T009 [P] Criar `tests/jira/users.test.ts` cobrindo: (a) com filter: 1 chamada com `username=<filter>`; (b) sem filter: 26 chamadas paralelas (assert via `vi.mock`); (c) deduplica por username (mesmo user retornado em "j" e "j-silva" aparece 1× no resultado); (d) ordena por displayName; (e) sem users → array vazio

**Checkpoint Phase 2**: typecheck + 32 novos testes verdes.

---

## Phase 3: US1 — `jira new` (Priority: P1) 🎯 MVP

**Goal**: usuário cria nova issue.

**Independent Test**: `quickstart.md` V1, V2.

### Tests for US1

- [ ] T010 [P] [US1] Criar `tests/commands/new.test.ts` cobrindo: (a) `--project ABC --summary "X"` chama `createIssue` com body `{fields:{project:{key:"ABC"}, summary:"X", issuetype:{name:"Task"}}}` (default Task); (b) stderr `Issue criada: ABC-456` + URL; stdout `ABC-456`; (c) `--type Bug` propaga; (d) `--desc/--priority/--assignee` propagam quando presentes; (e) campos opcionais OMITIDOS no body quando ausentes; (f) `--quiet` → stdout só Key, sem URL nem mensagem; (g) `--json` → envelope `{ok, key, action:'new', url}`; (h) `--summary` ausente → exit 2 (citty); (i) `--project` ausente → exit 2 (citty)

### Implementation for US1

- [ ] T011 [US1] Criar `src/commands/new.ts` com flags `--project` `--summary` (obrig), `--type` (default "Task"), `--desc --priority --assignee --quiet` (opc). Constrói body montando `fields` apenas com chaves não-vazias. Chama `createIssue`. Output: humano stderr Issue criada+URL + stdout Key; `--quiet` só Key; `--json` envelope. Depende T002
- [ ] T012 [US1] Em `src/commands/root.ts`, registrar `newCommand` (chave `new`)

---

## Phase 4: US2 — `jira sub` (Priority: P2)

**Goal**: cria subtask herdando projeto do parent.

**Independent Test**: `quickstart.md` V3, V4.

### Tests for US2

- [ ] T013 [P] [US2] Criar `tests/commands/sub.test.ts` cobrindo: (a) `--parent ABC-1 --summary "X"` chama `getParentProjectKey("ABC-1")` (mock retorna "ABC") + `createIssue` com body incluindo `project:{key:"ABC"}, parent:{key:"ABC-1"}, issuetype:{name:"Sub-task"}` (default); (b) `--type Subtarefa` (PT-BR) propaga; (c) `--desc/--assignee` propagam; (d) stderr `Subtask criada: ABC-501 (parent ABC-1)` + URL; stdout `ABC-501`; (e) `--quiet` → stdout só Key; (f) `--json` envelope `{ok, key, action:'sub', url, parent}`; (g) parent inválido → exit 2; (h) parent inexistente (404) → exit 4

### Implementation for US2

- [ ] T014 [US2] Criar `src/commands/sub.ts` com flags `--parent --summary` (obrig), `--type` (default "Sub-task"), `--desc --assignee --quiet` (opc). Valida parent via `validateKey`. Chama `getParentProjectKey(parent)` + `createIssue` com `project` herdado e `parent` no fields. Output similar a `new`. Depende T002
- [ ] T015 [US2] Em `src/commands/root.ts`, registrar `subCommand` (chave `sub`)

---

## Phase 5: US3 — `jira subs` (Priority: P2)

**Goal**: lista subtasks de uma issue.

**Independent Test**: `quickstart.md` V5.

### Tests for US3

- [ ] T016 [P] [US3] Criar `tests/commands/subs.test.ts` cobrindo: (a) tabela KEY/STATUS/TIPO/RESUMO; (b) sem subtasks → "<KEY> não tem subtasks."; (c) `--json` array; (d) Key inválida → exit 2; (e) pipe stdin

### Implementation for US3

- [ ] T017 [US3] Criar `src/commands/subs.ts` com arg posicional opc `key`. Usa `resolveKeys` + `validateKey` + `getSubtasks(config, key)`. Saída humana via `writeTable`; `--json` array. Depende T002
- [ ] T018 [US3] Em `src/commands/root.ts`, registrar `subsCommand` (chave `subs`)

---

## Phase 6: US4 — `jira link` (Priority: P2)

**Goal**: cria link entre 2 issues.

**Independent Test**: `quickstart.md` V6.

### Tests for US4

- [ ] T019 [P] [US4] Criar `tests/commands/link.test.ts` cobrindo: (a) `--from ABC-1 --type Blocks --to ABC-2` chama `createLink` com args corretos; (b) stderr `Link criado: ABC-1 -[Blocks]-> ABC-2.`; (c) `--json` envelope `{ok, action:'link', from, to, type}`; (d) Keys inválidas (`from`/`to`) → exit 2; (e) tipo inválido (400) → mensagem servidor + exit 1

### Implementation for US4

- [ ] T020 [US4] Criar `src/commands/link.ts` com flags `--from --type --to` (todos obrig). Valida `from`/`to` via `validateKey`. Chama `createLink`. Depende T004
- [ ] T021 [US4] Em `src/commands/root.ts`, registrar `linkCommand` (chave `link`)

---

## Phase 7: US5 — `jira links` (Priority: P2)

**Goal**: lista links de uma issue (entrada e saída).

**Independent Test**: `quickstart.md` V7.

### Tests for US5

- [ ] T022 [P] [US5] Criar `tests/commands/links.test.ts` cobrindo: (a) tabela DIREÇÃO/TIPO/ISSUE/STATUS/RESUMO; (b) outward → `->`; inward → `<-`; (c) sem links → "<KEY> não tem links."; (d) `--json` array; (e) Key inválida → exit 2

### Implementation for US5

- [ ] T023 [US5] Criar `src/commands/links.ts` com arg posicional opc `key`. Usa `resolveKeys` + `validateKey` + `getIssueLinks(config, key)`. Saída humana via `writeTable`; `--json` array. Depende T004
- [ ] T024 [US5] Em `src/commands/root.ts`, registrar `linksCommand` (chave `links`)

---

## Phase 8: US6 — `jira projects` (Priority: P3)

**Goal**: lista projetos do usuário (default) ou todos com `--all`.

**Independent Test**: `quickstart.md` V8.

### Tests for US6

- [ ] T025 [P] [US6] Criar `tests/commands/projects.test.ts` cobrindo: (a) sem `--all` → tabela KEY/ID/NOME/ISSUES + chama `listMyProjects`; (b) `--all` → tabela KEY/ID/NOME (sem ISSUES) + chama `listAllProjects`; (c) vazio → "Nenhum projeto encontrado."; (d) sem `--all` + `truncated:true` → aviso em stderr; (e) `--json` array

### Implementation for US6

- [ ] T026 [US6] Criar `src/commands/projects.ts` com flag `--all`. Sem `--all`: `listMyProjects` → tabela 4 colunas; se `truncated` exibe aviso stderr. Com `--all`: `listAllProjects` → tabela 3 colunas. `--json` array. Depende T006
- [ ] T027 [US6] Em `src/commands/root.ts`, registrar `projectsCommand` (chave `projects`)

---

## Phase 9: US7 — `jira users` (Priority: P3)

**Goal**: lista usuários atribuíveis a um projeto.

**Independent Test**: `quickstart.md` V9.

### Tests for US7

- [ ] T028 [P] [US7] Criar `tests/commands/users.test.ts` cobrindo: (a) `<PROJETO>` obrig + `--filter` → 1 chamada via `listAssignableUsers(p, filter)`; (b) sem `--filter` → 26 chamadas (a-z scan); (c) tabela USERNAME/NOME/EMAIL/ATIVO + rodapé contagem; (d) vazio → "Nenhum usuário encontrado em <PROJETO>."; (e) `--json` array; (f) ordenado por displayName

### Implementation for US7

- [ ] T029 [US7] Criar `src/commands/users.ts` com arg posicional `project` (obrig) + flag `--filter`. Chama `listAssignableUsers(config, project, filter)`. Saída humana: tabela 4 colunas + rodapé `<N> usuários encontrados.` em stderr; `--json` array. Depende T008
- [ ] T030 [US7] Em `src/commands/root.ts`, registrar `usersCommand` (chave `users`)

---

## Phase 10: Polish

- [ ] T031 [P] Atualizar `README.md` com seção feature 006 (7 comandos novos), exemplos de `--quiet` em `new`/`sub`, observação sobre `--all` em projects e a-z scan em users
- [ ] T032 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` — todos verdes
- [ ] T033 Executar V1..V13 do `quickstart.md` em terminal real contra Jira
- [ ] T034 Push branch + abrir PR + verificar CI verde
- [ ] T035 Avaliar `npx vitest run --coverage` — meta 80% nos novos módulos: `src/jira/{create,links,projects,users}.ts`, `src/commands/{new,sub,subs,link,links,projects,users}.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): trivial.
- Foundational (Phase 2): T002-T009 todos [P] entre si (4 módulos REST + 4 testes).
- US1..US7 dependem de Phase 2.
  - US1 (P1) MVP — `new`.
  - US2-US5 (P2) paralelizáveis após Phase 2.
  - US6+US7 (P3) — projects + users.
- Polish: depende de todas.

### Within-task Dependencies

- T002 → T011 (new), T014 (sub), T017 (subs)
- T004 → T020 (link), T023 (links)
- T006 → T026 (projects)
- T008 → T029 (users)
- T011/T014/T017/T020/T023/T026/T029 → T012/T015/T018/T021/T024/T027/T030 (registros sequenciais)

### Parallel Opportunities

- Phase 2: 8 tarefas todas [P] entre si.
- Cada teste de comando [P].
- US distintas paralelizáveis após Phase 2.

---

## Parallel Example: Phase 2

```bash
Task: "src/jira/create.ts (createIssue, getParentProjectKey, getSubtasks)"   # T002
Task: "tests/jira/create.test.ts"                                            # T003
Task: "src/jira/links.ts (createLink, getIssueLinks)"                        # T004
Task: "tests/jira/links.test.ts"                                             # T005
Task: "src/jira/projects.ts (listAllProjects, listMyProjects)"               # T006
Task: "tests/jira/projects.test.ts"                                          # T007
Task: "src/jira/users.ts (listAssignableUsers — filter | a-z scan)"          # T008
Task: "tests/jira/users.test.ts"                                             # T009
```

---

## Implementation Strategy

### MVP (US1 jira new)

1. Phase 1 → Phase 2 (foundational).
2. Phase 3 (US1) → `jira new` cria issue.
3. Validar V1, V2 do quickstart.
4. Demo / merge.

### Incremental Delivery

1. Setup + Foundational.
2. + US1 new (V1, V2).
3. + US2 sub + US3 subs (V3-V5).
4. + US4 link + US5 links (V6, V7).
5. + US6 projects (V8).
6. + US7 users (V9).
7. Polish + CI verde + quickstart fim-a-fim → MVP completo (31 comandos cobrindo todo `jira.ps1`).

### Parallel Team

Após Phase 2:
- Dev A: US1 + US2 (new + sub).
- Dev B: US3 + US4 + US5 (subs + link + links).
- Dev C: US6 + US7 (projects + users).

---

## Notes

- [P] = arquivos diferentes.
- TDD: testes precedem implementação.
- Reutilizar `validateKey` (002), `resolveKeys` (001), `writeTable` (002), `humanLog/jsonOut/quietOut` (001).
- `--quiet` em `new`/`sub` segue padrão RF-010 da 001 — Key em stdout, mensagem em stderr (mas `--quiet` suprime mensagem decorativa).
- `users` sem filter usa `Promise.all` em a-z — speedup vs sequential.
- `projects` sem `--all` JQL truncado em 500 issues; aviso em stderr quando `total > 500`.
- Última feature do MVP — fecha port do `jira.ps1`.
