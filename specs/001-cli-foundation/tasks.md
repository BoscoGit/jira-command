---
description: "Task list for 001 — Fundação do CLI (jira-command)"
---

# Tasks: Fundação do CLI

**Input**: Design documents from `/specs/001-cli-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: Incluídos. Stack `vitest` definida no plan e quickstart V13 exige `npm run test` verde. Cada US ganha um conjunto de testes específicos antes/junto da implementação.

**Organization**: Tarefas agrupadas por user story, em ordem de prioridade (P1 → P2 → P3). Mapeamento:

| Phase | User Story | História do spec | Prioridade |
|-------|------------|------------------|------------|
| 3 | US1 | História 1 — Configurar credenciais e usar `jira me` | P1 (MVP) |
| 4 | US2 | História 2 — SSL auto-assinado | P2 |
| 5 | US3 | História 4 — Saída humano/JSON/quiet | P2 |
| 6 | US4 | História 5 — Pipeline stdin | P2 |
| 7 | US5 | História 3 — Help / version / discovery | P3 |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência em tarefa incompleta)
- **[Story]**: rótulo de user story (US1..US5); ausente em Setup/Foundational/Polish
- Caminhos absolutos relativos à raiz: `D:\Sistemas\boscogit\jira-command`

## Path Conventions

- Single project. `src/` (código), `tests/` (vitest), raiz para configs.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: scaffold do projeto TypeScript ESM, configs de build/lint/test/CI.

- [ ] T001 Criar layout do projeto: pastas `src/`, `src/commands/`, `tests/`, `tests/commands/`, `.github/workflows/` na raiz do repo
- [ ] T002 Criar `package.json` na raiz com `"type": "module"`, `"engines.node": ">=22"`, `"bin": { "jira": "./dist/cli.js" }`, scripts `dev` (`tsx src/cli.ts`), `build` (`tsc`), `test` (`vitest run`), `test:watch` (`vitest`), `lint` (`biome check .`), `format` (`biome format --write .`), `typecheck` (`tsc --noEmit`), `prepack` (`npm run build`)
- [ ] T003 Adicionar dependências runtime via `npm install citty picocolors` na raiz
- [ ] T004 Adicionar devDependencies via `npm install -D typescript tsx vitest @biomejs/biome @types/node` na raiz
- [ ] T005 [P] Criar `tsconfig.json` na raiz com `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `outDir: dist`, `rootDir: src`, `resolveJsonModule: true`, `declaration: false`, exclude `tests`, `dist`, `node_modules`
- [ ] T006 [P] Criar `biome.json` na raiz com linter+formatter habilitados, regras `recommended`, indent `space` 2, line width 100, ignorando `dist`, `node_modules`, `coverage`
- [ ] T007 [P] Criar `vitest.config.ts` na raiz com `globals: false`, `environment: 'node'`, `include: ['tests/**/*.test.ts']`, coverage provider `v8`
- [ ] T008 [P] Criar `.github/workflows/ci.yml` com job rodando em `ubuntu-latest`, Node 22, steps `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, em `push` na main e em `pull_request`
- [ ] T009 [P] Criar `tests/setup.ts` (vazio por enquanto, reservado para hooks globais futuros) e referenciar em `vitest.config.ts` via `setupFiles`

**Checkpoint Phase 1**: rodar `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` — devem todos passar (sem código ainda → vazio mas sem erro de config).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: módulos cross-cutting consumidos por TODAS as user stories. Inclui config, http, errors, output, stdin, signal, version, root command e o entrypoint do CLI.

**⚠️ CRITICAL**: Nenhum trabalho de US pode iniciar antes desta fase concluir.

- [ ] T010 [P] Criar `src/version.ts` que lê `version` do `package.json` via JSON import attribute (`with { type: 'json' }`) e exporta constante `VERSION` (RF-020)
- [ ] T011 [P] Criar `src/output.ts` exportando `humanLog(stream, msg, color?)`, `humanError(msg)`, `jsonOut(obj)`, `quietOut(key)`, helpers de cores via `picocolors` respeitando `NO_COLOR`, `--no-color` e detecção `process.stdout.isTTY` (RF-024/025); cores DEVEM ser desativadas em qualquer uma dessas três condições
- [ ] T012 [P] Criar `src/stdin.ts` exportando `readKeysFromStdin(): Promise<string[]>` que lê `process.stdin` quando `!process.stdin.isTTY`, faz split por linha (`\r\n|\n`), `trim()`, descarta strings vazias e retorna o array (RF-012)
- [ ] T013 [P] Criar `src/errors.ts` com classe `JiraError extends Error` (campos `exitCode: number`, `action?: string`, `httpStatus?: number`, `statusText?: string`, `cause?: unknown`) e função `mapHttpToError(status, statusText, body): JiraError` que aplica o mapeamento da seção E2 do `data-model.md` (401→3, 403→5, 404→4, demais→1) (RF-008)
- [ ] T014 Estender `src/errors.ts` com `parseJiraErrorBody(body, contentType, status, statusText): string` aplicando a estratégia da seção 2.4 de `contracts/jira-api.md`: (a) JSON com `errorMessages` (b) JSON com `errors` field-map (c) genérico `HTTP <status> <statusText>` para body não-JSON, vazio ou schema desconhecido. NUNCA retornar HTML/JSON cru (RF-013)
- [ ] T015 Criar `src/config.ts` exportando `loadConfig(): Config` que lê `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_INSECURE` (apenas string `"true"` case-insensitive ativa — RF-003), `JIRA_TIMEOUT` (segundos → ms, default 30000), normaliza `JIRA_BASE_URL` removendo barras finais (RF-004), valida URL via `new URL()`, lança `JiraError` exitCode 2 com mensagem RF-002 quando obrigatórios ausentes; expõe também `loadConfigForApi()` que valida obrigatórios e `loadConfigPermissive()` que pula validação para `--help`/`--version` (RF-021); congela com `Object.freeze` (depende T013)
- [ ] T016 Criar `src/signal.ts` separando lógica pura de efeito colateral (mesmo padrão T018↔T019): expor (a) `AbortController` global e `getSignal()` para fetch, (b) `registerTmpFile(path)` / `unregisterTmpFile(path)`, (c) função pura `handleSigint(): number` que aborta o controller, remove tmp files registrados via `fs.rmSync(..., { force: true })` e RETORNA `130` (sem chamar `process.exit`), (d) função de wiring `installSigintHandler()` que faz `process.on('SIGINT', () => process.exit(handleSigint()))`. Testes importam `handleSigint` e validam efeitos sem encerrar o processo de teste; `installSigintHandler` é chamado apenas em `cli.ts` (RF-026)
- [ ] T017 Criar `src/http.ts` exportando `jiraFetch(path, init?): Promise<Response>` que: (a) aplica `setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }))` uma única vez se `config.insecure` (RF-003), (b) prefixa `path` com `config.baseUrl`, (c) injeta headers `Authorization: Bearer <token>` (RF-017), `User-Agent: jira-cli/<VERSION> (Node/<process.version>)` (RF-023), `Accept: application/json`, e `Content-Type: application/json` quando há body, (d) configura `signal` via `AbortController` com timeout `config.timeoutMs` (RF-007), (e) traduz `AbortError` e `TypeError` (rede) em `JiraError` exitCode 6, (f) detecta erro TLS sem `JIRA_INSECURE` e lança `JiraError` exitCode 1 com mensagem da H2 critério 3 (RF-014); NÃO retenta requisições (RF-022). Depende T013, T014, T015, T016
- [ ] T018 Criar `src/commands/root.ts` exportando `rootCommand` via `citty.defineCommand` com flags globais `--json` (boolean), `--no-color` (boolean), `--help/-h`, `--version/-V`; declara o objeto `subCommands` (vazio por enquanto, preenchido em T026 via registro do `me`); implementa o catch global que serializa `JiraError` em humano (RF-008) ou `--json` (RF-019 envelope `{ ok:false, error, exitCode }`) e propaga `process.exitCode` (sem chamar `process.exit` — preserva testabilidade); intercepta `--help`/`--version` ANTES de carregar config (RF-021); handler de comando desconhecido emite a mensagem da H3 critério 3 e seta `exitCode = 2`. Depende T010, T011, T013, T015
- [ ] T019 Criar `src/cli.ts` como entrypoint fino: shebang `#!/usr/bin/env node` na primeira linha, `import { rootCommand } from './commands/root.js'`, `import { installSigintHandler } from './signal.js'`, `import { runMain } from 'citty'`; chama `installSigintHandler()` UMA VEZ e depois `runMain(rootCommand)`. Sem lógica de domínio aqui — apenas efeitos colaterais de inicialização; testes JAMAIS importam este arquivo. Depende T016, T018

**Checkpoint Phase 2**: `npm run typecheck` limpo. Todos os módulos importáveis. Execução de `npm run dev -- --help` mostra help vazio sem erro de env. Execução de `npm run dev -- --version` imprime versão.

---

## Phase 3: User Story 1 — Configurar credenciais e usar `jira me` (Priority: P1) 🎯 MVP

**Goal**: usuário define `JIRA_TOKEN` e `JIRA_BASE_URL`, executa `jira me`, recebe nome+email do usuário autenticado.

**Independent Test**: `quickstart.md` V2 (env vars ausentes), V4 (happy path), V5 (token inválido), V6 (`--json`), V12 (timeout). Mapeia para spec História 1 e edge cases de timeout.

### Tests for User Story 1

> Escrever os testes ANTES da implementação do comando `me` (T025). Devem falhar inicialmente (módulos chamados retornam vazio).

- [ ] T020 [P] [US1] Criar `tests/config.test.ts` cobrindo: (a) ausência de `JIRA_TOKEN` → JiraError exitCode 2 com mensagem RF-002, (b) ausência de `JIRA_BASE_URL` → idem, (c) `JIRA_BASE_URL` com barras finais → normalizada (RF-004), (d) `JIRA_INSECURE` aceita apenas `"true"` case-insensitive (RF-003): testa `true`, `TRUE`, `True` ativos; `1`, `yes`, `on`, `false`, vazio, undefined → não ativa, (e) `JIRA_TIMEOUT` válido vs inválido (negativo, NaN), (f) `loadConfigPermissive()` não falha sem env vars (RF-021)
- [ ] T021 [P] [US1] Criar `tests/errors.test.ts` cobrindo: (a) `mapHttpToError` para 401→3, 403→5, 404→4, 500→1, (b) `parseJiraErrorBody` com payload `errorMessages: ["X"]` → "X", (c) com `errors: { summary: "obrig" }` → "summary: obrig", (d) sem ambos → mensagem genérica RF-013, (e) HTML de proxy → genérica sem despejar HTML, (f) body vazio → genérica
- [ ] T022 [P] [US1] Criar `tests/http.test.ts` cobrindo: (a) header `Authorization: Bearer <token>` presente em request (mock via `vi.spyOn(globalThis, 'fetch')`), (b) header `User-Agent: jira-cli/<VERSION> (Node/<version>)` presente (RF-023), (c) timeout dispara `JiraError` exitCode 6 quando excedido (`vi.useFakeTimers`), (d) status 401 dispara `JiraError` exitCode 3, (e) sem retry (chama fetch exatamente 1× mesmo em falha)
- [ ] T023 [P] [US1] Criar `tests/version.test.ts` validando `VERSION` igual ao `package.json#version`
- [ ] T024 [P] [US1] Criar `tests/commands/me.test.ts` cobrindo: (a) saída humana contém "Logado como: <displayName> <<email>>", "Username", "Key" (mock fetch retornando payload de `contracts/jira-api.md` §1), (b) `--json` emite objeto com chaves `name`, `displayName`, `emailAddress`, `key` em stdout (capturando via `vi.spyOn(process.stdout, 'write')`), (c) 401 propaga mensagem RF-001/H1-4 e exitCode 3

### Implementation for User Story 1

- [ ] T025 [US1] Criar `src/commands/me.ts` exportando `meCommand` via `citty.defineCommand`: chama `jiraFetch('/rest/api/2/myself')`, parseia JSON, em modo padrão chama `humanLog(process.stdout, ...)` com display name/email/username/key (cores via picocolors), em modo `--json` chama `jsonOut({ name, displayName, emailAddress, key })`; carrega config via `loadConfigForApi()`. Depende T015, T017, T011
- [ ] T026 [US1] Em `src/commands/root.ts`, registrar `meCommand` no objeto `subCommands` do root e adicionar exemplo na descrição/`meta` (RF-006)
- [ ] T027 [US1] Validar manualmente passos V2, V4, V5, V6, V12 do `quickstart.md` em terminal local com Jira real

**Checkpoint US1**: `npm run test` verde. `jira me` funciona contra Jira real. MVP entregue.

---

## Phase 4: User Story 2 — SSL auto-assinado (Priority: P2)

**Goal**: ambiente corporativo com cert auto-assinado funciona com `JIRA_INSECURE=true`.

**Independent Test**: `quickstart.md` V7 (três cenários: `true` ativa, `1` não ativa, `TRUE` ativa).

Implementação principal já vive em `T015` (config) + `T017` (http). Fase entrega validação dedicada.

### Tests for User Story 2

- [ ] T028 [P] [US2] Estender `tests/http.test.ts` (ou criar `tests/http.ssl.test.ts`) cobrindo: (a) com `config.insecure=true`, `setGlobalDispatcher` é chamado com Agent permissivo (mock undici), (b) com `config.insecure=false`, dispatcher default permanece, (c) erro TLS (simular código `'CERT_HAS_EXPIRED'` ou `'DEPTH_ZERO_SELF_SIGNED_CERT'`) sem `JIRA_INSECURE` produz mensagem RF-014/H2-3 e exitCode 1, (d) erro TLS com `JIRA_INSECURE=true` definido NÃO produz mensagem de SSL (porque bypass está ativo)

### Implementation for User Story 2

- [ ] T029 [US2] Confirmar que `src/http.ts` (T017) detecta erros TLS via `error.code` em `'DEPTH_ZERO_SELF_SIGNED_CERT' | 'SELF_SIGNED_CERT_IN_CHAIN' | 'CERT_HAS_EXPIRED' | 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'` e os mapeia para mensagem RF-014 quando `config.insecure === false`; ajustar se T017 não cobriu
- [ ] T030 [US2] Validar manualmente quickstart V7 com cert auto-assinado real (ou via instância de teste com cert local)

**Checkpoint US2**: testes SSL passam. V7 valida em terminal.

---

## Phase 5: User Story 3 — Saída humano / JSON / quiet (Priority: P2)

**Goal**: scripts e humanos compartilham a mesma ferramenta. `--json` para máquina, default tabular para humano, `--quiet` para identificar essencial.

**Independent Test**: `quickstart.md` V6 (`--json` em `me`), V9 (`NO_COLOR`).

Para a Foundation, `--quiet` ainda não tem comando alvo (esse efeito vem em `new`/`sub`/`assign` das specs 006/004). Mesmo assim, helpers `quietOut` e roteamento de `--quiet` já são exigidos pela 001.

### Tests for User Story 3

- [ ] T031 [P] [US3] Criar `tests/output.test.ts` cobrindo: (a) `humanLog` com cores quando TTY+sem NO_COLOR+sem --no-color, (b) sem cores quando NO_COLOR=qualquer valor, (c) sem cores quando --no-color flag setada, (d) sem cores quando stdout não é TTY (mock `process.stdout.isTTY=false`), (e) `jsonOut(obj)` emite UTF-8 com `JSON.stringify` no stdout e nada em stderr, (f) `quietOut("ABC-123")` emite apenas a Key+`\n` em stdout, mensagens decorativas redirecionadas para stderr
- [ ] T032 [P] [US3] Criar `tests/cli.flags.test.ts` que importa `rootCommand` (NÃO `cli.ts`) e cobre: (a) `--json` global ativa modo JSON em `jira me`, (b) `--no-color` força sem cores mesmo em TTY, (c) `--json` + `--quiet` combinados → JSON prevalece (RF-011), (d) saída de erro em `--json` mode segue envelope RF-019 `{ ok:false, error, exitCode }`

### Implementation for User Story 3

- [ ] T033 [US3] Em `src/commands/root.ts`, garantir que flag global `--json` e `--no-color` sejam propagadas via contexto (closure ou argumento) para os comandos e usadas pelo catch global ao formatar erros
- [ ] T034 [US3] Em `src/output.ts`, expor função `setOutputMode({ json: boolean, quiet: boolean, noColor: boolean })` chamada no início do handler de `rootCommand`, antes de despachar comando
- [ ] T035 [US3] Validar manualmente V6 e V9 do `quickstart.md`

**Checkpoint US3**: testes de output passam. `jira me --json` produz JSON. `NO_COLOR=1 jira me` sai sem ANSI.

---

## Phase 6: User Story 4 — Pipeline stdin (Priority: P2)

**Goal**: comandos com `<KEY>` posicional aceitam Keys via stdin, viabilizando `pick | get`, `echo KEY | get`.

**Independent Test**: `quickstart.md` V8 (parcial — `me` não usa Key; validação completa virá com `jira get` da spec 002).

Para a 001, entregamos a infraestrutura de stdin (`stdin.ts` em T012) + helper de roteamento que comandos pipe-ready das próximas features consumirão. Sem comando consumidor real ainda — apenas API pública testada.

### Tests for User Story 4

- [ ] T036 [P] [US4] Criar `tests/stdin.test.ts` cobrindo: (a) stdin não-TTY com `"ABC-1\nABC-2\n"` → `["ABC-1", "ABC-2"]`, (b) linhas vazias e em branco ignoradas (`"\nABC-1\n\n"` → `["ABC-1"]`), (c) trim de espaços/tabs ao redor (`"  ABC-1  \n"` → `["ABC-1"]`), (d) stdin TTY → retorna array vazio sem ler, (e) stdin não-TTY vazio (após filtro) → retorna array vazio (decisão de exit 2 fica a cargo de quem chama, conforme RF-012)
- [ ] T037 [P] [US4] Criar `tests/cli.stdin.test.ts` cobrindo o helper de roteamento que comandos pipe-ready usarão: dado arg posicional ausente + stdin vazio (não-TTY) → JiraError exitCode 2 com mensagem RF-012 ("Nenhuma Key recebida via stdin nem como argumento.")

### Implementation for User Story 4

- [ ] T038 [US4] Em `src/stdin.ts`, adicionar função `resolveKeys(argKey: string | undefined): Promise<string[]>` que: se `argKey` definido retorna `[argKey]`; senão se `process.stdin.isTTY` falso, lê via `readKeysFromStdin()`; se resultado vazio E sem argKey, lança `JiraError` exitCode 2 com a mensagem RF-012; o argKey prevalece sobre stdin (RF-012)
- [ ] T039 [US4] Documentar no JSDoc de `resolveKeys` que comandos pipe-ready das specs 002+ devem usá-la para receber Keys

**Checkpoint US4**: testes de stdin passam. API de `resolveKeys` pronta para reuso.

---

## Phase 7: User Story 5 — Help / version / discovery (Priority: P3)

**Goal**: usuário descobre comandos sem documentação externa. Help global, help por subcomando, `--version`, comando desconhecido com mensagem útil — tudo sem exigir token.

**Independent Test**: `quickstart.md` V1 (`--version`/`-V`/`--help`/sem args/`me --help`), V3 (comando desconhecido).

### Tests for User Story 5

- [ ] T040 [P] [US5] Criar `tests/cli.help.test.ts` que importa `rootCommand` e cobre: (a) `jira --help` lista todos os subcomandos registrados com descrição, (b) `jira` sem args equivale a `--help` (RF-005), (c) `jira me --help` mostra exemplo (RF-006), (d) `jira foo` (desconhecido) emite mensagem RF-005/H3-3 e seta exitCode 2, (e) `jira --version` e `jira -V` imprimem versão e setam exitCode 0, (f) Nenhum dos itens acima exige `JIRA_TOKEN`/`JIRA_BASE_URL` (RF-021) — testar com `delete process.env.JIRA_TOKEN`

### Implementation for User Story 5

- [ ] T041 [US5] Em `src/commands/root.ts`, garantir que o root command tenha descrição/usage clara e que cada subcommand registrado (apenas `me` na 001) declare `meta.description` e ao menos um exemplo via citty (campo `meta` ou docstring) (RF-006)
- [ ] T042 [US5] Em `src/commands/root.ts`, ajustar handler de comando desconhecido (citty `setup`/`run` ou catch específico) para emitir EXATAMENTE a mensagem da H3 critério 3 e setar exitCode 2
- [ ] T043 [US5] Validar manualmente V1 e V3 do `quickstart.md`

**Checkpoint US5**: ajuda completa, comando desconhecido amigável, `--version` funcional sem env vars.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: validação fim-a-fim, README, CI verde, observabilidade.

- [ ] T044 [P] Criar `README.md` na raiz com: descrição (substituto do `jira.ps1`), instalação MVP (`npm install`, `npm run build`, `npm link`), env vars necessárias, exemplos de uso (`jira me`, `jira me --json`), link para `specs/001-cli-foundation/`
- [ ] T045 [P] Adicionar `.editorconfig` na raiz (UTF-8, LF, indent 2 spaces) para reduzir warnings de CRLF do git em Windows
- [ ] T046 Rodar `npm run lint && npm run typecheck && npm run test && npm run build` localmente — TODOS devem passar
- [ ] T047 Rodar `npm link` e percorrer todos os 13 passos de `quickstart.md` em terminal real
- [ ] T048 Confirmar User-Agent (`jira-cli/<VERSION> (Node/<v22>)`) em uma requisição real, observando logs do servidor Jira ou via proxy de inspeção (V11)
- [ ] T049 Push da branch `001-cli-foundation` e abrir PR para verificar workflow `.github/workflows/ci.yml` rodando verde
- [ ] T050 [P] Criar `tests/signal.test.ts` cobrindo a função pura `handleSigint`: (a) chama `controller.abort()` deixando `getSignal().aborted === true`, (b) remove tmp files registrados via `registerTmpFile` (criar arquivo real em `os.tmpdir()`, registrar, chamar `handleSigint`, asserter inexistência), (c) ignora silenciosamente arquivos já removidos (`fs.rmSync` com `force: true`), (d) RETORNA exatamente `130`. Não testar `installSigintHandler` (efeito colateral em `process.on`) — apenas a função pura
- [ ] T051 Avaliar cobertura de testes via `npx vitest run --coverage` — meta mínima 80% nos módulos de `src/` (config, http, errors, output, stdin, signal, version, commands/root, commands/me)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; pode iniciar imediatamente.
- **Foundational (Phase 2)**: depende de Phase 1; BLOQUEIA todas as user stories.
- **User Stories (Phase 3-7)**: dependem de Phase 2.
  - US1 (P1) é o MVP — entregar primeiro.
  - US2/US3/US4 (P2) podem ser executadas em paralelo após US1 se houver capacidade.
  - US5 (P3) entra por último — refinamento de UX.
- **Polish (Phase 8)**: depende de todas as US desejadas.

### Within-task dependencies

- T002 → T003, T004 (precisa de package.json antes de instalar deps)
- T013 → T015 (config depende de errors)
- T013, T015, T016 → T017 (http depende dos três)
- T013, T014 → T017 (errors completo antes de http usar)
- T010, T011, T013, T015 → T018 (root.ts depende de version, output, errors, config)
- T018 → T019 (cli.ts entrypoint importa rootCommand)
- T017 → T025 (commands/me usa http)
- T010-T019 (Foundation) → T020-T027 (US1)
- T020-T024 ([P] entre si) podem rodar paralelamente (arquivos diferentes)

### Parallel Opportunities

- **Phase 1**: T005, T006, T007, T008, T009 todos [P] — paralelo após T002.
- **Phase 2**: T010, T011, T012, T013 [P] entre si. T014 depende de T013. T015 depende de T013. T017 depende de T013, T014, T015. T016 [P] com outros. T018 depende de T010, T011, T013, T015. T019 depende de T018 (sequencial).
- **Phase 3**: T020, T021, T022, T023, T024 [P] (testes em arquivos diferentes). T025 (impl) depende deles falhando primeiro.
- **Phase 4-7**: testes [P] dentro de cada US.
- Stories US2/US3/US4 podem ser desenvolvidas em paralelo por devs diferentes após Phase 2.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Após T002 (npm install) concluído, rodar em paralelo:
Task: "Criar src/version.ts com import attribute do package.json"          # T010
Task: "Criar src/output.ts com humanLog/jsonOut/quietOut e cores"          # T011
Task: "Criar src/stdin.ts com readKeysFromStdin"                           # T012
Task: "Criar src/errors.ts com classe JiraError e mapHttpToError"          # T013
```

## Parallel Example: User Story 1 (testes)

```bash
# Tudo paralelo (arquivos distintos):
Task: "tests/config.test.ts cobrindo env, INSECURE, base URL, timeout"     # T020
Task: "tests/errors.test.ts cobrindo mapping HTTP e parse de body"         # T021
Task: "tests/http.test.ts cobrindo headers, timeout, no-retry"             # T022
Task: "tests/version.test.ts validando VERSION"                            # T023
Task: "tests/commands/me.test.ts cobrindo saída humana e JSON"             # T024
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) — projeto compilável, lint limpo, vitest verde sem testes.
2. Phase 2 (Foundational) — config + http + errors + output + stdin + signal + root.ts + cli.ts.
3. Phase 3 (US1) — `jira me` funcional contra Jira real.
4. **STOP**: validar V1, V2, V3, V4, V5, V6 do `quickstart.md`.
5. Demo / `npm link` para uso pessoal.

### Incremental Delivery

1. Setup + Foundational → fundação pronta.
2. + US1 → MVP entregue (`jira me` real).
3. + US2 → ambientes corporativos com cert auto-assinado (V7).
4. + US3 → JSON/quiet para scripts (V6, V9).
5. + US4 → pipeline pronto para 002+ consumir (V8 parcial).
6. + US5 → help/version completos (V1, V3).
7. Polish + CI verde + quickstart fim-a-fim.

### Parallel Team Strategy

- Após Phase 2, três devs em paralelo:
  - Dev A: US1 (testes T020-T024, impl T025-T027).
  - Dev B: US2 + US3 (testes + impl).
  - Dev C: US4 + US5.
- Conflito mínimo: cada US toca arquivos distintos exceto `commands/root.ts` (US1 registra `me`, US3 propaga flags, US5 ajusta help) — coordenar via PR pequenos.

---

## Notes

- [P] = arquivos diferentes, sem dependência → seguro paralelizar.
- [Story] = traceabilidade ao spec.md.
- TDD: cada US começa pelos testes; eles devem falhar primeiro.
- Commit após cada T concluído (ou grupo lógico [P]) para rastro fino.
- `quickstart.md` é o gate final de cada US.
- Token Jira NÃO deve aparecer em nenhum log/teste/commit — usar mocks de fetch nos testes.
- `cli.ts` é entrypoint puro com `runMain` — testes importam SEMPRE `rootCommand` de `commands/root.ts`, nunca `cli.ts`, evitando inicializar o CLI durante a suíte.
- Mesmo padrão aplicado a `signal.ts`: `handleSigint()` puro retorna `130`; `installSigintHandler()` faz o wiring com `process.on('SIGINT', () => process.exit(...))` — chamado apenas em `cli.ts`.
