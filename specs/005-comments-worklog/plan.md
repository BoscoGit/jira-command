# Implementation Plan: Comentários e Registro de Tempo

**Branch**: `005-comments-worklog` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-comments-worklog/spec.md`

## Summary

Feature 005 entrega cinco comandos de comentários e worklog reutilizando 001+002+003+004:

- `jira comment <KEY> "<TEXTO>"` — adiciona comentário (P1, pipe-ready Key).
- `jira comments <KEY>` — lista 50 comentários mais recentes (P2, pipe-ready).
- `jira comment-del <KEY> <ID> [--yes]` — deleta com confirmação (P3, pipe-ready).
- `jira log <KEY> <TEMPO> [DESCRICAO]` — registra worklog (P1, pipe-ready Key).
- `jira logs <KEY>` — lista worklogs (P2, pipe-ready).

Adiciona três módulos:
- `src/jira/comments.ts` — REST de comentários (`createComment`, `listComments`, `deleteComment`).
- `src/jira/worklog.ts` — REST de worklog (`createWorklog`, `listWorklog`).
- `src/platform/prompt.ts` — `confirmInteractive(question)` via readline (testável).
- `src/format/preview.ts` — `previewText(text, max)` helper reusável (corrige bug `...` do PowerShell).

## Technical Context

**Language/Version**: TypeScript 5.6+, Node 22 LTS, ESM (continuação 001..004).
**Primary Dependencies** (todas presentes):
- Runtime: `citty`, `picocolors`, `undici`. **Sem novas deps.**
- Dev: `typescript`, `tsx`, `vitest`, `@biomejs/biome`, `@types/node`, `@vitest/coverage-v8`.

**Integrações novas**:
- `node:readline` para `confirmInteractive` (builtin Node).

**Storage**: N/A.
**Testing**: vitest. Comandos mockam funções de `jira/comments.ts`/`jira/worklog.ts` e `platform/prompt.ts`.
**Target Platform**: Node 22, Win/Linux/macOS.
**Project Type**: CLI single-project.
**Performance Goals**:
- `comment` / `log`: 1 chamada HTTP, < 3s (CS-001).
- `comments` / `logs`: 1 chamada GET.
- `comment-del`: 1 chamada DELETE (após confirmação).

**Constraints**:
- `comment-del` SEM `--yes` em modo interativo → prompt; SEM `--yes` em pipe → exit 2 (CS-002).
- Texto vazio em `comment` → exit 2 antes do POST.
- Preview com `...` apenas quando truncou (RF-002, RF-005).

**Scale/Scope**: 5 comandos novos, ~300-400 LoC src + ~500 LoC tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua template não preenchido. **PASS por vacuidade**.

## Project Structure

### Documentation (this feature)

```text
specs/005-comments-worklog/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli-surface.md
│   └── jira-api.md
└── tasks.md           # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── ... (001..004 sem mudança)
├── format/
│   ├── table.ts                  # já existe
│   └── preview.ts                # NOVO: previewText(text, max)
├── jira/
│   ├── ... (key, issues, patterns, transitions, edit já existem)
│   ├── comments.ts               # NOVO
│   └── worklog.ts                # NOVO
├── platform/
│   ├── ... (browser, fzf, editor já existem)
│   └── prompt.ts                 # NOVO
└── commands/
    ├── ... (já existentes)
    ├── comment.ts                # NOVO
    ├── comments.ts               # NOVO
    ├── comment-del.ts            # NOVO
    ├── log.ts                    # NOVO
    └── logs.ts                   # NOVO

tests/
├── format/
│   └── preview.test.ts
├── jira/
│   ├── comments.test.ts
│   └── worklog.test.ts
├── platform/
│   └── prompt.test.ts
└── commands/
    ├── comment.test.ts
    ├── comments.test.ts
    ├── comment-del.test.ts
    ├── log.test.ts
    └── logs.test.ts
```

**Structure Decision**: continuação de single-project. Cliente REST encapsulado em `jira/comments.ts` e `jira/worklog.ts`. Confirmation prompt isolado em `platform/prompt.ts` (mesmo padrão de `editor.ts`). Preview helper em `format/preview.ts`.

## Complexity Tracking

Sem violações.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
