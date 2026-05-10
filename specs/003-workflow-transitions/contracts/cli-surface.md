# Contrato: Superfície do CLI (003 Transitions)

Estende `001-cli-foundation/contracts/cli-surface.md` e `002-issue-browsing/contracts/cli-surface.md`. Flags globais (`--json`, `--no-color`, `--help`, `--version`), exit codes e separação stdout/stderr permanecem.

## Comandos novos

| Comando | Args | Pipe-ready | Token requerido | Notas |
|---------|------|------------|-----------------|-------|
| `jira start <KEY>` | KEY posicional opcional | sim (RF-012) | sim | move para "In Progress" via match |
| `jira done <KEY>` | KEY posicional opcional | sim | sim | move para "Done" via match |
| `jira stop <KEY>` | KEY posicional opcional | sim | sim | move para "To Do" via match |
| `jira trans <KEY>` | KEY posicional opcional | sim | sim | lista transições (somente leitura) |
| `jira move <KEY> <ID>` | KEY posicional opcional, ID obrigatório | parcial | sim | aplica transição por ID numérico |

`jira move` em pipeline: `<KEY>` vem do stdin, `<ID>` deve ser argumento. Ex: `jira pick | jira move 21`.

## Variáveis de ambiente novas

| Var | Default | Descrição |
|-----|---------|-----------|
| `JIRA_PATTERN_START` | regex de defaults | sobrescreve match de `jira start` |
| `JIRA_PATTERN_DONE` | regex de defaults | sobrescreve match de `jira done` |
| `JIRA_PATTERN_STOP` | regex de defaults | sobrescreve match de `jira stop` |

Validação: env regex inválida → JiraError exitCode 2 com mensagem `JIRA_PATTERN_<KIND> inválido: <erro>`.

## Saída

### `jira start | done | stop | move` (ações)

**Humana**:
- Sucesso (stderr): `<KEY> movida para '<TO_NAME>'.` (verde quando TTY).
- Match nenhum: `Transição '<LABEL>' não disponível em <KEY>. Transições disponíveis:` + lista `<ID> - <NAME> -> <TO>`.
- Match ambíguo: `Várias transições correspondem ao padrão em <KEY>: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.`
- `move` com ID inexistente: `Transição <ID> não encontrada para <KEY>. Execute 'jira trans <KEY>' para ver as disponíveis.`
- 403: `Sem permissão para realizar esta transição em <KEY>.`

**JSON** (RF-019 da 001):
- Sucesso: `{ "ok": true, "key": "<KEY>", "action": "start"|"done"|"stop"|"move", "transitionId": "<id>", "to": "<TO_NAME>" }`
- Falha: `{ "ok": false, "error": "<msg>", "exitCode": N }`

### `jira trans` (listagem)

**Humana**: tabela com colunas ID, Nome, Para.
**JSON**: array `[{ "id": "<id>", "name": "<name>", "to": "<to_name>" }]`. Sem envelope.
**Vazio**: `Nenhuma transição disponível para <KEY> no estado atual.`

## Exit codes

| Cenário | Código |
|---------|--------|
| Sucesso (transição aplicada / lista exibida) | 0 |
| Match nenhum, match ambíguo, ID inexistente em `move` | 1 |
| Key inválida (validação local) | 2 |
| 401 auth | 3 |
| 404 (issue não existe) | 4 |
| 403 sem permissão na transição | 5 |
| Rede/timeout | 6 |

## Mensagens-chave

| Cenário | Mensagem |
|---------|----------|
| Sucesso | `<KEY> movida para '<TO_NAME>'.` |
| Match nenhum em `start` | `Transição 'Em Andamento' não disponível em <KEY>. Transições disponíveis:` |
| Match nenhum em `done` | `Transição 'Concluído' não disponível em <KEY>. Transições disponíveis:` |
| Match nenhum em `stop` | `Transição 'A Fazer' não disponível em <KEY>. Transições disponíveis:` |
| Match ambíguo | `Várias transições correspondem ao padrão em <KEY>: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.` |
| ID `move` inexistente | `Transição <ID> não encontrada para <KEY>. Execute 'jira trans <KEY>' para ver as disponíveis.` |
| 403 transição | `Sem permissão para realizar esta transição em <KEY>.` |
| `trans` vazio | `Nenhuma transição disponível para <KEY> no estado atual.` |

## Mudanças que rompem este contrato

Renomear flags ou env vars; alterar shape de `--json` em ações ou listagem; alterar mensagens-chave.
