# Phase 0 — Pesquisa: Transições de Workflow (003)

Stack já fixada (001/002). Sem `NEEDS CLARIFICATION`. Pesquisa cobre decisões específicas de match e UX.

---

## D-001 — API de transições Jira

- **Decision**: Usar dois endpoints:
  - `GET /rest/api/2/issue/{key}/transitions` — lista transições disponíveis no estado atual.
  - `POST /rest/api/2/issue/{key}/transitions` com body `{ "transition": { "id": "<id>" } }` — aplica.
- **Rationale**: Endpoints estáveis no Jira Server v2; matches script PowerShell original.
- **Alternativas**: NDS — sem endpoints alternativos para isso.

## D-002 — `findTransition(transitions, regex): { match: 'one' | 'none' | 'many', transitions: ... }`

- **Decision**: Retornar discriminated union com 3 estados:
  - `{ match: 'one', transition }` — exatamente 1 candidata.
  - `{ match: 'none', available: Transition[] }` — zero candidatas.
  - `{ match: 'many', candidates: Transition[], available: Transition[] }` — 2+ candidatas.
- **Rationale**: Cada caso tem mensagem distinta. Discriminated union força tratamento exaustivo no comando.
- **Alternativas**:
  - Retornar `Transition | null + warnings`: ambíguo entre "achou um" vs "achou muitos, escolhi um".
  - Lançar exceção: dificulta uso programático e mistura caminhos.

## D-003 — `getPattern(kind): RegExp`

- **Decision**: Module `src/jira/patterns.ts` exporta `getPattern(kind: 'start' | 'done' | 'stop'): RegExp`. Lê env `JIRA_PATTERN_START` / `_DONE` / `_STOP`. Quando ausente, usa default. Resultado sempre case-insensitive.
- **Defaults**:
  - start: `Progress|Iniciar|Start|Em andamento|Andamento`
  - done: `Done|Concluído|Concluido|Resolved|Resolvido|Finalizar|Fechar|Close`
  - stop: `To Do|Reopen|Reabrir|Aberto|Pendente|Backlog`
- **Rationale**: RF-001/002/003 do spec. Override por env permite projetos com workflow customizado.
- **Validação**: env var inválida (regex inválida) → JiraError exitCode 2 com mensagem `JIRA_PATTERN_<KIND> inválido: <erro>`.

## D-004 — Mensagem de sucesso usa nome real (RF-008)

- **Decision**: Após `POST /transitions` retornar 204, log de sucesso é `<KEY> movida para '<TO_NAME>'.` onde `<TO_NAME>` vem de `transition.to.name` (do GET prévio).
- **Rationale**: Spec RF-008. Projetos PT-BR ("Em Andamento", "Doing", "Em desenvolvimento") aparecem corretos.
- **Alternativas**:
  - Hardcoded "Em Andamento" / "Concluída" / "A Fazer": rejeitado pelo spec.

## D-005 — Resposta da API após POST transition

- **Decision**: `POST /transitions` retorna 204 No Content (sem body). Comando NÃO faz fetch extra para confirmar — confia no 204 e usa `transition.to.name` do GET inicial.
- **Rationale**: 1 GET + 1 POST = 2 chamadas. Pegar issue atualizada custa +1 chamada sem ganho real.
- **Alternativas**:
  - GET issue após POST: lento, sem ganho.

## D-006 — Pipe-ready em todos os comandos

- **Decision**: `start`, `done`, `stop`, `trans`, `move` aceitam `<KEY>` posicional opcional + stdin via `resolveKeys` (já existe em `src/stdin.ts` da 001).
- **Rationale**: RF-012 da 001 + CS-003 do spec 003 (`jira pick | jira start`). Pipeline ergonômico.
- **Edge case `move`**: precisa também de `<ID>` posicional. ID NÃO vem do stdin — só Key. Stdin múltiplo + ID fixo: aplica ID para cada Key (mesmo workflow assumido).

## D-007 — Comando `trans` (somente leitura)

- **Decision**: Tabela com colunas ID, Nome, Para (estado destino). `--json` emite array `[{ id, name, to }]`.
- **Rationale**: RF-005. Diagnóstico para escolher transição manualmente.

## D-008 — Erros mapeados

| Cenário | Mensagem | Exit code |
|---------|----------|-----------|
| Match único, POST 200/204 | `<KEY> movida para '<TO_NAME>'.` em stderr | 0 |
| Match nenhum (start/done/stop) | `Transição '<LABEL>' não disponível. Transições disponíveis: <lista>` | 1 |
| Match ambíguo | `Várias transições correspondem ao padrão: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.` | 1 |
| `move` com ID inexistente | `Transição <ID> não encontrada para <KEY>. Execute 'jira trans <KEY>' para ver as disponíveis.` | 1 |
| 403 (sem permissão) | `Sem permissão para realizar esta transição em <KEY>.` (mapeia 403 da 001 → 5) | 5 |
| Key inválida local | mensagem RF-008 do 002 | 2 |

LABEL = "Em Andamento" | "Concluído" | "A Fazer" (rótulo do comando, não do estado real). É o único hardcode aceitável: identifica qual padrão FALHOU para o user descobrir o que ajustar.

## D-009 — Saída `--json` para ações

- **Decision** (segue RF-019 da 001):
  - Sucesso: `{ "ok": true, "key": "<KEY>", "action": "<verbo>", "transitionId": "<id>", "to": "<TO_NAME>" }`
  - Falha: `{ "ok": false, "error": "<msg>", "exitCode": N }`
- **Rationale**: padrão estabelecido em `jira open` da 002.

## D-010 — `jira trans` em modo `--json`

- **Decision**: array de objetos sem envelope (não é "ação", é listagem):
  - `[{ "id": "21", "name": "Start Progress", "to": "In Progress" }, ...]`
- **Rationale**: alinhado com `mine`/`find`/`status` da 002.

## D-011 — Match ambíguo: definição

- **Decision**: "ambíguo" = `transitions.filter(t => regex.test(t.name)).length >= 2`.
- **Rationale**: spec RF-007 (mudança vs RF antigo "primeira encontrada"). Recusa decidir é mais seguro.

## D-012 — Validação de Key local

- **Decision**: Reutilizar `validateKey` de `src/jira/key.ts` (002) em todos os comandos da 003. Falha → exitCode 2 antes de qualquer fetch.

---

## Saída

Sem clarificações pendentes. Phase 0 OK.
