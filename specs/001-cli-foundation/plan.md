# Implementation Plan: Fundação do CLI

**Branch**: `001-cli-foundation` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cli-foundation/spec.md`

## Summary

Foundation do CLI `jira` em TypeScript ESM (Node 22 LTS) que substitui `C:\Users\bosco\jira.ps1`. Esta feature entrega: configuração via variáveis de ambiente (`JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_INSECURE`, `JIRA_TIMEOUT`), bypass SSL para Jira corporativo on-premise, ajuda global e por subcomando, saída humana / JSON / quiet, leitura de Keys via stdin para pipelines, mapeamento de erros HTTP/Jira para mensagens acionáveis, exit codes granulares (0-6, 130 SIGINT), suporte a `--version` / `NO_COLOR` / Ctrl+C com cleanup, e header `User-Agent` identificando a ferramenta. Único comando funcional entregue na 001 é `jira me` (validação de token via `/rest/api/2/myself`); demais features (002-006) reusam toda essa fundação.

## Technical Context

**Language/Version**: TypeScript 5.6+, target ES2022, Node 22 LTS (`"type": "module"`)
**Primary Dependencies**:
- Runtime: `citty` (CLI parser, ESM-first), `picocolors` (cores). `undici` Agent via Node builtin (não declarado em deps).
- Dev: `typescript`, `tsx` (run dev), `vitest` (tests), `@biomejs/biome` (lint+format), `@types/node`.

**Storage**: N/A — CLI stateless. Estado único: variáveis de ambiente do processo. Arquivos temporários (`jira desc`) em `os.tmpdir()` removidos ao fim ou em SIGINT.
**Testing**: `vitest` (unit + integration). Testes co-localizados não — preferência por `tests/` paralelo a `src/`.
**Target Platform**: Node.js 22 LTS em Windows 11 (alvo primário do user), Linux, macOS. Distribuição MVP via `npm link` local; publicação npm/GitHub Packages após validação.
**Project Type**: CLI single-project. Pacote npm com `bin: { "jira": "./dist/cli.js" }`.
**Performance Goals**: Cold start `jira --version` < 500ms (sem rede); `jira me` < 3s em rede saudável; nenhuma chamada extra além do necessário.
**Constraints**:
- Bearer-only auth (RF-017/018) — sem Basic/OAuth.
- UTF-8 forçado no stdout/stderr para acentos PT-BR em Windows (RF-024).
- Zero retry automático (RF-022).
- Cores desativadas se stdout não-TTY ou `NO_COLOR` setado (RF-025).
- Help/version não exigem token (RF-021).

**Scale/Scope**: 32 comandos planejados em 6 features; esta foundation entrega o esqueleto reusado por todas. ~600-800 LoC TypeScript estimado para 001 (config, http, errors, output, stdin, cli, comando `me` mais testes).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constituição em `.specify/memory/constitution.md` é o template default (placeholders `[PRINCIPLE_*]` não preenchidos). Sem princípios concretos definidos para o projeto, esta gate é considerada **PASS por vacuidade** — não há regras a violar.

Princípios típicos que seriam honrados se preenchidos:
- **CLI-First (sugestão de princípio)**: ✅ Foundation é, por construção, um CLI text-in/text-out com stdout/stderr separados, suporte a `--json` e `--quiet`.
- **Test-First (sugestão de princípio)**: ✅ Plano prevê vitest com cobertura de cada módulo (`config`, `http`, `errors`, `output`, `stdin`).
- **Simplicity / YAGNI (sugestão de princípio)**: ✅ Sem retry, sem cache, sem state local, sem Basic/OAuth — escopo mínimo.

**Action item futuro** (fora do escopo da 001): preencher `constitution.md` com princípios reais do projeto após MVP. Adiar para o `/speckit-constitution` em momento oportuno.

## Project Structure

### Documentation (this feature)

```text
specs/001-cli-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (entidades de domínio + config)
├── quickstart.md        # Phase 1 output (passos de validação manual)
├── contracts/           # Phase 1 output
│   ├── cli-surface.md   # forma do CLI (flags globais, exit codes, env vars)
│   └── jira-api.md      # contratos REST consumidos (myself, error schema)
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── cli.ts                    # entry point: define commands com citty, runMain
├── config.ts                 # parse env, validate, normalize JIRA_BASE_URL
├── http.ts                   # fetch wrapper + undici Agent (SSL bypass) + UA + timeout
├── errors.ts                 # JiraError class, mapping HTTP/Jira -> exit code + mensagem
├── output.ts                 # tabela | json | quiet writers, cores, NO_COLOR detect
├── stdin.ts                  # leitura não-bloqueante de Keys, trim, skip blanks
├── signal.ts                 # SIGINT handler: abort fetch + cleanup tmp files + exit 130
├── version.ts                # lê versão do package.json (import attribute JSON)
└── commands/
    └── me.ts                 # único comando da 001: GET /rest/api/2/myself

tests/
├── config.test.ts
├── http.test.ts
├── errors.test.ts
├── output.test.ts
├── stdin.test.ts
├── version.test.ts
└── commands/
    └── me.test.ts

# raiz
package.json                  # type: module, bin: { jira: ./dist/cli.js }, scripts dev/build/test/lint
tsconfig.json                 # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + noImplicitOverride
biome.json                    # lint + formatter unified
vitest.config.ts              # config mínima
.github/workflows/ci.yml      # lint + tests + build em PR
```

**Structure Decision**: Single-project CLI. Sem split frontend/backend, sem mobile. Layout `src/` (código) + `tests/` (testes paralelos) decidido no round 2 de stack. Cada módulo pequeno, responsabilidade única, importável isoladamente para teste.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sem violações — Constitution Check passou por vacuidade. Tabela vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |
