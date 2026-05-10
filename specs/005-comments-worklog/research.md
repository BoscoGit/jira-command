# Phase 0 — Pesquisa: Comentários e Worklog (005)

Stack já fixada (001..004). Sem `NEEDS CLARIFICATION`. Pesquisa cobre apenas decisões específicas desta feature.

---

## D-001 — Endpoints REST

| Operação | Endpoint | Body |
|----------|----------|------|
| Criar comentário | `POST /rest/api/2/issue/{key}/comment` | `{ "body": "<texto>" }` |
| Listar comentários | `GET /rest/api/2/issue/{key}/comment?maxResults=50&orderBy=-created` | — |
| Deletar comentário | `DELETE /rest/api/2/issue/{key}/comment/{id}` | — |
| Criar worklog | `POST /rest/api/2/issue/{key}/worklog` | `{ "timeSpent": "<X>", "comment": "<opc>" }` |
| Listar worklog | `GET /rest/api/2/issue/{key}/worklog` | — |

POST de criação retornam 201 com body. DELETE retorna 204. GET retornam 200 com array em `comments` ou `worklogs`.

## D-002 — Confirmação interativa (`comment-del`)

- **Decision**: Novo módulo `src/platform/prompt.ts` exportando `confirmInteractive(question: string): Promise<boolean>`. Lê linha do stdin via `readline`. Aceita `s`, `S`, `y`, `Y` como confirmação. Em modo não-interativo (stdin não-TTY OU stdout não-TTY) → retorna `false` sem perguntar.
- **Flag `--yes`**: bypass do prompt. RF-003.
- **Rationale**: Spec H3 critério 3 exige `s` (PT-BR), mas aceitar `y` evita quebra de hábitos. Premise diz "cancelada por segurança" em pipe.
- **Alternativas**:
  - Aceitar apenas `s`: rígido demais.
  - Sempre perguntar mesmo em pipe: trava CLI scriptável.

## D-003 — `comment` aceita texto via 3 fontes

- **Decision**: arg posicional obrigatório `text`. Pipe stdin via `resolveKeys` aplica-se à Key, não ao texto. Texto vem sempre como argumento.
- **Edge case**: texto com aspas/quebras de linha. Shell precisa escapar; ferramenta repassa string como veio.
- **Rationale**: Spec H1. Não suportar leitura de texto do stdin nesta feature (escopo pequeno).

## D-004 — `log` aceita 3 args posicionais

- **Decision**: `jira log <KEY> <TEMPO> [COMENTÁRIO]`. Key opc (via stdin), TEMPO obrigatório, COMENTÁRIO opcional.
- **Formato de tempo**: repassado literal para Jira (`1h`, `30m`, `1h 30m`). Erros parseados via RF-013 da 001.
- **Rationale**: Spec H4 + RF-006.

## D-005 — Listagens com preview truncado

- **Decision**: `comments` preview em 80 chars; `logs` preview em 60. Sufixo `...` apenas quando truncou (RF-002 do spec 002 — bug do PowerShell já corrigido lá).
- **Implementação**: helper `previewText(text, max): string` em `src/format/preview.ts` reusável. Trunca em max-3 + `...` se length > max.
- **Rationale**: RF-002, RF-005.

## D-006 — Validação Key local

Reutiliza `validateKey` (002).

## D-007 — Pipe stdin

`comment`, `comments`, `comment-del`, `log`, `logs`: todos pipe-ready via `resolveKeys` (001). Args adicionais (`text`, `id`, `time`, `time + desc`) ficam fixos por argumento.

## D-008 — Saída JSON

| Comando | Sucesso |
|---------|---------|
| `comment` | `{ok, key, action:'comment', commentId}` |
| `comments` | array `[{id, author, created, body}]` (sem envelope) |
| `comment-del` | `{ok, key, action:'comment-del', commentId}` |
| `log` | `{ok, key, action:'log', time, worklogId}` |
| `logs` | array `[{id, author, started, timeSpent, comment}]` (sem envelope) |

## D-009 — Comportamento de comentário vazio

- **Decision**: validação local — `comment` com texto vazio (após trim) → JiraError exitCode 2 com mensagem `O texto do comentário não pode ser vazio.` (H1 critério 2).
- **Rationale**: evita chamada HTTP que provavelmente retornaria 400 com mensagem genérica.

## D-010 — `--yes` e modo não-interativo

- **Decision**:
  - `--yes` (flag de `comment-del`) → pula confirmação direto para DELETE.
  - Sem `--yes` em modo interativo → prompt `s/n`.
  - Sem `--yes` em modo NÃO-interativo (stdin ou stdout não-TTY) → exit 2 com mensagem `Operação cancelada (modo não-interativo). Use --yes para confirmar.`.
- **Rationale**: RF-003 + premise. Spec deixa explícito que pipe/CI precisa de `--yes`.

## D-011 — Limite de listagens

- `comments`: 50 mais recentes (RF-002). `orderBy=-created`.
- `logs`: todos (sem limite explícito — Jira retorna `worklogs[]`). Spec não menciona limite.

## D-012 — Saída humana

| Comando | Saída humana |
|---------|--------------|
| `comment` | `Comentário adicionado em <KEY> (#<id>).` |
| `comments` | tabela ID/AUTOR/DATA/COMMENT (preview 80) |
| `comment-del` | prompt + `Comentário <ID> deletado.` ou `Operação cancelada.` |
| `log` | `Worklog <TEMPO> registrado em <KEY>.` |
| `logs` | tabela ID/AUTOR/DATA/TEMPO/COMMENT (preview 60) |

---

## Saída

Sem clarificações pendentes. Phase 0 OK.
