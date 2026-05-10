# Implementation Plan: Consulta de Issues

**Branch**: `002-issue-browsing` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-issue-browsing/spec.md`

## Summary

Feature 002 entrega seis comandos de leitura sobre a API Jira, todos reutilizando a fundação da feature 001 (`config`, `http`, `output`, `stdin`, `errors`):

- `jira mine` — issues abertas atribuídas ao usuário (P1).
- `jira get <KEY>` — detalhes + 10 comentários (P1, pipe-ready via stdin).
- `jira find "<JQL>"` — busca livre via JQL com `--limit` (P2).
- `jira status "<STATUS>"` — minhas issues filtradas por status (P2).
- `jira open <KEY>` — abre issue no browser (P3, pipe-ready).
- `jira pick` — picker interativo via `fzf`, retorna Key no stdout (P3).

Adiciona dois módulos novos: `src/format/table.ts` (tabela alinhada para humano + integração com `--json`) e `src/jira/issues.ts` (chamadas REST encapsuladas: search, get issue, get comments). Demais arquivos estendem `commands/`.

## Technical Context

**Language/Version**: TypeScript 5.6+ (já estabelecido em 001), ES2022, Node 22 LTS, ESM puro.
**Primary Dependencies** (todas já presentes da 001):
- Runtime: `citty`, `picocolors`, `undici`. **Sem novas deps.**
- Dev: `typescript`, `tsx`, `vitest`, `@biomejs/biome`, `@types/node`, `@vitest/coverage-v8`.

**Integrações externas novas**:
- `fzf` (binário externo opcional, executado via `child_process.spawn`). Detectado via tentativa de spawn (ENOENT → mensagem amigável).
- `Start-Process`/`open`/`xdg-open` para abrir browser (multiplataforma).

**Storage**: N/A (stateless, mesmo da 001).
**Testing**: vitest com mocks de `fetch` via `vi.stubGlobal('fetch', mock)`. Para `fzf` mockamos `child_process.spawn`; para `open` mockamos a função wrapper de open browser.
**Target Platform**: Node 22, Windows / Linux / macOS. Detecta SO em runtime para escolher `start`/`xdg-open`/`open`.
**Project Type**: CLI single-project (continuação da 001).
**Performance Goals**:
- `jira mine` retorna em < 3s para até 50 issues (CS-001 do spec).
- `jira get <KEY>` em ≤ 2 chamadas HTTP (CS-002 ajustado em revisão).
- `jira pick` carrega menu fzf em < 1s para 50 issues.

**Constraints**:
- `fzf` é dependência opcional (premise do spec). Comandos não-pick funcionam sem ele.
- Saída JSON e quiet seguem padrões da 001 (RF-009/019 globais).
- Pipe via stdin (RF-012) ativo em comandos com `<KEY>` posicional: `get`, `open`.
- Validação Key local (regex `^[A-Z][A-Z0-9_]+-\d+$`) antes de qualquer chamada HTTP — RF-008 deste spec; reutilizável por outras features.

**Scale/Scope**: 6 comandos novos. ~400-600 LoC adicionais em src + ~600 LoC de testes. Aproveita 95%+ da foundation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição em `.specify/memory/constitution.md` permanece como template não preenchido. Gate **PASS por vacuidade** — sem regras a violar (mesmo status que 001).

Princípios sugeridos honrados implicitamente:
- **CLI-First**: ✅ stdout/stderr separados, `--json`/`--quiet` consistentes com 001.
- **Test-First**: ✅ cada comando ganha teste antes da implementação (TDD).
- **Simplicity / YAGNI**: ✅ sem retry, sem cache, sem state local; nenhuma camada de abstração nova além do necessário.

## Project Structure

### Documentation (this feature)

```text
specs/002-issue-browsing/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Issue, Comment, JQL, Pick)
├── quickstart.md        # Phase 1 output (passos de validação manual)
├── contracts/           # Phase 1 output
│   ├── cli-surface.md   # comandos novos, flags, stdin, exit codes
│   └── jira-api.md      # GET /search, GET /issue/{key}, GET /issue/{key}/comment
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── cli.ts                    # entry — sem mudança
├── config.ts                 # sem mudança
├── http.ts                   # sem mudança
├── errors.ts                 # sem mudança
├── output.ts                 # sem mudança
├── stdin.ts                  # sem mudança (resolveKeys já implementado)
├── signal.ts                 # sem mudança
├── version.ts                # sem mudança
├── format/
│   └── table.ts              # NOVO: writeTable(rows, columns, opts) — alinha colunas
├── jira/
│   ├── key.ts                # NOVO: validateKey, KEY_REGEX
│   └── issues.ts             # NOVO: searchIssues, getIssue, getIssueComments
├── platform/
│   ├── browser.ts            # NOVO: openInBrowser(url) — Win/macOS/Linux
│   └── fzf.ts                # NOVO: pickWithFzf(lines): Promise<string | null>
└── commands/
    ├── me.ts                 # já existe
    ├── root.ts               # adiciona registro dos 6 novos comandos
    ├── mine.ts               # NOVO: jira mine
    ├── get.ts                # NOVO: jira get (pipe-ready)
    ├── find.ts               # NOVO: jira find
    ├── status.ts             # NOVO: jira status
    ├── open.ts               # NOVO: jira open (pipe-ready)
    └── pick.ts               # NOVO: jira pick

tests/
├── format/
│   └── table.test.ts
├── jira/
│   ├── key.test.ts
│   └── issues.test.ts
├── platform/
│   ├── browser.test.ts
│   └── fzf.test.ts
└── commands/
    ├── mine.test.ts
    ├── get.test.ts
    ├── find.test.ts
    ├── status.test.ts
    ├── open.test.ts
    └── pick.test.ts
```

**Structure Decision**: Single-project, mesma raiz de 001. Pastas `src/jira/` (cliente REST encapsulado) e `src/platform/` (binários externos / SO) introduzidas para isolar dependências externas e facilitar mocks. Sem refactor invasivo dos módulos existentes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sem violações.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
