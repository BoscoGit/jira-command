# Contrato: Endpoints Jira consumidos (003 Transitions)

Estende contratos de 001 e 002. Headers, parser de erro e SSL/timeout/no-retry continuam idênticos.

API: Jira Server REST v2.

---

## 1. `GET /rest/api/2/issue/{key}/transitions`

**Uso**: `jira trans`, `jira start`, `jira done`, `jira stop`, e `jira move` (para validar ID).

**Request**:
```
GET /rest/api/2/issue/<KEY>/transitions
Authorization: Bearer <token>
Accept: application/json
```

**Response 200**:
```json
{
  "expand": "transitions",
  "transitions": [
    {
      "id": "21",
      "name": "Start Progress",
      "to": {
        "self": "...",
        "description": "...",
        "iconUrl": "...",
        "name": "In Progress",
        "id": "3",
        "statusCategory": { "key": "indeterminate" }
      },
      "hasScreen": false,
      "isGlobal": false
    }
  ]
}
```

**Campos consumidos**: `transitions[].id`, `transitions[].name`, `transitions[].to.name`. Outros ignorados.

**Erros**:
- 404 → `Issue <KEY> não encontrada.` (mesmo helper do `jira get`).
- 401 → exit 3.

## 2. `POST /rest/api/2/issue/{key}/transitions`

**Uso**: `jira start`, `jira done`, `jira stop`, `jira move`.

**Request**:
```
POST /rest/api/2/issue/<KEY>/transitions
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json

{
  "transition": { "id": "<TRANSITION_ID>" }
}
```

**Response 204 No Content**: sucesso. Sem body.

**Erros**:
- 400 (transição inválida no estado atual) → mensagem do servidor via `parseJiraErrorBody` da 001.
- 403 → traduzido para `Sem permissão para realizar esta transição em <KEY>.`, exit 5.
- 404 → `Issue <KEY> não encontrada.`, exit 4.

## 3. Headers obrigatórios

Mesma matriz da 001:
- `Authorization: Bearer <JIRA_TOKEN>`
- `User-Agent: jira-cli/<VER> (Node/<NODE_VER>)`
- `Accept: application/json`
- `Content-Type: application/json` (apenas no POST com body)

## 4. Sem retry, sem expand extra

Mesmo padrão de 001/002. Cada chamada é one-shot.

## 5. Fluxo `jira start | done | stop`

1. `GET /transitions` — obtém candidatas.
2. `findTransition(transitions, regex)` em memória.
3. Caso `match: 'one'` → `POST /transitions` com ID.
4. Caso `match: 'none' | 'many'` → exibe e exit 1.

## 6. Fluxo `jira move`

1. `GET /transitions` — só para validar ID e obter `to.name` para mensagem.
2. Se ID não está na lista → exit 1 com mensagem RF.
3. Senão → `POST /transitions` com ID. Sucesso → mensagem com `to.name`.

(Alternativa: pular GET e mandar POST direto, deixar Jira retornar 400. Rejeitado em D-008 do research — perde mensagem `to.name` para success log.)

## 7. Fluxo `jira trans`

1. `GET /transitions`.
2. Renderiza tabela ou JSON.
