# Contrato: Endpoints Jira consumidos (002 Browsing)

Estende `001-cli-foundation/contracts/jira-api.md`. Headers obrigatórios (`Authorization`, `User-Agent`, `Accept`), parser de erro e estratégia de timeout/SSL/no-retry permanecem inalterados.

API: Jira Server REST v2 (`<JIRA_BASE_URL>/rest/api/2/...`).

---

## 1. `GET /rest/api/2/search`

**Uso**: `jira mine`, `jira find`, `jira status`, `jira pick`.

**Request**:
```
GET /rest/api/2/search?jql=<URL_ENCODED>&maxResults=<N>&fields=<COMMA_SEP>
Authorization: Bearer <token>
Accept: application/json
```

**Query params**:
- `jql` (obrigatório, URL-encoded)
- `maxResults` (padrão 50; `mine`=50, `find`=`--limit` (1..200), `status`=50, `pick`=200)
- `fields` (CSV) — limita payload:
  - `mine`/`status`: `summary,status,priority`
  - `find`: `summary,status,priority,assignee`
  - `pick`: `summary,status,priority`

**Response 200** (relevante):
```json
{
  "total": 142,
  "issues": [
    {
      "key": "ABC-123",
      "fields": {
        "summary": "...",
        "status": { "name": "Open" },
        "priority": { "name": "Medium" } | null,
        "assignee": { "displayName": "Bosco" } | null
      }
    }
  ]
}
```

**Campos consumidos**: `total`, `issues[].key`, `issues[].fields.summary`, `issues[].fields.status.name`, `issues[].fields.priority?.name`, `issues[].fields.assignee?.displayName`.
**Outros**: ignorados.

**Erros**:
- 400 (JQL inválido) → mensagem do servidor via parser RF-013 da 001, exit 1.
- 401 → exit 3 (RF-008/001).

## 2. `GET /rest/api/2/issue/{key}`

**Uso**: `jira get`.

**Request**:
```
GET /rest/api/2/issue/<KEY>?fields=*navigable,comment
Authorization: Bearer <token>
Accept: application/json
```

**Tentativa 1**: `fields=*navigable,comment` — busca todos os campos navegáveis + lista de comentários inline.
**Fallback**: se o servidor não retornar `fields.comment.comments`, fazer chamada extra a `/rest/api/2/issue/<KEY>/comment` (ver §3).

**Response 200** (relevante):
```json
{
  "key": "ABC-123",
  "fields": {
    "summary": "...",
    "status": { "name": "..." },
    "priority": { "name": "..." } | null,
    "assignee": { "displayName": "..." } | null,
    "reporter": { "displayName": "..." } | null,
    "description": "..." | null,
    "comment": {
      "comments": [
        { "id": "...", "author": { "displayName": "..." }, "created": "...", "body": "..." }
      ],
      "total": 12
    }
  }
}
```

**Campos consumidos**: `key`, `fields.summary`, `fields.status.name`, `fields.priority?.name`, `fields.assignee?.displayName`, `fields.reporter?.displayName`, `fields.description`, `fields.comment.comments[]`.

**Erros**:
- 404 → `Issue <KEY> não encontrada.`, exit 4.
- 401 → exit 3.

## 3. `GET /rest/api/2/issue/{key}/comment` (fallback / standalone)

**Uso**: fallback do `jira get` quando `?fields=...,comment` não traz `comments[]`.

**Request**:
```
GET /rest/api/2/issue/<KEY>/comment?maxResults=10&orderBy=-created
Authorization: Bearer <token>
Accept: application/json
```

**Response 200**:
```json
{
  "comments": [
    { "id": "...", "author": { "displayName": "..." }, "created": "...", "body": "..." }
  ],
  "total": 12,
  "maxResults": 10,
  "startAt": 0
}
```

## 4. JQL gerado por comando

| Comando | JQL |
|---------|-----|
| `mine` | `assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC` |
| `find` | (input do user) |
| `status` | `assignee = currentUser() AND status = "<STATUS>" ORDER BY updated DESC` |
| `pick` (default) | mesma do `mine` |
| `pick --jql "..."` | (input do user) |

JQL é URL-encoded antes de incluir como query param.

## 5. Erros — herança da 001

Todo handling de 4xx/5xx, TLS, timeout e ausência de schema permanece em `errors.ts` da 001 (`mapHttpToError`, `parseJiraErrorBody`). Comandos novos só lançam `JiraError` em casos específicos (Key inválida local → exitCode 2; 404 → traduzido para mensagem amigável de issue não encontrada).
