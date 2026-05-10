# Contrato: Endpoints Jira consumidos (004 Editing)

Estende contratos 001/002/003. Headers, parser de erro, SSL/timeout/no-retry preservados.

API: Jira Server REST v2.

---

## 1. `PUT /rest/api/2/issue/{key}/assignee`

**Uso**: `jira assign`, `jira unassign`.

**Request (atribuir)**:
```
PUT /rest/api/2/issue/<KEY>/assignee
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "<USERNAME>" }
```

**Request (desatribuir)**:
```json
{ "name": null }
```

**Response 204 No Content**: sucesso. Sem body.

**Erros**:
- 400 (username inexistente): mensagem do servidor.
- 403: exit 5 (RF-008 da 001).
- 404: exit 4.

## 2. `PUT /rest/api/2/issue/{key}` (campos)

**Uso**: `jira prio`, `jira summary`, `jira desc`.

**Request (priority)**:
```json
{ "fields": { "priority": { "name": "High" } } }
```

**Request (summary)**:
```json
{ "fields": { "summary": "Novo título" } }
```

**Request (description)**:
```json
{ "fields": { "description": "Texto plano ou wiki markup" } }
```

**Response 204 No Content**: sucesso.

**Erros**:
- 400: mensagem do servidor (priority inválida, summary vazio, etc.).
- 403/404: idem 1.

## 3. `PUT /rest/api/2/issue/{key}` (labels via update)

**Uso**: `jira label`, `jira label-del`.

**Request (adicionar)**:
```json
{ "update": { "labels": [ { "add": "backend" } ] } }
```

**Request (remover)**:
```json
{ "update": { "labels": [ { "remove": "backend" } ] } }
```

**Response 204 No Content**: idempotente — sucesso mesmo se label já existir (add) ou não existir (remove).

## 4. `GET /rest/api/2/issue/{key}?fields=description`

**Uso**: leitura inicial em `jira desc`.

**Response 200**:
```json
{
  "key": "ABC-1",
  "fields": { "description": "<texto ou null>" }
}
```

**Campo consumido**: apenas `fields.description`.

## 5. `GET /rest/api/2/myself`

**Uso**: resolver `--user me` (ou `--user` ausente) em `jira assign`.

Já documentado em `001/contracts/jira-api.md` §1. Aqui consumimos apenas `name` (não `displayName`/`emailAddress`/`key`).

## 6. Headers e fluxo

Mesma matriz da 001 (`Authorization`, `User-Agent`, `Accept`, `Content-Type` em PUT). Sem retry (RF-022 da 001). Validação de Key local antes de qualquer fetch (`validateKey` da 002 / RF-008 spec 002).
