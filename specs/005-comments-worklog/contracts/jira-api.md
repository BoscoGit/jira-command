# Contrato: Endpoints Jira consumidos (005 Comments + Worklog)

Estende contratos 001..004. Headers, parser de erro, SSL/timeout/no-retry preservados.

API: Jira Server REST v2.

---

## 1. `POST /rest/api/2/issue/{key}/comment`

**Uso**: `jira comment`.

**Request**:
```
POST /rest/api/2/issue/<KEY>/comment
Authorization: Bearer <token>
Content-Type: application/json

{ "body": "<texto>" }
```

**Response 201 Created**:
```json
{
  "id": "12345",
  "author": { "displayName": "Bosco" },
  "created": "2026-05-10T...",
  "body": "..."
}
```

**Campos consumidos**: `id` (para confirmar criação).

## 2. `GET /rest/api/2/issue/{key}/comment`

**Uso**: `jira comments`.

**Query**: `?maxResults=50&orderBy=-created`.

**Response 200**:
```json
{
  "comments": [
    { "id": "...", "author": { "displayName": "..." }, "created": "...", "body": "..." }
  ],
  "total": 12,
  "maxResults": 50,
  "startAt": 0
}
```

**Campos consumidos**: `comments[].id`, `comments[].author.displayName`, `comments[].created`, `comments[].body`.

## 3. `DELETE /rest/api/2/issue/{key}/comment/{id}`

**Uso**: `jira comment-del`.

**Response 204 No Content**: sucesso.

**Erros**:
- 404 (comment id inexistente) → mensagem do servidor + exit 4.
- 403 (sem permissão) → exit 5 (RF-008 da 001).

## 4. `POST /rest/api/2/issue/{key}/worklog`

**Uso**: `jira log`.

**Request**:
```
POST /rest/api/2/issue/<KEY>/worklog
Authorization: Bearer <token>
Content-Type: application/json

{ "timeSpent": "1h 30m", "comment": "<opcional>" }
```

**Response 201 Created**:
```json
{
  "id": "67890",
  "author": { "displayName": "..." },
  "started": "...",
  "timeSpent": "1h 30m",
  "comment": "..."
}
```

**Campos consumidos**: `id`, `timeSpent` (para log).

**Erros**:
- 400 (formato inválido como `1h30m` sem espaço) → mensagem do servidor parseada.

## 5. `GET /rest/api/2/issue/{key}/worklog`

**Uso**: `jira logs`.

**Response 200**:
```json
{
  "worklogs": [
    { "id": "...", "author": { "displayName": "..." }, "started": "...", "timeSpent": "...", "comment": "..." }
  ],
  "total": 5
}
```

**Campos consumidos**: `worklogs[].id`, `.author.displayName`, `.started`, `.timeSpent`, `.comment`.

## 6. Sem retry, sem expand. Validação Key local antes de qualquer fetch (validateKey de 002).
