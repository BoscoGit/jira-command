# Phase 0 — Pesquisa: Criação e Gerenciamento (006)

Stack já fixada (001..005). Sem `NEEDS CLARIFICATION`. Última feature do MVP — fecha o port do `jira.ps1`.

---

## D-001 — Endpoints REST

| Operação | Endpoint | Método |
|----------|----------|--------|
| Criar issue / subtask | `POST /rest/api/2/issue` | POST |
| Listar subtasks | `GET /rest/api/2/issue/{key}?fields=subtasks` | GET |
| Ler projeto do parent (para sub) | `GET /rest/api/2/issue/{parent}?fields=project` | GET |
| Criar link | `POST /rest/api/2/issueLink` | POST |
| Listar links | `GET /rest/api/2/issue/{key}?fields=issuelinks` | GET |
| Listar todos projetos | `GET /rest/api/2/project` | GET |
| Projetos do usuário (via JQL) | `GET /rest/api/2/search?jql=assignee=currentUser() OR reporter=currentUser()` | GET |
| Usuários atribuíveis (com filter) | `GET /rest/api/2/user/assignable/search?project=...&username=<filter>` | GET |
| Usuários atribuíveis (a-z scan) | mesmo endpoint, 26 chamadas iterando `username=a..z` | GET |

POST de criação retornam 201 com body `{ id, key, self }`.

## D-002 — `jira new` body shape

```json
{
  "fields": {
    "project": { "key": "<P>" },
    "summary": "<S>",
    "issuetype": { "name": "<T>" },
    "description": "<D>",
    "priority": { "name": "<P>" },
    "assignee": { "name": "<A>" }
  }
}
```

Apenas campos preenchidos vão no body — omite `description`, `priority`, `assignee` quando ausentes/vazios.

## D-003 — `jira sub` herda projeto do parent

- **Decision**: 2 chamadas obrigatórias:
  1. `GET /rest/api/2/issue/{parent}?fields=project` → extrai `fields.project.key`.
  2. `POST /rest/api/2/issue` com `parent: { key: "<parent>" }` no body.
- **Body completo**:
  ```json
  {
    "fields": {
      "project": { "key": "<HERDADO>" },
      "summary": "<S>",
      "issuetype": { "name": "<T>" },
      "parent": { "key": "<PARENT_KEY>" },
      "description": "<D>",
      "assignee": { "name": "<A>" }
    }
  }
  ```
- **Rationale**: spec H2 + CS-003. User não precisa decorar `project` quando já tem parent.

## D-004 — `--quiet` em `new` e `sub`

- **Decision**: ambos aceitam `--quiet`. Em modo padrão: stderr = `Issue criada: <KEY>` + `<URL>`; stdout = `<KEY>`. Em `--quiet`: stdout = `<KEY>` apenas (sem URL); stderr vazia.
- **Rationale**: RF-002, CS-004. Habilita pipeline `jira new ... --quiet | jira assign`.

## D-005 — `jira link` direção

- **Decision**: body `{ type: { name: "<T>" }, outwardIssue: { key: "<FROM>" }, inwardIssue: { key: "<TO>" } }`.
- **Mensagem**: `Link criado: <FROM> -[<TYPE>]-> <TO>.`.
- **Rationale**: spec H4. `outwardIssue=from` e `inwardIssue=to` resulta em "FROM blocks TO" (ou `<TIPO>` outward).

## D-006 — `jira links` listagem

- **Decision**: `GET /issue/{key}?fields=issuelinks`. Cada item de `issuelinks[]` tem ou `outwardIssue` ou `inwardIssue` (nunca ambos). Mapear para `{ direction: '->'|'<-', type, key, status, summary }` baseado em qual lado está presente.
- **Rationale**: spec H5 + RF-006.

## D-007 — `jira projects` (sem `--all`)

- **Decision**: usa JQL `assignee = currentUser() OR reporter = currentUser()` em `GET /search?fields=project&maxResults=500`. Agrupa por `project.key` em memória, conta issues por projeto. Limite 500 → quando `total > 500` exibe aviso (edge case do spec).
- **Rationale**: spec H6 critério 1. Mesmo padrão do `jira.ps1`.

## D-008 — `jira projects --all`

- **Decision**: `GET /rest/api/2/project` (sem query). Retorna array de projetos. Ordena por `key` antes de exibir.
- **Rationale**: spec H6 critério 2.

## D-009 — `jira users <PROJETO>` sem `--filter`

- **Decision**: varredura a-z — 26 chamadas paralelas `GET /user/assignable/search?project=<P>&username=<letter>&maxResults=1000`. Deduplica por `username` em Map. Mostra contagem ao final.
- **Paralelo**: `Promise.all` das 26 chamadas — speedup significativo em servidores rápidos.
- **Rationale**: spec H7 critério 3 + premise. Jira Server exige `username` não-vazio na busca.
- **Alternativas**:
  - Sequential a-z: 26x mais lento.
  - Endpoint `/user/search?username=.`: alguns Jira aceitam wildcard `.`, outros não — não confiável.

## D-010 — `jira users --filter <TEXTO>`

- **Decision**: 1 chamada `GET /user/assignable/search?project=<P>&username=<TEXTO>&maxResults=1000`.
- **Rationale**: CS-002 — < 3s.

## D-011 — Validação local

- `jira new`: `--summary` obrigatório (citty já valida); `--project` obrigatório; valida não-vazios após trim.
- `jira sub`: `--parent` valida via `validateKey` (002); `--summary` não-vazio.
- `jira link`: `--from`/`--to` validados via `validateKey`; `--type` não-vazio.
- `jira links`/`jira subs`: validateKey.

## D-012 — Saída JSON

| Comando | Sucesso |
|---------|---------|
| `new` | `{ok, key, action:'new', url}` |
| `sub` | `{ok, key, action:'sub', url, parent}` |
| `subs` | array `[{key, status, type, summary}]` |
| `link` | `{ok, action:'link', from, to, type}` |
| `links` | array `[{direction, type, key, status, summary}]` |
| `projects` | array `[{key, id, name, issues?}]` (issues só sem `--all`) |
| `users` | array `[{username, name, email, active}]` |

`new`/`sub` em `--quiet`: stdout só Key (RF-002).

## D-013 — `--quiet` precedência

`--json` global vs `--quiet` local: `--json` prevalece (RF-011 da 001 já estabelecido).

## D-014 — Datas e ordenação

`projects --all` ordena alfabeticamente por `key`. `users` ordena por `name` (displayName).

---

## Saída

Sem clarificações pendentes. Phase 0 OK. Última feature do MVP.
