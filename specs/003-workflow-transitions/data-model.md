# Phase 1 — Data Model: Transições de Workflow (003)

Sem persistência. Modelos descrevem entidades Jira consumidas e tipos internos do match.

---

## E1. Transition (entidade Jira)

Origem: `GET /rest/api/2/issue/{key}/transitions`.

| Campo | Tipo | Origem JSON | Notas |
|-------|------|-------------|-------|
| `id` | `string` | `id` | numérico mas vem como string |
| `name` | `string` | `name` | usado no match (regex case-insensitive) |
| `to` | `string` | `to.name` | nome do estado destino — usado em mensagem de sucesso (RF-008) |

Saída humana (`jira trans`): tabela com colunas ID, Nome, Para.
Saída `--json`: array `[{ id, name, to }]`.

## E2. PatternKind

```ts
type PatternKind = 'start' | 'done' | 'stop';
```

Determina qual env var consultar e qual default aplicar:

| Kind | Env var | Label humano | Regex default |
|------|---------|--------------|---------------|
| `start` | `JIRA_PATTERN_START` | "Em Andamento" | `/Progress\|Iniciar\|Start\|Em andamento\|Andamento/i` |
| `done` | `JIRA_PATTERN_DONE` | "Concluído" | `/Done\|Concluído\|Concluido\|Resolved\|Resolvido\|Finalizar\|Fechar\|Close/i` |
| `stop` | `JIRA_PATTERN_STOP` | "A Fazer" | `/To Do\|Reopen\|Reabrir\|Aberto\|Pendente\|Backlog/i` |

## E3. MatchResult (discriminated union)

```ts
type MatchResult =
  | { match: 'one'; transition: Transition }
  | { match: 'none'; available: Transition[] }
  | { match: 'many'; candidates: Transition[]; available: Transition[] };
```

- `one`: comando aplica.
- `none`: comando exibe disponíveis e exit 1.
- `many`: comando recusa, exibe candidatas e instrui `jira move`, exit 1.

## E4. Saída de comandos de ação (start, done, stop, move)

**Humana** (stderr):
- Sucesso: `<KEY> movida para '<TO_NAME>'.` (cor verde se TTY).
- Match nenhum: `Transição '<LABEL>' não disponível em <KEY>. Transições disponíveis:` seguido de lista (ID — Nome → Estado).
- Match ambíguo: `Várias transições correspondem ao padrão em <KEY>: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.`
- 403: `Sem permissão para realizar esta transição em <KEY>.`

**JSON** (`--json`):
- Sucesso: `{ ok: true, key, action: 'start'|'done'|'stop'|'move', transitionId, to }`
- Falha: `{ ok: false, error, exitCode }` (RF-019 da 001).

## E5. Saída de `jira trans`

**Humana**: tabela.
**JSON**: array de Transition (`[{ id, name, to }]`). Sem envelope (é leitura, não ação).

---

## Resumo

Sem dados persistidos. Discriminated union `MatchResult` força tratamento exaustivo. Mensagens de sucesso/erro padronizadas e mapeadas em tabela.
