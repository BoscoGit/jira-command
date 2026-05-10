# Contrato: Endpoints Jira consumidos (006 Create + Manage)

Estende contratos 001..005. Headers, parser de erro, SSL/timeout/no-retry preservados.

API: Jira Server REST v2.

---

## 1. `POST /rest/api/2/issue`

**Uso**: `jira new`, `jira sub`.

**Request** (issue regular):
```json
{
  "fields": {
    "project": { "key": "ABC" },
    "summary": "Bug no login",
    "issuetype": { "name": "Task" },
    "description": "...",
    "priority": { "name": "High" },
    "assignee": { "name": "joao" }
  }
}
```

**Request** (subtask):
```json
{
  "fields": {
    "project": { "key": "<HERDADO>" },
    "summary": "Implementar handler",
    "issuetype": { "name": "Sub-task" },
    "parent": { "key": "ABC-123" },
    "description": "...",
    "assignee": { "name": "..." }
  }
}
```

Campos opcionais (`description`, `priority`, `assignee`) omitidos quando ausentes/vazios.

**Response 201**:
```json
{ "id": "10001", "key": "ABC-456", "self": "..." }
```

**Campos consumidos**: `key`. URL é montada localmente como `<baseUrl>/browse/<key>`.

**Erros**:
- 400 (project não existe, type inválido, summary vazio) → mensagem do servidor.

## 2. `GET /rest/api/2/issue/{key}?fields=project`

**Uso**: `jira sub` (herança de projeto). Lê apenas `fields.project.key`.

## 3. `GET /rest/api/2/issue/{key}?fields=subtasks`

**Uso**: `jira subs`.

**Response**:
```json
{
  "fields": {
    "subtasks": [
      {
        "key": "ABC-501",
        "fields": {
          "summary": "...",
          "status": { "name": "..." },
          "issuetype": { "name": "Sub-task" }
        }
      }
    ]
  }
}
```

## 4. `POST /rest/api/2/issueLink`

**Uso**: `jira link`.

**Request**:
```json
{
  "type": { "name": "Blocks" },
  "outwardIssue": { "key": "ABC-1" },
  "inwardIssue": { "key": "ABC-2" }
}
```

**Response 201 No Content** (alguns servers retornam 200 sem body).

**Erros**:
- 400 (tipo inválido) → mensagem do servidor + sugestão de consultar `/rest/api/2/issueLinkType`.

## 5. `GET /rest/api/2/issue/{key}?fields=issuelinks`

**Uso**: `jira links`.

**Response**:
```json
{
  "fields": {
    "issuelinks": [
      {
        "type": { "name": "Blocks", "outward": "blocks", "inward": "is blocked by" },
        "outwardIssue": {
          "key": "ABC-2",
          "fields": { "summary": "...", "status": { "name": "..." } }
        }
      },
      {
        "type": { "name": "Relates", "inward": "relates to", "outward": "relates to" },
        "inwardIssue": {
          "key": "ABC-3",
          "fields": { "summary": "...", "status": { "name": "..." } }
        }
      }
    ]
  }
}
```

Cada item tem `outwardIssue` OU `inwardIssue`, nunca ambos. Mapear:
- Se `outwardIssue` presente → `direction: '->'`, `type: type.outward`, `key: outwardIssue.key`.
- Se `inwardIssue` presente → `direction: '<-'`, `type: type.inward`, `key: inwardIssue.key`.

## 6. `GET /rest/api/2/project`

**Uso**: `jira projects --all`.

**Response 200**: array
```json
[
  { "key": "ABC", "id": "10001", "name": "Alpha Project" },
  { "key": "XYZ", "id": "10002", "name": "Xenon" }
]
```

## 7. `GET /rest/api/2/search` (para `jira projects` sem `--all`)

**JQL**: `assignee = currentUser() OR reporter = currentUser()`
**Query**: `?fields=project&maxResults=500`

Agrupa `issues[].fields.project` por `key` em memória, conta. Quando `total > 500`, exibe aviso de truncamento.

## 8. `GET /rest/api/2/user/assignable/search`

**Uso**: `jira users`.

**Com `--filter`**: 1 chamada
```
GET /rest/api/2/user/assignable/search?project=ABC&username=<TEXTO>&maxResults=1000
```

**Sem `--filter`**: 26 chamadas paralelas via `Promise.all`
```
GET /rest/api/2/user/assignable/search?project=ABC&username=a&maxResults=1000
GET /rest/api/2/user/assignable/search?project=ABC&username=b&maxResults=1000
... (a-z)
```

Deduplica por `name` (username).

**Response 200**: array
```json
[
  { "name": "joao.silva", "displayName": "João Silva", "emailAddress": "j@x", "active": true }
]
```

## 9. Headers e fluxo

Mesma matriz da 001. Sem retry. Validação de Key local antes de qualquer fetch quando `<KEY>` é parâmetro.
