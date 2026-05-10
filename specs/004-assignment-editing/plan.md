# Implementation Plan: Atribuição e Edição de Campos

**Branch**: `004-assignment-editing` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-assignment-editing/spec.md`

## Summary

Feature 004 entrega sete comandos de edição sobre campos básicos da issue, todos reutilizando 001 + 002 + 003:

- `jira assign <KEY> [--user <USERNAME>] [--quiet]` — atribui ao usuário (default = autenticado) — P1, pipe-ready.
- `jira unassign <KEY>` — remove responsável — P2, pipe-ready.
- `jira prio <KEY> <PRIORIDADE>` — altera prioridade — P2.
- `jira summary <KEY> "<TITULO>"` — altera título — P2.
- `jira label <KEY> <LABEL>` — adiciona label preservando existentes — P3.
- `jira label-del <KEY> <LABEL>` — remove label específica — P3.
- `jira desc <KEY>` — abre descrição em editor externo, salva se houver alteração — P3, exige TTY.

Adiciona dois módulos:
- `src/jira/edit.ts` — funções REST de edição (`updateAssignee`, `updateField`, `addLabel`, `removeLabel`, `getDescription`, `resolveAssignee`).
- `src/platform/editor.ts` — `openEditor(path): Promise<void>` cross-platform via `$EDITOR`/`$VISUAL`/SO default.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node 22 LTS, ESM (continuação 001/002/003).
**Primary Dependencies** (todas presentes):
- Runtime: `citty`, `picocolors`, `undici`. **Sem novas deps.**
- Dev: `typescript`, `tsx`, `vitest`, `@biomejs/biome`, `@types/node`, `@vitest/coverage-v8`.

**Integrações novas**:
- Editor externo (`$EDITOR` / `$VISUAL` / `notepad.exe` / `nano` / `vi`) via `child_process.spawn` (mesmo padrão de `platform/browser.ts` da 002).
- Filesystem (tmp file) via `node:fs` + `os.tmpdir()`.

**Storage**: tmp file efêmero apenas para `jira desc` (criado em `os.tmpdir()`, removido sempre via `try/finally` ou via `signal` da 001).
**Testing**: vitest. Comandos mockam funções de `jira/edit.ts` e `platform/editor.ts` via `vi.spyOn`.
**Target Platform**: Node 22, Win/Linux/macOS.
**Project Type**: CLI single-project.
**Performance Goals**: cada comando ≤ 2 chamadas HTTP. `assign me` faz 2 chamadas (myself + PUT) na primeira chamada e cacheia o nome do usuário em runtime.

**Constraints**:
- `assign --user me` resolve `me` lendo `/rest/api/2/myself` UMA vez (cache em memória do processo).
- `label`/`label-del` usam `update` operation (não `fields`) para não sobrescrever labels existentes (CS-002).
- `desc` valida TTY antes de criar tmp file (RF-010).
- `desc` registra tmp file via `registerTmpFile` da 001 (cleanup em SIGINT — RF-026 da 001).
- Editor exit code != 0 → não faz PUT (RF-009).
- Comparação de descrição: trim apenas `\r`/`\n` finais (RF-007 letra d).
- `assign` aceita `--quiet` (RF-001 deste spec + RF-010 da 001).

**Scale/Scope**: 7 comandos novos, ~400-500 LoC src + ~600 LoC tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua template não preenchido. **PASS por vacuidade**.

Princípios honrados:
- **CLI-First**: ✅ stdout/stderr separados, `--json`/`--quiet` consistentes.
- **Test-First**: ✅ TDD por US.
- **Simplicity**: ✅ sem retry, sem cache de longo prazo (só `me` em memória), sem state persistente.

## Project Structure

### Documentation (this feature)

```text
specs/004-assignment-editing/
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
├── ... (001 + 002 + 003 sem mudança)
├── jira/
│   ├── key.ts                    # já existe
│   ├── issues.ts                 # já existe
│   ├── patterns.ts               # já existe
│   ├── transitions.ts            # já existe
│   └── edit.ts                   # NOVO
├── platform/
│   ├── browser.ts                # já existe
│   ├── fzf.ts                    # já existe
│   └── editor.ts                 # NOVO
└── commands/
    ├── ... (001 + 002 + 003 sem mudança)
    ├── assign.ts                 # NOVO
    ├── unassign.ts               # NOVO
    ├── prio.ts                   # NOVO
    ├── summary.ts                # NOVO
    ├── label.ts                  # NOVO
    ├── label-del.ts              # NOVO
    └── desc.ts                   # NOVO

tests/
├── jira/
│   └── edit.test.ts
├── platform/
│   └── editor.test.ts
└── commands/
    ├── assign.test.ts
    ├── unassign.test.ts
    ├── prio.test.ts
    ├── summary.test.ts
    ├── label.test.ts
    ├── label-del.test.ts
    └── desc.test.ts
```

**Structure Decision**: continuação de single-project. Edição encapsulada em `jira/edit.ts` (funções pequenas, todas recebem `config` explícito); editor externo em `platform/editor.ts` (mesmo padrão de `browser.ts`/`fzf.ts`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sem violações.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
