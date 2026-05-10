---
description: "Task list for 003 — Transições de Workflow (jira-command)"
---

# Tasks: Transições de Workflow

**Input**: Design documents from `/specs/003-workflow-transitions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes); 001 + 002 mergeadas em `master`.

**Tests**: Incluídos. TDD por US.

**Organization**:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — `jira start` | P1 (MVP) |
| 4 | US2 | História 2 — `jira done` | P1 |
| 5 | US3 | História 3 — `jira stop` | P2 |
| 6 | US4 | História 4 — `jira trans` (read-only) | P2 |
| 7 | US5 | História 5 — `jira move <KEY> <ID>` | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência em tarefa incompleta)
- **[Story]**: rótulo de user story (US1..US5)
- Caminhos absolutos relativos à raiz: `D:\Sistemas\boscogit\jira-command`

---

## Phase 1: Setup

- [X] T001 Rodar `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` na raiz para confirmar que 001 + 002 estão saudáveis (esperado: 183 testes verdes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: helpers compartilhados pelos 5 comandos: getPattern (regex de match), listTransitions, applyTransition, findTransition.

- [X] T002 [P] Criar `src/jira/patterns.ts` exportando: tipo `PatternKind = 'start' | 'done' | 'stop'`; constante `DEFAULT_PATTERNS` com regex case-insensitive (start/done/stop conforme research D-003); função `getPattern(kind: PatternKind): RegExp` que lê `JIRA_PATTERN_<KIND>` da env e retorna regex (case-insensitive) ou default; valida regex via try-catch — inválida → JiraError exitCode 2 com mensagem `JIRA_PATTERN_<KIND> inválido: <erro>`
- [X] T003 [P] Criar `tests/jira/patterns.test.ts` cobrindo: (a) defaults retornam regex case-insensitive ("Start" e "START" casam pattern de start), (b) override via env (`JIRA_PATTERN_START="Custom"` → regex `/Custom/i`), (c) regex inválida (`JIRA_PATTERN_START="["`) → JiraError exitCode 2, (d) cada kind tem default distinto
- [X] T004 [P] Criar `src/jira/transitions.ts` exportando: type `Transition { id, name, to }`; type `MatchResult = { match: 'one', transition } | { match: 'none', available } | { match: 'many', candidates, available }`; função `listTransitions(config, key): Promise<Transition[]>` que chama `GET /rest/api/2/issue/<key>/transitions` (valida Key local via validateKey); função `applyTransition(config, key, transitionId): Promise<void>` que faz `POST /rest/api/2/issue/<key>/transitions` com body `{ transition: { id } }`; função `findTransition(transitions, regex): MatchResult` (puro)
- [X] T005 [P] Criar `tests/jira/transitions.test.ts` cobrindo: (a) `listTransitions` chama URL correta + parseia transitions[]; (b) `listTransitions` valida Key local antes do fetch (Key inválida → exitCode 2 sem chamar fetch); (c) `applyTransition` envia POST com body correto; (d) `applyTransition` aceita 204 No Content (sem JSON parse); (e) `findTransition` discriminated: 1 match → `{ match: 'one', transition }`; 0 → `{ match: 'none', available }`; 2+ → `{ match: 'many', candidates, available }`; (f) match é case-insensitive por substring no `name`

**Checkpoint Phase 2**: `npm run typecheck` limpo; novos testes verdes.

---

## Phase 3: US1 — `jira start` (Priority: P1) 🎯 MVP

**Goal**: usuário move issue para "In Progress" via match automático.

**Independent Test**: `quickstart.md` V2, V3, V6, V11.

### Tests for US1

- [X] T006 [P] [US1] Criar `tests/commands/start.test.ts` cobrindo: (a) match único: `applyTransition` chamado com transitionId correto; stderr `<KEY> movida para '<TO_NAME>'.`; exit 0; (b) match nenhum: stderr `Transição 'Em Andamento' não disponível em <KEY>. Transições disponíveis:` + lista; exit 1; (c) match ambíguo: stderr `Várias transições correspondem ao padrão em <KEY>: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.`; exit 1; NÃO chama applyTransition; (d) Key inválida → exit 2 antes do fetch; (e) `--json` em sucesso: `{ ok:true, key, action:'start', transitionId, to }`; (f) pipe stdin com 1 e múltiplas Keys; (g) 403 mapeado para "Sem permissão para realizar esta transição em <KEY>." + exit 5

### Implementation for US1

- [X] T007 [US1] Criar `src/commands/start.ts` com arg posicional opcional `key`. Usa `resolveKeys` (RF-012). Para cada Key: `validateKey` + `listTransitions` + `findTransition(t, getPattern('start'))`. Match `'one'` → `applyTransition` + log sucesso (humano stderr ou JSON envelope). Match `'none'`/`'many'` → mensagem específica + lança JiraError exitCode 1. 403 (httpStatus=5) traduz mensagem genérica para "Sem permissão para realizar esta transição em <KEY>." mantendo exitCode 5. Depende T002, T004
- [X] T008 [US1] Em `src/commands/root.ts`, registrar `startCommand` em `subCommands` (chave `start`)

**Checkpoint US1**: `jira start` aplica transição em projeto com workflow padrão.

---

## Phase 4: US2 — `jira done` (Priority: P1)

**Goal**: usuário move issue para "Done".

**Independent Test**: `quickstart.md` V4.

Implementação espelha US1 trocando `getPattern('start')` por `getPattern('done')` e label `Em Andamento` por `Concluído`.

### Tests for US2

- [X] T009 [P] [US2] Criar `tests/commands/done.test.ts` cobrindo: (a) match único aplica; (b) match nenhum: label `Concluído`; (c) match ambíguo recusa; (d) Key inválida; (e) `--json` action=`done`; (f) 403

### Implementation for US2

- [X] T010 [US2] Criar `src/commands/done.ts` (idêntico ao start mas com kind=`done` e label=`Concluído`). Considerar fatorar lógica comum em helper `runMatchAndApply(kind, key, label, action)` em `src/commands/_transitions.ts` se as 3 (start/done/stop) ficarem repetitivas
- [X] T011 [US2] Em `src/commands/root.ts`, registrar `doneCommand` (chave `done`)

**Checkpoint US2**: `jira done` aplica transição.

---

## Phase 5: US3 — `jira stop` (Priority: P2)

**Goal**: usuário retorna issue para "To Do" / Backlog.

**Independent Test**: `quickstart.md` V5.

### Tests for US3

- [X] T012 [P] [US3] Criar `tests/commands/stop.test.ts` cobrindo: cenários idênticos a US2 trocando label para `A Fazer` e action para `stop`

### Implementation for US3

- [X] T013 [US3] Criar `src/commands/stop.ts` (espelha done com kind=`stop` e label=`A Fazer`)
- [X] T014 [US3] Em `src/commands/root.ts`, registrar `stopCommand` (chave `stop`)

**Checkpoint US3**: as três transições padrão funcionam.

---

## Phase 6: US4 — `jira trans` (Priority: P2)

**Goal**: lista transições disponíveis em uma issue (somente leitura).

**Independent Test**: `quickstart.md` V1.

### Tests for US4

- [X] T015 [P] [US4] Criar `tests/commands/trans.test.ts` cobrindo: (a) tabela com colunas ID/NOME/PARA; (b) sem transições → `Nenhuma transição disponível para <KEY> no estado atual.`; (c) `--json` → array `[{id, name, to}]`; (d) Key inválida → exit 2; (e) pipe stdin

### Implementation for US4

- [X] T016 [US4] Criar `src/commands/trans.ts` com arg posicional opcional `key`, `resolveKeys`, `validateKey` + `listTransitions`. Saída humana via `writeTable` (3 colunas); `--json` emite array sem envelope (RF-005 + D-010 do research). Depende T004
- [X] T017 [US4] Em `src/commands/root.ts`, registrar `transCommand` (chave `trans`)

**Checkpoint US4**: `jira trans` mostra opções.

---

## Phase 7: US5 — `jira move <KEY> <ID>` (Priority: P3)

**Goal**: aplicar transição por ID exato (fallback quando match automático falha).

**Independent Test**: `quickstart.md` V7, V8.

### Tests for US5

- [X] T018 [P] [US5] Criar `tests/commands/move.test.ts` cobrindo: (a) ID válido aplica + log usa `to.name` da lista (mock listTransitions); (b) ID inexistente → `Transição <ID> não encontrada para <KEY>. Execute 'jira trans <KEY>' para ver as disponíveis.` + exit 1, NÃO chama applyTransition; (c) Key inválida → exit 2; (d) `--json` action=`move`; (e) pipe stdin com KEY (ID continua como argumento); (f) 403 → exit 5

### Implementation for US5

- [X] T019 [US5] Criar `src/commands/move.ts` com 2 args posicionais — `key` opcional + `id` obrigatório. Usa `resolveKeys` para coletar Keys (ID continua sendo arg fixo). Para cada Key: `validateKey` + `listTransitions` (precisa de `to.name` para log) → encontra transição com ID exato → ausente → exit 1 com mensagem; encontrada → `applyTransition` + log com `to.name`. Depende T004
- [X] T020 [US5] Em `src/commands/root.ts`, registrar `moveCommand` (chave `move`)

**Checkpoint US5**: `jira move ABC-1 21` aplica direto; ID errado falha cedo.

---

## Phase 8: Polish & Cross-Cutting

- [X] T021 [P] Atualizar `README.md` adicionando seção dos 5 comandos novos com exemplos e env vars `JIRA_PATTERN_*`
- [X] T022 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` localmente — TODOS devem passar
- [ ] T023 Executar V1..V13 de `quickstart.md` em terminal real contra Jira (incluindo V3 com env override e V6 com workflow ambíguo)
- [ ] T024 Push branch `003-workflow-transitions` + abrir PR para `master` + verificar workflow CI verde
- [X] T025 Avaliar `npx vitest run --coverage` — meta 80% nos novos módulos: `src/jira/patterns.ts`, `src/jira/transitions.ts`, `src/commands/{start,done,stop,trans,move}.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): trivial.
- Foundational (Phase 2): T002, T003 [P] entre si; T004, T005 [P] entre si.
- US1..US5: dependem de Phase 2.
  - US1 (P1) MVP — primeiro.
  - US2/US3 (P2) compartilham padrão de US1; podem ser paralelos.
  - US4 (P2) é só leitura — independente.
  - US5 (P3) usa só `listTransitions` + `applyTransition`.
- Polish: depende de todas as US.

### Within-task Dependencies

- T002 → T007/T010/T013 (start/done/stop usam getPattern)
- T004 → T007/T010/T013/T016/T019 (todos usam transitions)
- T007/T010/T013/T016/T019 → T008/T011/T014/T017/T020 (registro em root.ts é sequencial — mesmo arquivo)

### Parallel Opportunities

- **Phase 2**: T002 + T003 [P] juntos; T004 + T005 [P] juntos.
- **Phase 3-7 testes**: cada teste de comando é [P] em relação aos outros.
- **US distintas**: após Phase 2, US1+US4+US5 podem ser paralelas (US1 cobre o padrão que US2/US3 espelham — fazer US1 primeiro evita refactor depois).

---

## Parallel Example: Phase 2

```bash
Task: "src/jira/patterns.ts (getPattern + DEFAULT_PATTERNS)"        # T002
Task: "tests/jira/patterns.test.ts"                                 # T003
Task: "src/jira/transitions.ts (list/apply/find/MatchResult)"       # T004
Task: "tests/jira/transitions.test.ts"                              # T005
```

---

## Implementation Strategy

### MVP (US1 jira start)

1. Phase 1 → Phase 2 (foundational completa).
2. Phase 3 (US1) → `jira start` funcional contra Jira real.
3. Validar V2, V3 do quickstart.
4. Demo / merge.

### Incremental Delivery

1. Setup + Foundational.
2. + US1 (start) — primeiro fluxo completo (V2/V3).
3. + US2 (done) — espelha US1 (V4).
4. + US3 (stop) — fecha o trio (V5).
5. + US4 (trans) — diagnóstico (V1).
6. + US5 (move) — fallback (V7/V8).
7. Polish + CI.

### Parallel Team

Após Phase 2:
- Dev A: US1 (estabelece padrão; depois replica em US2/US3).
- Dev B: US4 (independente, leitura).
- Dev C: US5 (independente, sem pattern matching).

Coordenar registro em `src/commands/root.ts` via PRs pequenos.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência.
- TDD: testes antes da implementação.
- Reutilizar `validateKey` (002), `resolveKeys` (001), `writeTable` (002), `humanLog/jsonOut` (001).
- Comandos start/done/stop são quase idênticos — considerar helper compartilhado `_transitions.ts` se houver muita duplicação após T010/T013.
- `jira trans` em `--json` emite array SEM envelope (é leitura, não ação).
- Ações em `--json` seguem RF-019 da 001: `{ok, key, action, transitionId, to}` ou `{ok:false, error, exitCode}`.
- Match ambíguo NÃO aplica nenhuma transição — RF-007 do spec.
- Mensagem de sucesso usa `transition.to.name` (RF-008) — nunca rótulo hardcoded.
