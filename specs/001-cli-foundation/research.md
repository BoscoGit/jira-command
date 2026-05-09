# Phase 0 — Pesquisa: Fundação do CLI (001)

Todas as decisões já foram tomadas no diálogo de revisão das specs (2026-05-09) e estão consolidadas em `memory/project_jira_command_stack.md`. Não há `NEEDS CLARIFICATION` pendentes na seção Technical Context do plan.

Este documento registra **rationale** e **alternativas consideradas** para cada escolha, atendendo ao critério de saída do Phase 0.

---

## D-001 — Linguagem e runtime

- **Decision**: TypeScript ESM, target ES2022, Node 22 LTS.
- **Rationale**:
  - Node 22 tem `fetch` estável, `util.parseArgs` maduro, suporte LTS até abr/2027.
  - ESM é o padrão moderno; sem `require()` legado.
  - TypeScript com strict + extras pega bugs no parse de JSON da API do Jira.
- **Alternativas consideradas**:
  - Go (binário único cross-platform): mais rápido no cold start; rejeitado por user preferir TS.
  - Python + PyInstaller: rejeitado pelo overhead de empacotamento.
  - PowerShell module: amarra a Windows/PS; substitui jira.ps1 sem ganho de portabilidade.

## D-002 — HTTP client

- **Decision**: `fetch` nativo + `undici` Agent (Node builtin) para bypass SSL.
- **Rationale**:
  - Zero dep adicional; undici já vem com Node ≥18.
  - `setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }))` ativa `JIRA_INSECURE`.
  - Sem lock-in em wrapper.
- **Alternativas consideradas**:
  - `ky`: ergonomia mas +1 dep; SSL bypass continua precisando undici Agent → ganho marginal.
  - `undici.request` direto: verboso, sem ganho real para um CLI.
  - `node-fetch`: descontinuado em Node moderno.

## D-003 — CLI parser

- **Decision**: `citty` (UnJS).
- **Rationale**:
  - ESM-first, tipos fortes via `defineCommand`.
  - Subcommands embutidos — necessário para 32 comandos.
  - ~10kb, manutenção ativa.
- **Alternativas consideradas**:
  - `commander`: maduro mas API mais legada; verbose.
  - `yargs`: peso e tipos TS historicamente fracos.
  - `util.parseArgs` nativo: sem subcommands embutidos; teria que construir roteamento manual — inviável p/ 32 comandos.

## D-004 — Test runner

- **Decision**: `vitest`.
- **Rationale**:
  - DX superior (watch, UI, coverage builtin).
  - ESM nativo, sem ts-jest.
  - Fixtures e mocks rico.
- **Alternativas consideradas**:
  - `node:test` builtin: zero dep; rejeitado por DX inferior (sem watch fácil, sem UI, coverage via c8 manual).
  - `jest`: peso, ESM ainda fricção.

## D-005 — Lint + format

- **Decision**: `@biomejs/biome` (unified).
- **Rationale**:
  - Substitui eslint+prettier com 1 dep e 1 config.
  - Rust-based: ordem de magnitude mais rápido em projetos grandes.
- **Alternativas consideradas**:
  - eslint + prettier: padrão indústria mas overhead de configs e plugins.
  - Apenas `tsc --strict`: sem enforcement de estilo.

## D-006 — Cores no terminal

- **Decision**: `picocolors`.
- **Rationale**:
  - ~14 LOC, zero dep, mais rápido que chalk.
  - Detecta TTY e `NO_COLOR` automaticamente — alinha com RF-025.
- **Alternativas consideradas**:
  - `chalk`: peso e features (RGB, templates) que não usaremos.
  - Sem cores: pipe-friendly por padrão mas perde feedback visual em uso interativo.

## D-007 — Pacote, build e distribuição

- **Decision**:
  - Package manager: `npm` (builtin Node).
  - Build: `tsc → dist/` (sem bundler). `tsx` em dev.
  - Distribuição MVP: `npm link` local. Registry / GitHub Packages: APÓS validação MVP.
  - `package.json` declara `bin: { "jira": "./dist/cli.js" }`.
- **Rationale**:
  - tsc puro: rastreabilidade módulo-a-módulo, sem mágica de bundler para CLI Node.
  - `npm link` não exige conta de registry e permite iteração rápida.
- **Alternativas consideradas**:
  - `pnpm`: cogitado, descartado para manter consistência com `npm link` no fluxo.
  - `tsup`: bundle único; rejeitado pelo escopo MVP — preferível visibilidade módulo-a-módulo agora.
  - `bun`: runtime alternativo; compat com undici Agent precisaria validação extra.

## D-008 — TypeScript strict

- **Decision**: `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride`.
- **Rationale**:
  - `noUncheckedIndexedAccess` pega bugs em parsing de JSON da API (campos opcionais).
  - `exactOptionalPropertyTypes` distingue `undefined` vs ausência — relevante para body PATCH.
  - Projeto novo: vale apertar antes de acumular dívida.
- **Alternativas consideradas**:
  - Apenas `strict: true`: ok mas perde os ganhos acima.
  - Sem strict: descartado, projeto novo TS sem strict é dívida na partida.

## D-009 — CI

- **Decision**: GitHub Actions, workflow `.github/workflows/ci.yml` rodando `biome check`, `vitest run`, `tsc --noEmit` em PRs e push em main.
- **Rationale**:
  - Repositório (presumivelmente) GitHub; gratuito para repos públicos/pessoais.
  - Garante feedback rápido sem CI manual.
- **Alternativas consideradas**:
  - Sem CI: aceitável para uso pessoal mas dificulta publicação posterior.
  - Adicionar só após código existir: rejeitado para manter qualidade desde o primeiro commit de código.

## D-010 — UTF-8 em Windows

- **Decision**: forçar UTF-8 programaticamente:
  - `process.stdout.setDefaultEncoding('utf8')` (já é default em Node 22 ESM).
  - Chamar `chcp 65001` opcional via `os.platform() === 'win32'` para console hosts antigos — mas Windows Terminal / VS Code já lidam.
  - **Decisão final**: confiar no default de Node 22 + Windows Terminal moderno; documentar em README que console legacy (cmd.exe puro) pode precisar `chcp 65001`. Não rodar `chcp` automaticamente para evitar side-effect global.
- **Rationale**: side-effect de mudar codepage do console parent é invasivo; documentação resolve casos de borda raros.

## D-011 — Tratamento de SIGINT

- **Decision**:
  - Registrar handler global em `cli.ts`.
  - Usar `AbortController` passado pra todas requisições fetch.
  - Manter set global de paths de tmp files; remover todos no handler.
  - Exit code 130 (POSIX `128 + SIGINT(2)`).
- **Rationale**: convenção POSIX, comportamento esperado em qualquer CLI moderno.
- **Alternativas consideradas**:
  - Não tratar: deixaria tmp files de `jira desc` órfãos.
  - Exit 1: violaria convenção POSIX.

## D-012 — Estrutura de erros

- **Decision**: Classe `JiraError extends Error` com `exitCode` e `cause`. Catch global no entry `cli.ts`.
- **Rationale**: separa "erro de domínio com exit code conhecido" de exceptions inesperadas. Mensagens da API parseadas por funções helper em `errors.ts`.
- **Alternativas consideradas**:
  - `process.exit` espalhado por comandos: rejeitado por dificultar testes (vitest precisaria mock).
  - Result/Either type funcional: TS sem união discriminada nativa idiomática para isso; overhead conceitual sem ganho.

## D-013 — Fallback para erros sem schema Jira (RF-013)

- **Decision**: parser de erro tenta, em ordem:
  1. JSON com `errorMessages` (array) ou `errors` (objeto) → concatena/formata.
  2. JSON sem campos esperados → string genérica `HTTP <status> <statusText>`.
  3. Texto/HTML/binário ou body vazio → `HTTP <status> <statusText> — verifique conectividade ou status do servidor Jira`.
- **Rationale**: cobrimos Jira normal, proxies HTML (502/504 corporativos), WAFs com texto, e schemas variantes de versões antigas.

## D-014 — User-Agent

- **Decision**: `jira-cli/<VERSION> (Node/<NODE_VERSION>)`. Versão lida do `package.json` em runtime via JSON import attribute (`with { type: "json" }`).
- **Rationale**: identificação clara em logs do servidor; admins conseguem rastrear uso da ferramenta.

## D-015 — Comando entregue na 001

- **Decision**: `jira me` (chama `GET /rest/api/2/myself`) — único comando funcional dessa feature.
- **Rationale**: valida toda a fundação (config, http, output, version, help, --json) com endpoint mais leve do Jira. Demais comandos virão nas features 002-006.
- **Alternativas consideradas**:
  - Apenas `--version` / `--help`: insuficiente — não exercita rede, auth, parse, output.
  - Entregar `mine` também: extrapola escopo da 001 (browse é spec 002).

---

## Saída

Todos os pontos da Technical Context resolvidos. Sem `NEEDS CLARIFICATION` remanescentes. Pronto para Phase 1.
