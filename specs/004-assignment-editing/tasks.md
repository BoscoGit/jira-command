---
description: "Task list for 004 — Atribuição e Edição de Campos (jira-command)"
---

# Tasks: Atribuição e Edição de Campos

**Input**: Design documents from `/specs/004-assignment-editing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes); 001 + 002 + 003 mergeadas em `master`.

**Tests**: Incluídos. TDD por US.

**Organization**:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — `jira assign` | P1 (MVP) |
| 4 | US2 | História 2 — `jira unassign` | P2 |
| 5 | US3 | História 3 — `jira prio` | P2 |
| 6 | US4 | História 4 — `jira summary` | P2 |
| 7 | US5 | História 5 — `jira label` / `jira label-del` | P3 |
| 8 | US6 | História 6 — `jira desc` (editor) | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência em tarefa incompleta)
- **[Story]**: rótulo de user story (US1..US6)
- Caminhos relativos a `D:\Sistemas\boscogit\jira-command`

---

## Phase 1: Setup

- [ ] T001 Rodar `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` — esperado: 229 testes verdes (acumulado 001+002+003)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: helpers compartilhados pelos 7 comandos: REST de edição, editor externo, resolução de `me`.

- [ ] T002 [P] Criar `src/jira/edit.ts` exportando: (a) `updateAssignee(config, key, name | null): Promise<void>` que faz `PUT /rest/api/2/issue/<key>/assignee` com body `{ name }` (valida Key local); (b) `updateField(config, key, fields: Record<string, unknown>): Promise<void>` que faz `PUT /rest/api/2/issue/<key>` com body `{ fields }`; (c) `addLabel(config, key, label): Promise<void>` que faz `PUT /rest/api/2/issue/<key>` com body `{ update: { labels: [{ add: label }] } }`; (d) `removeLabel(config, key, label): Promise<void>` (op `remove`); (e) `getDescription(config, key): Promise<string>` que faz `GET /rest/api/2/issue/<key>?fields=description` e retorna string vazia quando null; (f) `resolveAssignee(config, raw: string | undefined): Promise<string>` que retorna `raw` literal a menos que seja undefined ou `"me"` (case-insensitive) — nesses casos faz `GET /rest/api/2/myself` e retorna `name` (cache em closure local: `let cachedMe: string | null = null`)
- [ ] T003 [P] Criar `tests/jira/edit.test.ts` cobrindo: (a) `updateAssignee` envia `{name}` ou `{name: null}`; (b) `updateField` envia body `{fields}`; (c) `addLabel`/`removeLabel` enviam `{update:{labels:[...]}}`; (d) `getDescription` retorna string vazia quando `fields.description` é null; (e) `resolveAssignee` retorna literal quando recebe `"joao"`; (f) `resolveAssignee` chama `/myself` quando recebe undefined; (g) `resolveAssignee` chama `/myself` quando recebe `"me"` (case-insensitive); (h) `resolveAssignee` cacheia entre chamadas dentro do mesmo processo (testar via 2 invocações + assert fetch chamado 1×); (i) Key inválida em `updateAssignee`/`updateField`/`addLabel`/`removeLabel`/`getDescription` → exitCode 2 antes do fetch
- [ ] T004 [P] Criar `src/platform/editor.ts` exportando: (a) tipo `EditorCommand { cmd, args }`; (b) função pura `commandFor(filePath, env=process.env, plat=process.platform): EditorCommand` que resolve em ordem `EDITOR` → `VISUAL` → win32:`notepad.exe` → demais:`nano`. Para `EDITOR`/`VISUAL` que contém espaços, fazer split em tokens (primeiro = cmd, resto = args + filePath); (c) `openEditor(filePath: string): Promise<void>` que faz `spawn(cmd, [...args, filePath], { stdio: 'inherit' })`, aguarda `close`. Code != 0 → JiraError exitCode 1 com mensagem RF-009. ENOENT → tenta fallback `vi` se cmd era `nano`; senão JiraError exitCode 1
- [ ] T005 [P] Criar `tests/platform/editor.test.ts` cobrindo: (a) `commandFor` com `env.EDITOR="vim"` → cmd vim args [filePath]; (b) `env.EDITOR="code -w"` → cmd code args ['-w', filePath] (split em tokens); (c) `env.VISUAL` quando EDITOR ausente; (d) win32 default → notepad.exe; (e) linux default → nano; (f) `openEditor` chama spawn com stdio: 'inherit' (mock spawn); (g) close code 0 → resolve; (h) close code 1 → JiraError exitCode 1 com mensagem RF-009; (i) ENOENT em nano → tenta vi (assert spawn chamado 2×); (j) ENOENT em editor não-nano → JiraError exitCode 1

**Checkpoint Phase 2**: `npm run typecheck` limpo; novos testes verdes.

---

## Phase 3: US1 — `jira assign` (Priority: P1) 🎯 MVP

**Goal**: usuário se atribui ou atribui outro a uma issue.

**Independent Test**: `quickstart.md` V1.

### Tests for US1

- [ ] T006 [P] [US1] Criar `tests/commands/assign.test.ts` cobrindo: (a) sem `--user`: chama `resolveAssignee(undefined)` → `updateAssignee(key, "<me-username>")`, stderr `<KEY> atribuído a <username>.`, exit 0; (b) `--user joao` literal repassa; (c) `--user me` resolve idêntico a sem `--user`; (d) `--quiet` emite Key em stdout (mantém mensagem em stderr); (e) `--json` envelope `{ok, key, action:'assign', user}`; (f) Key inválida → exit 2; (g) pipe stdin com 1 e múltiplas Keys; (h) 400 (username inexistente) → mensagem do servidor + exit 1

### Implementation for US1

- [ ] T007 [US1] Criar `src/commands/assign.ts` com arg posicional opcional `key` + flags `--user <USERNAME>` e `--quiet`. Usa `resolveKeys`. Para cada Key: `validateKey` + `resolveAssignee(config, args.user)` + `updateAssignee(config, key, username)` + log apropriado (`--quiet` usa `quietOut`; humano `humanLog(stderr, ..., 'green')`; `--json` envelope). Depende T002
- [ ] T008 [US1] Em `src/commands/root.ts`, registrar `assignCommand` (chave `assign`)

**Checkpoint US1**: `jira assign ABC-1` atribui ao user atual; `--user me`, `--user X`, `--quiet`, `--json` funcionam.

---

## Phase 4: US2 — `jira unassign` (Priority: P2)

**Goal**: remove responsável.

**Independent Test**: `quickstart.md` V2.

### Tests for US2

- [ ] T009 [P] [US2] Criar `tests/commands/unassign.test.ts` cobrindo: (a) chama `updateAssignee(key, null)`, stderr `<KEY> sem responsável.`, exit 0; (b) `--json` envelope `{ok, key, action:'unassign'}`; (c) Key inválida → exit 2; (d) pipe stdin

### Implementation for US2

- [ ] T010 [US2] Criar `src/commands/unassign.ts` com arg posicional opcional `key`. Usa `resolveKeys` + `validateKey` + `updateAssignee(config, key, null)`. Depende T002
- [ ] T011 [US2] Em `src/commands/root.ts`, registrar `unassignCommand` (chave `unassign`)

---

## Phase 5: US3 — `jira prio` (Priority: P2)

**Goal**: altera prioridade.

**Independent Test**: `quickstart.md` V3.

### Tests for US3

- [ ] T012 [P] [US3] Criar `tests/commands/prio.test.ts` cobrindo: (a) chama `updateField(key, { priority: { name: "High" } })`, stderr `<KEY> prioridade definida para High.`, exit 0; (b) `--json` envelope `{ok, key, action:'prio', priority:'High'}`; (c) prioridade inválida (400) → mensagem do servidor + exit 1; (d) Key inválida → exit 2; (e) pipe stdin com mesma prioridade aplicada a múltiplas Keys

### Implementation for US3

- [ ] T013 [US3] Criar `src/commands/prio.ts` com 2 args posicionais — `key` opcional + `priority` obrigatório. Usa `resolveKeys`. Para cada Key: `validateKey` + `updateField(config, key, { priority: { name: priority } })` + log. Depende T002
- [ ] T014 [US3] Em `src/commands/root.ts`, registrar `prioCommand` (chave `prio`)

---

## Phase 6: US4 — `jira summary` (Priority: P2)

**Goal**: altera título.

**Independent Test**: `quickstart.md` V4.

### Tests for US4

- [ ] T015 [P] [US4] Criar `tests/commands/summary.test.ts` cobrindo: (a) chama `updateField(key, { summary: "<TITULO>" })`, stderr `<KEY> título atualizado.`, exit 0; (b) `--json` envelope `{ok, key, action:'summary', summary:'...'}`; (c) summary com espaços (passado como arg único após aspas no shell); (d) Key inválida → exit 2

### Implementation for US4

- [ ] T016 [US4] Criar `src/commands/summary.ts` com 2 args posicionais — `key` opcional + `summary` obrigatório. Usa `resolveKeys`. Para cada Key: `validateKey` + `updateField(config, key, { summary })` + log. Depende T002
- [ ] T017 [US4] Em `src/commands/root.ts`, registrar `summaryCommand` (chave `summary`)

---

## Phase 7: US5 — `jira label` / `jira label-del` (Priority: P3)

**Goal**: adicionar/remover labels preservando demais.

**Independent Test**: `quickstart.md` V5, V6.

### Tests for US5

- [ ] T018 [P] [US5] Criar `tests/commands/label.test.ts` cobrindo: (a) `addLabel(key, "backend")` chamado, stderr `Label 'backend' adicionada em <KEY>.`; (b) `--json` envelope `{ok, key, action:'label', added:'backend'}`; (c) Key inválida → exit 2; (d) pipe stdin
- [ ] T019 [P] [US5] Criar `tests/commands/label-del.test.ts` cobrindo: (a) `removeLabel(key, "backend")` chamado, stderr `Label 'backend' removida de <KEY>.`; (b) `--json` envelope `{ok, key, action:'label-del', removed:'backend'}`; (c) Key inválida → exit 2; (d) label inexistente é idempotente (sem erro)

### Implementation for US5

- [ ] T020 [US5] Criar `src/commands/label.ts` com 2 args posicionais — `key` opcional + `label` obrigatório. Usa `resolveKeys` + `validateKey` + `addLabel(config, key, label)` + log. Depende T002
- [ ] T021 [US5] Criar `src/commands/label-del.ts` (espelha label, troca para `removeLabel`)
- [ ] T022 [US5] Em `src/commands/root.ts`, registrar `labelCommand` (chave `label`) e `labelDelCommand` (chave `label-del`)

---

## Phase 8: US6 — `jira desc` (Priority: P3)

**Goal**: editar descrição via editor externo, salva apenas se houve mudança.

**Independent Test**: `quickstart.md` V7, V8, V9, V10.

### Tests for US6

- [ ] T023 [P] [US6] Criar `tests/commands/desc.test.ts` cobrindo: (a) descrição original lida via `getDescription`; tmp file criado em `os.tmpdir()` com extensão `.md`; `openEditor` chamado; após close 0 e mudança no arquivo, `updateField(key, { description })` é chamado; stderr `<KEY> descrição atualizada.`; exit 0; (b) sem mudança no arquivo (mesma string) → NÃO chama `updateField`; stderr `Sem alterações em <KEY>.`; exit 0 (CS-003); (c) trim trailing `\r\n` na comparação (descrição igual + newline final ainda é "sem mudança"); (d) pipe (stdout não-TTY) → exit 2 antes de `getDescription` ser chamado; (e) editor exit code != 0 → exit 1 com mensagem RF-009, sem `updateField`; (f) tmp file removido em `finally` mesmo em erro (testar via spy em `fs.rmSync`); (g) tmp file registrado via `registerTmpFile` da 001 (mock + assert); (h) `--json` envelope `{ok, key, action:'desc', updated:true|false}`; (i) Key inválida → exit 2

### Implementation for US6

- [ ] T024 [US6] Criar `src/commands/desc.ts` com arg posicional opcional `key`. Usa `resolveKeys`. Para cada Key: (1) verifica `process.stdout.isTTY` — se falso, lança JiraError exitCode 2 com mensagem `desc requer terminal interativo.`; (2) `validateKey`; (3) `getDescription(config, key)`; (4) cria tmp file `path.join(os.tmpdir(), `jira-${key}-${randomUUID()}.md`)` com `fs.writeFileSync(path, original, 'utf8')`; (5) `registerTmpFile(path)` (de `src/signal.ts`); (6) try: `openEditor(path)`; (7) leia `fs.readFileSync(path, 'utf8')`; (8) trim trailing `[\r\n]+$` em ambos (atual e novo); (9) se iguais → log "Sem alterações em <KEY>." + envelope `updated:false`; senão → `updateField(config, key, { description: newText })` + log + envelope `updated:true`; (10) finally: `unregisterTmpFile(path)` + `fs.rmSync(path, { force: true })`. Depende T002, T004
- [ ] T025 [US6] Em `src/commands/root.ts`, registrar `descCommand` (chave `desc`)

---

## Phase 9: Polish & Cross-Cutting

- [ ] T026 [P] Atualizar `README.md` adicionando seção da feature 004 com 7 comandos novos, env vars `EDITOR`/`VISUAL`, exemplos
- [ ] T027 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` localmente — TODOS verdes
- [ ] T028 Executar V1..V13 do `quickstart.md` em terminal real contra Jira (incluindo V8 sem mudança, V9 desc em pipe, V10 editor com erro)
- [ ] T029 Push branch `004-assignment-editing` + abrir PR para `master` + verificar workflow CI verde
- [ ] T030 Avaliar `npx vitest run --coverage` — meta 80% nos novos módulos: `src/jira/edit.ts`, `src/platform/editor.ts`, `src/commands/{assign,unassign,prio,summary,label,label-del,desc}.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): trivial.
- Foundational (Phase 2): T002+T003 [P]; T004+T005 [P]; T002 e T004 podem rodar em paralelo entre si (módulos distintos).
- US1..US6: dependem de Phase 2.
  - US1 (P1) MVP — primeiro.
  - US2/US3/US4 (P2) compartilham padrão simples (validateKey + updateField/updateAssignee).
  - US5 (P3) tem 2 comandos.
  - US6 (P3) é o mais complexo (editor + tmp file + signal cleanup).
- Polish: depende de todas as US.

### Within-task Dependencies

- T002 → T007/T010/T013/T016/T020/T021/T024 (todos os comandos usam jira/edit.ts)
- T004 → T024 (apenas desc usa platform/editor.ts)
- T007/T010/T013/T016/T020/T021/T024 → T008/T011/T014/T017/T022/T025 (registros em root.ts são sequenciais entre si)

### Parallel Opportunities

- Phase 2: T002, T003, T004, T005 todos [P] entre si.
- Cada teste de comando é [P] em relação aos demais.
- US1..US6 podem ser desenvolvidos por devs distintos após Phase 2 (US6 é o mais isolado — só depende de T004 além da edit.ts).

---

## Parallel Example: Phase 2

```bash
Task: "src/jira/edit.ts (updateAssignee, updateField, addLabel, removeLabel, getDescription, resolveAssignee)"   # T002
Task: "tests/jira/edit.test.ts"                                                                                  # T003
Task: "src/platform/editor.ts (commandFor + openEditor)"                                                         # T004
Task: "tests/platform/editor.test.ts"                                                                            # T005
```

---

## Implementation Strategy

### MVP (US1 jira assign)

1. Phase 1 → Phase 2 (foundational completa).
2. Phase 3 (US1) → `jira assign` funcional contra Jira real.
3. Validar V1 do quickstart.
4. Demo / merge.

### Incremental Delivery

1. Setup + Foundational.
2. + US1 assign — ponto de pipeline (V1, V11).
3. + US2 unassign (V2).
4. + US3 prio (V3).
5. + US4 summary (V4).
6. + US5 label/label-del (V5, V6, V12).
7. + US6 desc — feature mais complexa, com editor externo (V7-V10).
8. Polish + CI verde.

### Parallel Team Strategy

Após Phase 2:
- Dev A: US1 (estabelece padrão de assign + flag `--quiet`).
- Dev B: US2 + US3 + US4 (todos espelham padrão simples).
- Dev C: US5 (label/label-del compartilham estrutura).
- Dev D: US6 (desc — isolado, mais complexo).

Coordenar `src/commands/root.ts` via PRs pequenos.

---

## Notes

- [P] = arquivos diferentes, sem dependência.
- TDD: testes precedem implementação.
- Reutilizar `validateKey` (002), `resolveKeys` (001), `humanLog/jsonOut/quietOut` (001), `registerTmpFile/unregisterTmpFile` (001), `signal` da 001 (handleSigint cuida do cleanup automático em SIGINT).
- `assign --quiet` segue padrão do RF-010 da 001 — mensagem decorativa em stderr, Key em stdout.
- `desc` é o único comando da 004 que NÃO é totalmente pipe-ready: pipe via stdin para Key OK, mas exige stdout TTY (RF-010 deste spec). Em pipe puro (sem TTY), recusa com exit 2.
- Comparação de descrição usa trim apenas trailing `\r`/`\n` — RF-007 letra d.
- Encoding tmp file: UTF-8 sem BOM (default do Node `fs.writeFileSync`).
- Cleanup tmp file: SEMPRE em `finally`; signal handler da 001 cobre Ctrl+C.
