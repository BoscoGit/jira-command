# Phase 1 — Data Model: Criação e Gerenciamento (006)

Sem persistência. Modelos descrevem entidades Jira novas + shapes de criação.

---

## E1. CreateIssueBody

```ts
interface CreateIssueBody {
  fields: {
    project: { key: string };
    summary: string;
    issuetype: { name: string };
    description?: string;
    priority?: { name: string };
    assignee?: { name: string };
    parent?: { key: string };  // só em subtask
  };
}
```

POST 201 retorna `{ id, key, self }`.

## E2. CreatedIssue

```ts
interface CreatedIssue {
  key: string;
  url: string;  // <baseUrl>/browse/<key>
}
```

Construído em memória — `url` montado pelo command, não vem da API.

## E3. Subtask (item de listagem)

Origem: `GET /issue/{key}?fields=subtasks` → `fields.subtasks[]`.

| Campo | Tipo | Origem |
|-------|------|--------|
| `key` | `string` | `key` |
| `status` | `string` | `fields.status.name` |
| `type` | `string` | `fields.issuetype.name` |
| `summary` | `string` | `fields.summary` |

## E4. CreateLinkBody

```ts
interface CreateLinkBody {
  type: { name: string };
  outwardIssue: { key: string };  // FROM
  inwardIssue: { key: string };   // TO
}
```

POST 201 sem body relevante.

## E5. IssueLink (item de listagem)

Origem: `GET /issue/{key}?fields=issuelinks` → `fields.issuelinks[]`.

| Campo | Tipo | Lógica |
|-------|------|--------|
| `direction` | `'->' \| '<-'` | `'->'` se `outwardIssue` presente; `'<-'` se `inwardIssue` |
| `type` | `string` | `type.outward` (se `->`) ou `type.inward` (se `<-`) |
| `key` | `string` | `outwardIssue.key` ou `inwardIssue.key` |
| `status` | `string` | `(...).fields.status.name` |
| `summary` | `string` | `(...).fields.summary` |

## E6. Project

Origem: `GET /project` (com `--all`) ou JQL search (sem `--all`).

| Campo | Tipo | Origem |
|-------|------|--------|
| `key` | `string` | `key` |
| `id` | `string` | `id` |
| `name` | `string` | `name` |
| `issues` | `number` | (apenas sem `--all`) contagem agrupada por key |

## E7. User

Origem: `GET /user/assignable/search`.

| Campo | Tipo | Origem |
|-------|------|--------|
| `username` | `string` | `name` |
| `name` | `string` | `displayName` |
| `email` | `string` | `emailAddress` |
| `active` | `boolean` | `active` |

## E8. Saída de comandos

| Comando | Humana | JSON |
|---------|--------|------|
| `new` | stderr `Issue criada: <KEY>\n<URL>`; stdout `<KEY>` | `{ok:true, key, action:'new', url}` |
| `new --quiet` | stdout `<KEY>` apenas | idem (`--json` prevalece se ambos) |
| `sub` | stderr `Subtask criada: <KEY> (parent <P>)\n<URL>`; stdout `<KEY>` | `{ok:true, key, action:'sub', url, parent}` |
| `subs` | tabela KEY/STATUS/TIPO/RESUMO; vazio: "<KEY> não tem subtasks." | array |
| `link` | stderr `Link criado: <FROM> -[<TYPE>]-> <TO>.` | `{ok:true, action:'link', from, to, type}` |
| `links` | tabela DIREÇÃO/TIPO/ISSUE/STATUS/RESUMO; vazio: "<KEY> não tem links." | array |
| `projects` | tabela KEY/ID/NOME/ISSUES (com `--all`: KEY/ID/NOME) | array |
| `users` | tabela USERNAME/NOME/EMAIL/ATIVO; rodapé: `<N> usuários encontrados.` | array |

## E9. Mensagens-chave

| Cenário | Mensagem |
|---------|----------|
| `new` summary vazio | `--summary é obrigatório.` |
| `subs` vazio | `<KEY> não tem subtasks.` |
| `links` vazio | `<KEY> não tem links.` |
| `projects` vazio | `Nenhum projeto encontrado.` |
| `users` vazio | `Nenhum usuário encontrado em <PROJETO>.` |
| `projects` truncado | `Mostrando projetos baseados em até 500 issues — pode estar incompleto. Use --all para listar todos.` (stderr) |

---

## Resumo

7 entidades. Funções REST encapsuladas em 4 módulos novos (`create.ts`, `links.ts`, `projects.ts`, `users.ts`).
