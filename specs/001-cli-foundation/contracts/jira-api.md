# Contrato: Endpoints Jira consumidos (001 Foundation)

Define os endpoints da API REST do Jira que a feature 001 consome, e o esquema de erro genérico que toda feature deve assumir.

API: Jira Server REST v2 (`<JIRA_BASE_URL>/rest/api/2/...`).

---

## 1. `GET /rest/api/2/myself`

**Uso**: comando `jira me`.

**Request**:
```
GET /rest/api/2/myself
Authorization: Bearer <JIRA_TOKEN>
User-Agent: jira-cli/<VERSION> (Node/<NODE_VERSION>)
Accept: application/json
```

**Response 200**:
```json
{
  "name": "bosco.silva",
  "displayName": "Bosco Silva",
  "emailAddress": "bosco@example.com",
  "key": "JIRAUSER12345",
  "active": true,
  "...": "outros campos não consumidos"
}
```

**Campos consumidos**: `name`, `displayName`, `emailAddress`, `key`.
**Campos extras**: ignorados silenciosamente.

**Response 401**: token inválido/expirado → JiraError exitCode 3, mensagem `Falha na autenticação — verifique seu JIRA_TOKEN`.

---

## 2. Esquema de erro Jira (RF-013)

Endpoints Jira que falham retornam, em geral, um destes formatos. Todo módulo `errors.ts` deve ser capaz de extrair mensagem de qualquer um:

### 2.1 Formato canônico (mais comum em 4xx)
```json
{
  "errorMessages": ["A issue não foi encontrada"],
  "errors": {}
}
```

### 2.2 Formato com erros de campo (em validação 400)
```json
{
  "errorMessages": [],
  "errors": {
    "summary": "Summary é obrigatório",
    "priority": "Prioridade inválida"
  }
}
```

### 2.3 Formato proxy/gateway (502, 504)
- HTML inteiro (página de erro do reverse proxy)
- Texto puro
- Body vazio

### 2.4 Formato desconhecido
- JSON sem `errorMessages` nem `errors` — schema de versão antiga ou customização

**Estratégia de parse** (`errors.ts`):

1. Se `Content-Type: application/json` E body parseável:
   - Se `errorMessages.length > 0`: junta com `; `.
   - Senão se `errors` (objeto) tem chaves: `<campo>: <mensagem>` separados por `; `.
   - Senão: cai para 3.
2. Se body é string não-JSON E não-vazia:
   - **NÃO** despeja conteúdo bruto (RF-013); usa apenas `HTTP <status> <statusText>`.
3. Body vazio ou irreconhecível:
   - Mensagem genérica: `HTTP <status> <statusText> — verifique conectividade ou status do servidor Jira`.

Mensagem final é repassada ao usuário via `JiraError`. Body bruto **nunca** vai ao terminal.

---

## 3. Headers obrigatórios em toda requisição

| Header | Valor |
|--------|-------|
| `Authorization` | `Bearer <JIRA_TOKEN>` (RF-017) |
| `User-Agent` | `jira-cli/<VERSION> (Node/<NODE_VERSION>)` (RF-023) |
| `Accept` | `application/json` |
| `Content-Type` | `application/json` (apenas em POST/PUT/DELETE com body) |

---

## 4. SSL bypass

Quando `JIRA_INSECURE=true`:

```ts
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({
  connect: { rejectUnauthorized: false }
}));
```

Aplicado uma vez no `cli.ts` antes de qualquer fetch. Não desativa validação por requisição — é global no processo, ok porque processo CLI é one-shot.

---

## 5. Timeout

`AbortController` com `setTimeout(controller.abort, config.timeoutMs)`. Default 30000ms; override via `JIRA_TIMEOUT` (segundos).

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), config.timeoutMs);
try {
  const res = await fetch(url, { headers, signal: controller.signal });
  // ...
} finally {
  clearTimeout(timer);
}
```

`AbortError` mapeado para `JiraError` exitCode 6 (`RF-008` rede/timeout).

---

## 6. Sem retry automático (RF-022)

Toda chamada é one-shot. `fetch` que falha (rede, 5xx, timeout) propaga erro imediatamente. Usuário re-executa manualmente se desejar.

---

## 7. SIGINT

`AbortController` global em `signal.ts`; handler `process.on('SIGINT', ...)` chama `controller.abort()` na requisição corrente, faz cleanup de tmp files registrados, exit 130.
