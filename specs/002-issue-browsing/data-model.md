# Phase 1 — Data Model: Consulta de Issues (002)

Continua o padrão da 001: sem persistência local. Modelos descrevem entidades de domínio Jira consumidas via REST e os shapes de saída JSON da CLI.

---

## E1. Issue (resumida — usada em listagens)

Origem: `GET /rest/api/2/search` com `fields=summary,status,priority,assignee,project`.

| Campo | Tipo | Origem JSON | Notas |
|-------|------|-------------|-------|
| `key` | `string` | `key` | ex: `ABC-123` |
| `summary` | `string` | `fields.summary` | título |
| `status` | `string` | `fields.status.name` | estado atual |
| `priority` | `string \| null` | `fields.priority?.name ?? null` | nem toda issue tem prioridade |
| `assignee` | `string \| null` | `fields.assignee?.displayName ?? null` | display name |
| `updated` | `string` | `fields.updated` (ISO 8601) | só usado para ordenação |

Saída humana (tabela): colunas Key, Prioridade, Status, Resumo (e Responsável quando relevante).
Saída `--json`: objeto com as chaves acima.

## E2. Issue (completa — usada em `jira get`)

Origem: `GET /rest/api/2/issue/{key}` (com expand de comentários via `fields=*navigable,comment`).

| Campo | Tipo | Origem JSON |
|-------|------|-------------|
| `key` | `string` | `key` |
| `summary` | `string` | `fields.summary` |
| `status` | `string` | `fields.status.name` |
| `priority` | `string \| null` | `fields.priority?.name ?? null` |
| `assignee` | `string \| null` | `fields.assignee?.displayName ?? null` |
| `reporter` | `string \| null` | `fields.reporter?.displayName ?? null` |
| `description` | `string \| null` | `fields.description` (texto plano ou wiki) |
| `comments` | `Comment[]` | `fields.comment.comments` ou chamada separada |

Saída humana (multi-linha):
```
=== ABC-123 ===
Summary  : ...
Status   : ...
Priority : ...
Assignee : ...
Reporter : ...

--- Description ---
<descrição>

--- Comments (N) ---
[#id | autor - data]
<body>
...
```

Saída `--json`: objeto `Issue` completo com `comments` aninhado.

## E3. Comment

Origem: `GET /rest/api/2/issue/{key}/comment?maxResults=10&orderBy=-created` (ou aninhado em E2).

| Campo | Tipo | Origem JSON |
|-------|------|-------------|
| `id` | `string` | `id` |
| `author` | `string` | `author.displayName` |
| `created` | `string` | `created` (data ISO; humano usa primeiros 10 chars) |
| `body` | `string` | `body` |

Limite humano em `jira get`: 10 comentários mais recentes (ordenação descendente).

## E4. JQL

Não é uma entidade JSON, mas vale formalizar a string aceita por `jira find` e `jira pick --jql`:

- Aceita qualquer JQL válido pelo Jira Server v2.
- Encoding via `encodeURIComponent` antes de incluir em URL.
- Erros de sintaxe vêm via 400 do Jira; ferramenta repassa via `RF-013` da 001.

## E5. PickResult

Saída do comando `jira pick`:

- Sucesso: stdout = `<KEY>\n`, exit 0.
- Cancelado (ESC): stdout vazio, exit 1, sem mensagem.
- Sem `fzf`: stderr informativa, exit 1.

Em modo pipe: `jira pick | jira get` consome o `<KEY>` via RF-012 da 001.

## E6. Tabela (saída humana)

Estrutura interna em memória:

```ts
interface TableColumn {
  header: string;
  key: string;       // chave do objeto da row
  align?: 'left' | 'right';
  maxWidth?: number; // trunca com '...'
}

function writeTable<T extends object>(
  rows: T[],
  columns: TableColumn[],
  opts?: { color?: boolean }
): void;
```

- Calcula largura por coluna como `max(headerWidth, max(rowWidth))`, respeitando `maxWidth`.
- Escreve em `process.stdout` linha-a-linha via `humanLog`.
- Em `--json`, NÃO é chamado — comando emite `jsonOut(rows)` direto.

## E7. KeyValidator

Helper compartilhado:

```ts
const KEY_REGEX = /^[A-Z][A-Z0-9_]+-\d+$/;

function validateKey(input: string): string;
// Retorna `input` se valida; senão lança JiraError exitCode 2 com mensagem RF-008/spec-002.
```

Usado por: `get`, `open`, `start`, `done`, `stop`, `assign`, ... (features 003+).

---

## Resumo

Sem persistência. Estruturas de domínio tipadas em TS. Saída humana via tabela alinhada; saída `--json` espelha a estrutura interna.
