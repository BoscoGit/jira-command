# Contrato: Superfície do CLI (005 Comments + Worklog)

Estende contratos 001..004. Flags globais e exit codes preservados.

## Comandos novos

| Comando | Args | Pipe-ready | Token | Notas |
|---------|------|------------|-------|-------|
| `jira comment <KEY> "<TEXTO>"` | KEY opc, TEXTO obrig | KEY via stdin | sim | texto sempre arg |
| `jira comments <KEY>` | KEY opc | sim | sim | 50 mais recentes |
| `jira comment-del <KEY> <ID> [--yes]` | KEY opc, ID obrig | KEY via stdin | sim | confirma antes |
| `jira log <KEY> <TEMPO> [DESCRICAO]` | KEY opc, TEMPO obrig, DESC opc | KEY via stdin | sim | tempo formato Jira |
| `jira logs <KEY>` | KEY opc | sim | sim | todos os worklogs |

## Flag local

### `jira comment-del`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--yes` | — | bypass do prompt; necessário em modo não-interativo (pipe/CI) |

## Saída humana

| Cenário | Mensagem |
|---------|----------|
| `comment` ok | `Comentário adicionado em <KEY> (#<id>).` (stderr) |
| `comment` vazio | `O texto do comentário não pode ser vazio.` + exit 2 |
| `comments` vazio | `Nenhum comentário em <KEY>.` |
| `comments` ok | tabela ID, AUTOR, DATA, COMENTÁRIO (preview 80) |
| `comment-del` prompt | `Deletar comentário <ID> de <KEY>? (s/n):` |
| `comment-del` cancelado | `Operação cancelada.` + exit 0 (intencional) |
| `comment-del` não-interativo sem --yes | `Operação cancelada (modo não-interativo). Use --yes para confirmar.` + exit 2 |
| `comment-del` deletado | `Comentário <ID> deletado.` + exit 0 |
| `log` ok | `Worklog <TEMPO> registrado em <KEY>.` |
| `logs` vazio | `Nenhum apontamento em <KEY>.` |
| `logs` ok | tabela ID, AUTOR, DATA, TEMPO, COMENTÁRIO (preview 60) |

## Saída JSON

| Comando | Sucesso |
|---------|---------|
| `comment` | `{ok:true, key, action:"comment", commentId}` |
| `comments` | array `[{id, author, created, body}]` (sem envelope) |
| `comment-del` | `{ok:true, key, action:"comment-del", commentId}` |
| `log` | `{ok:true, key, action:"log", time, worklogId}` |
| `logs` | array `[{id, author, started, timeSpent, comment}]` (sem envelope) |

## Exit codes específicos

| Cenário | Código |
|---------|--------|
| Texto de comentário vazio | 2 |
| `comment-del` sem `--yes` em pipe | 2 |
| `comment-del` resposta não-`s/y` em interativo | 0 (cancelamento limpo) |
| Tempo de worklog inválido (400) | 1 |
| 403 (sem permissão para deletar comentário de outro autor) | 5 |

## Mensagens-chave proibidas

- Não enumerar formatos de tempo localmente (RF-006: repassa do servidor).
- Não dumpar HTML/JSON cru (RF-013 da 001).

## Mudanças que rompem este contrato

Renomear flags ou comandos, alterar shape de `--json`, alterar mensagens-chave.
