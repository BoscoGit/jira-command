# Implementation Plan: Transições de Workflow

**Branch**: `003-workflow-transitions` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-workflow-transitions/spec.md`

## Summary

Feature 003 entrega cinco comandos que aplicam ou listam transições de workflow Jira:

- `jira start <KEY>` — move para "In Progress" via match de padrão (P1, pipe-ready).
- `jira done <KEY>` — move para "Done" via match de padrão (P1, pipe-ready).
- `jira stop <KEY>` — move para "To Do" via match de padrão (P2, pipe-ready).
- `jira trans <KEY>` — lista transições disponíveis (P2, pipe-ready, somente leitura).
- `jira move <KEY> <ID>` — aplica transição pelo ID numérico (P3, fallback).

Adiciona dois módulos: `src/jira/transitions.ts` (listTransitions, applyTransition) e `src/jira/patterns.ts` (regex de match com override via env). Reusa 100% da fundação 001 + 002 (key.ts, table.ts).

Quando o match de padrão é ambíguo (várias transições casam), comando RECUSA aplicar (RF-007) e exibe candidatas instruindo uso de `jira move`.

Mensagem de sucesso usa o NOME REAL do estado destino retornado pela API (`transition.to.name`) — RF-008.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node 22 LTS, ESM (continuação 001/002).
**Primary Dependencies** (todas já presentes):
- Runtime: `citty`, `picocolors`, `undici`. **Sem novas deps.**
- Dev: `typescript`, `tsx`, `vitest`, `@biomejs/biome`, `@types/node`, `@vitest/coverage-v8`.

**Storage**: N/A.
**Testing**: vitest. Comandos mockam `listTransitions`/`applyTransition`; cliente REST mocka `fetch` via `vi.stubGlobal`.
**Target Platform**: Node 22, Win/Linux/macOS.
**Project Type**: CLI single-project.
**Performance Goals**:
- `jira trans` < 1.5s (1 chamada GET).
- `jira start/done/stop` < 3s (2 chamadas: GET transitions + POST).
- `jira move` < 2s (1 chamada POST).

**Constraints**:
- Match case-insensitive por substring nos nomes das transições retornadas pela API (não nos `to.name`).
- Padrões default em PT/EN com override via env (`JIRA_PATTERN_START` etc.).
- Ambiguidade ≥ 2 matches → recusa aplicar, lista candidatas (RF-007).
- Pipe-ready em todos os comandos com `<KEY>` (RF-012 da 001).
- Mensagem usa `transition.to.name` da API (RF-008).
- Saída JSON: `{ ok, key, action, transitionId, to }` para ações; array `[{ id, name, to }]` para `trans`.

**Scale/Scope**: 5 comandos novos, ~250-400 LoC src + ~400-500 LoC tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição em `.specify/memory/constitution.md` continua template não preenchido. **PASS por vacuidade**.

Princípios sugeridos honrados:
- **CLI-First**: ✅ comandos verbais (start/done/stop/trans/move) com pipe-ready.
- **Test-First**: ✅ testes precedem implementação.
- **Simplicity**: ✅ sem retry, sem cache, sem state.

## Project Structure

### Documentation (this feature)

```text
specs/003-workflow-transitions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli-surface.md
│   └── jira-api.md
└── tasks.md           # Phase 2 (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── ... (001 + 002 sem mudança)
├── jira/
│   ├── key.ts                   # já existe
│   ├── issues.ts                # já existe (não usado aqui)
│   ├── patterns.ts              # NOVO: getPattern(kind: 'start'|'done'|'stop'): RegExp
│   └── transitions.ts           # NOVO: listTransitions, applyTransition, findTransition
└── commands/
    ├── ... (001 + 002 sem mudança)
    ├── start.ts                 # NOVO
    ├── done.ts                  # NOVO
    ├── stop.ts                  # NOVO
    ├── trans.ts                 # NOVO
    └── move.ts                  # NOVO

tests/
├── jira/
│   ├── patterns.test.ts
│   └── transitions.test.ts
└── commands/
    ├── start.test.ts
    ├── done.test.ts
    ├── stop.test.ts
    ├── trans.test.ts
    └── move.test.ts
```

**Structure Decision**: continuação de single-project. Toda lógica de pattern matching encapsulada em `patterns.ts`; comandos delegam descoberta de transição para `findTransition` em `transitions.ts`. Comandos são finos (orquestram + formatam saída).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sem violações.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
