# Contrato: Superfície do CLI (004 Editing)

Estende contratos de 001/002/003. Flags globais e exit codes preservados.

## Comandos novos

| Comando | Args | Pipe-ready | Token | Notas |
|---------|------|------------|-------|-------|
| `jira assign <KEY> [--user <U>] [--quiet]` | KEY opc | sim | sim | default user = autenticado (`me`) |
| `jira unassign <KEY>` | KEY opc | sim | sim | seta assignee=null |
| `jira prio <KEY> <PRIORIDADE>` | ambos posicionais (KEY opc, PRIO obrig) | KEY via stdin | sim | nome literal repassado |
| `jira summary <KEY> "<TITULO>"` | ambos (KEY opc, TITULO obrig) | KEY via stdin | sim | título com espaços precisa aspas |
| `jira label <KEY> <LABEL>` | ambos (KEY opc, LABEL obrig) | KEY via stdin | sim | preserva existentes |
| `jira label-del <KEY> <LABEL>` | ambos (KEY opc, LABEL obrig) | KEY via stdin | sim | preserva demais |
| `jira desc <KEY>` | KEY opc | sim (mas exige TTY do stdout) | sim | abre editor externo |

## Flags locais

### `jira assign`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--user <USERNAME>` | `me` (autenticado) | username Jira destino |
| `--quiet` | — | imprime apenas Key em stdout (RF-010 da 001) |

## Variáveis de ambiente novas

| Var | Default | Descrição |
|-----|---------|-----------|
| `EDITOR` | — | comando do editor a usar em `jira desc` |
| `VISUAL` | — | fallback de `EDITOR` |

Sem `EDITOR`/`VISUAL`:
- Windows → `notepad.exe`
- Linux/macOS → `nano` (com fallback para `vi` se ENOENT)

## Saída

### Saída humana (stderr)

| Comando | Mensagem |
|---------|----------|
| `assign` | `<KEY> atribuído a <username>.` |
| `unassign` | `<KEY> sem responsável.` |
| `prio` | `<KEY> prioridade definida para <PRIORIDADE>.` |
| `summary` | `<KEY> título atualizado.` |
| `label` | `Label '<LABEL>' adicionada em <KEY>.` |
| `label-del` | `Label '<LABEL>' removida de <KEY>.` |
| `desc` (mudou) | `<KEY> descrição atualizada.` |
| `desc` (sem mudança) | `Sem alterações em <KEY>.` |

### Saída JSON (`--json`, RF-019 da 001)

| Comando | Sucesso |
|---------|---------|
| `assign` | `{ok:true, key, action:"assign", user}` |
| `unassign` | `{ok:true, key, action:"unassign"}` |
| `prio` | `{ok:true, key, action:"prio", priority}` |
| `summary` | `{ok:true, key, action:"summary", summary}` |
| `label` | `{ok:true, key, action:"label", added}` |
| `label-del` | `{ok:true, key, action:"label-del", removed}` |
| `desc` (mudou) | `{ok:true, key, action:"desc", updated:true}` |
| `desc` (sem) | `{ok:true, key, action:"desc", updated:false}` |

Falha: `{ok:false, error, exitCode}`.

### `jira assign --quiet`

stdout = `<KEY>\n`. Mensagem decorativa "<KEY> atribuído a <username>" continua em stderr.

## Exit codes

Herda 001/002/003. Específicos desta feature:

| Cenário | Código |
|---------|--------|
| `desc` em pipe (stdout não-TTY) | 2 |
| Editor exit != 0 | 1 |
| Priority inválida (400 do servidor) | 1 |

## Mensagens-chave

| Cenário | Mensagem |
|---------|----------|
| `desc` em pipe | `desc requer terminal interativo.` |
| Editor erro | `Editor saiu com erro; descrição não foi alterada.` |
| `desc` sem mudança | `Sem alterações em <KEY>.` |

## Mudanças que rompem este contrato

Renomear flags, alterar shape de `--json` em ações, alterar mensagens-chave.
