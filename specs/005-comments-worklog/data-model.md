# Phase 1 — Data Model: Comentários e Worklog (005)

Sem persistência. Modelos descrevem entidades Jira consumidas e tipos internos.

---

## E1. Comment

Origem: `GET /rest/api/2/issue/{key}/comment` (campo `comments[]`).

| Campo | Tipo | Origem JSON |
|-------|------|-------------|
| `id` | `string` | `id` |
| `author` | `string` | `author.displayName` |
| `created` | `string` | `created` (ISO; humano usa primeiros 10 chars) |
| `body` | `string` | `body` |

Saída humana (`comments`): tabela ID, Autor, Data, Comentário (preview 80 chars).
Saída `--json`: array de `Comment`.

## E2. Worklog

Origem: `GET /rest/api/2/issue/{key}/worklog` (campo `worklogs[]`).

| Campo | Tipo | Origem JSON |
|-------|------|-------------|
| `id` | `string` | `id` |
| `author` | `string` | `author.displayName` |
| `started` | `string` | `started` (ISO) |
| `timeSpent` | `string` | `timeSpent` (ex: "1h 30m") |
| `comment` | `string` | `comment` (pode ser vazio) |

## E3. Confirmation prompt

```ts
async function confirmInteractive(question: string): Promise<boolean>;
// Lê linha do stdin via readline; aceita s/S/y/Y como true.
// Não-interativo (stdin OU stdout não-TTY) → retorna false sem perguntar.
```

## E4. Preview helper

```ts
function previewText(text: string, max: number): string;
// Retorna text se length <= max; senão text.slice(0, max-3) + '...'
// Em vez do bug do jira.ps1 que sempre adicionava '...'.
```

## E5. Saída JSON envelope

| Comando | Sucesso |
|---------|---------|
| `comment` | `{ok:true, key, action:'comment', commentId:'<id>'}` |
| `comments` | array `[{id, author, created, body}]` (listagem, sem envelope) |
| `comment-del` | `{ok:true, key, action:'comment-del', commentId:'<id>'}` |
| `log` | `{ok:true, key, action:'log', time:'<X>', worklogId:'<id>'}` |
| `logs` | array `[{id, author, started, timeSpent, comment}]` (listagem) |

Falha: `{ok:false, error, exitCode}`.

## E6. Mensagens-chave

| Cenário | Mensagem |
|---------|----------|
| `comment` vazio | `O texto do comentário não pode ser vazio.` |
| `comment` ok | `Comentário adicionado em <KEY> (#<id>).` |
| `comments` vazio | `Nenhum comentário em <KEY>.` |
| `comment-del` prompt | `Deletar comentário <ID> de <KEY>? (s/n):` |
| `comment-del` cancelado | `Operação cancelada.` |
| `comment-del` não-interativo sem --yes | `Operação cancelada (modo não-interativo). Use --yes para confirmar.` |
| `comment-del` deletado | `Comentário <ID> deletado.` |
| `log` ok | `Worklog <TEMPO> registrado em <KEY>.` |
| `logs` vazio | `Nenhum apontamento em <KEY>.` |

---

## Resumo

5 entidades. Confirmação interativa isolada em platform/prompt.ts (testável via stdin mock). Preview helper reutilizável.
