# Contrato: Superfície do CLI (006 Create + Manage)

Estende contratos 001..005. Última feature do MVP. Flags globais e exit codes preservados.

## Comandos novos

| Comando | Args | Token | Notas |
|---------|------|-------|-------|
| `jira new` | flags `--project` `--summary` obrig; `--type --desc --priority --assignee --quiet` opc | sim | cria issue |
| `jira sub` | flags `--parent` `--summary` obrig; `--type --desc --assignee --quiet` opc | sim | herda projeto |
| `jira subs <KEY>` | KEY opc | sim | listagem; pipe-ready |
| `jira link` | flags `--from` `--type` `--to` obrig | sim | cria link |
| `jira links <KEY>` | KEY opc | sim | listagem; pipe-ready |
| `jira projects [--all]` | sem args | sim | listagem |
| `jira users <PROJETO> [--filter <T>]` | PROJETO obrig | sim | a-z scan ou filter |

## Flags

### `jira new`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--project <P>` | — (obrig) | chave do projeto |
| `--summary "<S>"` | — (obrig) | título |
| `--type <T>` | `Task` | tipo da issue |
| `--desc <D>` | — | descrição |
| `--priority <P>` | — | nome da prioridade |
| `--assignee <U>` | — | username destino |
| `--quiet` | — | imprime apenas Key em stdout (RF-002) |

### `jira sub`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--parent <K>` | — (obrig) | Key da issue parent |
| `--summary "<S>"` | — (obrig) | título |
| `--type <T>` | `Sub-task` | tipo (PT-BR pode usar "Subtarefa") |
| `--desc <D>` | — | descrição |
| `--assignee <U>` | — | username destino |
| `--quiet` | — | imprime apenas Key em stdout |

### `jira link`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--from <F>` | — (obrig) | Key origem |
| `--type <T>` | — (obrig) | nome do tipo de link (ex: Blocks, Relates) |
| `--to <TO>` | — (obrig) | Key destino |

### `jira projects`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--all` | — | lista todos os projetos visíveis (não só do usuário) |

### `jira users`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--filter <T>` | — | substring no username/displayName (1 chamada API) |

## Saída humana

| Comando | Mensagem |
|---------|----------|
| `new` | stderr `Issue criada: <KEY>` + `<URL>`; stdout `<KEY>` |
| `new --quiet` | stdout `<KEY>` (sem mensagem stderr) |
| `sub` | stderr `Subtask criada: <KEY> (parent <P>)` + `<URL>`; stdout `<KEY>` |
| `sub --quiet` | stdout `<KEY>` |
| `subs` | tabela KEY/STATUS/TIPO/RESUMO; vazio: `<KEY> não tem subtasks.` |
| `link` | stderr `Link criado: <FROM> -[<TYPE>]-> <TO>.` |
| `links` | tabela DIREÇÃO/TIPO/ISSUE/STATUS/RESUMO; vazio: `<KEY> não tem links.` |
| `projects` | tabela KEY/ID/NOME/ISSUES; com `--all`: KEY/ID/NOME (sem coluna ISSUES); vazio: `Nenhum projeto encontrado.` |
| `users` | tabela USERNAME/NOME/EMAIL/ATIVO + rodapé `<N> usuários encontrados.`; vazio: `Nenhum usuário encontrado em <PROJETO>.` |

## Saída JSON (RF-019 da 001)

| Comando | Sucesso |
|---------|---------|
| `new` | `{ok:true, key, action:'new', url}` |
| `sub` | `{ok:true, key, action:'sub', url, parent}` |
| `subs` | array `[{key, status, type, summary}]` |
| `link` | `{ok:true, action:'link', from, to, type}` |
| `links` | array `[{direction, type, key, status, summary}]` |
| `projects` | array `[{key, id, name, issues?}]` |
| `users` | array `[{username, name, email, active}]` |

## Exit codes específicos

| Cenário | Código |
|---------|--------|
| `--summary` ou outros obrig ausentes (citty pega) | 2 |
| Key inválida em `--parent`, `--from`, `--to`, `<KEY>` | 2 |
| Type/projeto inexistente (400 do servidor) | 1 |
| Link type inválido (400) | 1 |

## Mensagens-chave

| Cenário | Mensagem |
|---------|----------|
| `subs` vazio | `<KEY> não tem subtasks.` |
| `links` vazio | `<KEY> não tem links.` |
| `projects` vazio | `Nenhum projeto encontrado.` |
| `users` vazio | `Nenhum usuário encontrado em <PROJETO>.` |
| `projects` truncado (>500) | `Mostrando projetos baseados em até 500 issues — pode estar incompleto. Use --all para listar todos.` (stderr) |
| Link inválido (sugestão) | `Tipo de link '<T>' inválido. Consulte tipos válidos via /rest/api/2/issueLinkType.` (após erro do servidor) |

## Mudanças que rompem contrato

Renomear flags, alterar shape de `--json`, alterar mensagens.
