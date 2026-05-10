# Implementation Plan: Criação e Gerenciamento de Issues

**Branch**: `006-create-manage` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-create-manage/spec.md`

## Summary

Última feature do MVP — fecha o port do `jira.ps1`. Sete comandos de criação e descoberta:

- `jira new --project <P> --summary "<S>" [--type Task] [--desc] [--priority] [--assignee] [--quiet]` — cria issue (P1).
- `jira sub --parent <K> --summary "<S>" [--type Sub-task] [--desc] [--assignee] [--quiet]` — cria subtask herdando projeto (P2).
- `jira subs <KEY>` — lista subtasks (P2, pipe-ready).
- `jira link --from <F> --type <T> --to <TO>` — cria link entre issues (P2).
- `jira links <KEY>` — lista links (P2, pipe-ready).
- `jira projects [--all]` — lista projetos do usuário (default) ou todos (P3).
- `jira users <PROJETO> [--filter <T>]` — lista usuários atribuíveis (P3).

Adiciona quatro módulos REST:
- `src/jira/create.ts` — `createIssue`, `getSubtasks`, `getParentProject`.
- `src/jira/links.ts` — `createLink`, `getIssueLinks`.
- `src/jira/projects.ts` — `listAllProjects`, `listMyProjects`.
- `src/jira/users.ts` — `listAssignableUsers` (com filter ou a-z scan paralelo).

## Technical Context

**Language/Version**: TypeScript 5.6+, Node 22 LTS, ESM (continuação 001..005).
**Primary Dependencies** (todas presentes):
- Runtime: `citty`, `picocolors`, `undici`. **Sem novas deps.**
- Dev: `typescript`, `tsx`, `vitest`, `@biomejs/biome`, `@types/node`, `@vitest/coverage-v8`.

**Storage**: N/A.
**Testing**: vitest. Comandos mockam módulos `jira/*`.
**Target Platform**: Node 22, Win/Linux/macOS.
**Project Type**: CLI single-project.
**Performance Goals**:
- `new`/`sub`/`link`: 1-2 chamadas HTTP, < 3s.
- `subs`/`links`: 1 chamada GET.
- `projects --all`: 1 chamada GET.
- `projects` (sem --all): 1 chamada search com `maxResults=500`.
- `users --filter`: 1 chamada (CS-002 < 3s).
- `users` (sem filter): 26 chamadas paralelas (`Promise.all`) — < 5s típico.

**Constraints**:
- `sub` faz 2 chamadas (GET parent project + POST issue).
- `users` sem filter dedupplica por `username` (Map).
- `projects` (sem --all) avisa em stderr quando JQL truncou (>500 issues).
- `--quiet` em `new`/`sub` emite apenas Key em stdout (RF-002, CS-004).
- `--json` global prevalece sobre `--quiet` (RF-011 da 001).

**Scale/Scope**: 7 comandos novos, ~500-700 LoC src + ~700 LoC tests. Última feature do MVP.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua template não preenchido. **PASS por vacuidade**.

## Project Structure

### Documentation (this feature)

```text
specs/006-create-manage/
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
├── ... (001..005 sem mudança)
├── jira/
│   ├── ... (key, issues, patterns, transitions, edit, comments, worklog já existem)
│   ├── create.ts                 # NOVO
│   ├── links.ts                  # NOVO
│   ├── projects.ts               # NOVO
│   └── users.ts                  # NOVO
└── commands/
    ├── ... (já existentes)
    ├── new.ts                    # NOVO
    ├── sub.ts                    # NOVO
    ├── subs.ts                   # NOVO
    ├── link.ts                   # NOVO
    ├── links.ts                  # NOVO
    ├── projects.ts               # NOVO
    └── users.ts                  # NOVO

tests/
├── jira/
│   ├── create.test.ts
│   ├── links.test.ts
│   ├── projects.test.ts
│   └── users.test.ts
└── commands/
    ├── new.test.ts
    ├── sub.test.ts
    ├── subs.test.ts
    ├── link.test.ts
    ├── links.test.ts
    ├── projects.test.ts
    └── users.test.ts
```

**Structure Decision**: continuação de single-project. 4 módulos REST novos em `src/jira/` para isolar endpoints distintos (issue creation, links, projects, users). Comandos thin wrappers como em features anteriores.

## Complexity Tracking

Sem violações.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
