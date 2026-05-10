# Contrato: Superfície do CLI (002 Browsing)

Estende o contrato de `001-cli-foundation/contracts/cli-surface.md`. Todas as flags globais (`--json`, `--no-color`, `--help`, `-h`, `--version`, `-V`), exit codes e separação stdout/stderr permanecem.

## Comandos novos

| Comando | Args | Pipe-ready | Token requerido | Notas |
|---------|------|------------|-----------------|-------|
| `jira mine` | — | não | sim | minhas issues abertas, ordenadas por priority/updated |
| `jira get <KEY>` | KEY posicional opcional | **sim** (RF-012) | sim | detalhes + 10 últimos comentários |
| `jira find "<JQL>"` | JQL posicional obrigatório | não | sim | busca livre |
| `jira status "<STATUS>"` | STATUS posicional obrigatório | não | sim | minhas issues filtradas |
| `jira open <KEY>` | KEY posicional opcional | **sim** | não (apenas BASE_URL) | abre browser |
| `jira pick` | — | não (produz Key em stdout para pipe seguinte) | sim | requer `fzf` |

`jira open` precisa apenas de `JIRA_BASE_URL` (constrói `<BASE>/browse/<KEY>` localmente). Pode usar `JIRA_TOKEN`=qualquer-string sem efeito; spec deixa flexível, validação minimal.

## Flags locais

### `jira find`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--limit N` | 50 | máximo de resultados (1..200) |

### `jira pick`

| Flag | Default | Descrição |
|------|---------|-----------|
| `--jql "<JQL>"` | minhas issues abertas | JQL custom |

## Validação local de Key

Antes de qualquer chamada HTTP, comandos com `<KEY>` validam contra regex `^[A-Z][A-Z0-9_]+-\d+$`.

- Falha → `Formato de Key inválido: '<entrada>'. Esperado padrão tipo ABC-123.` em stderr, exit 2.

## Pipe via stdin

Comandos pipe-ready (`get`, `open`) seguem RF-012 da 001:

- KEY posicional ausente + stdin não-TTY → lê uma Key por linha.
- Linhas vazias ignoradas.
- Trim de espaços.
- Stdin vazio + sem arg → exit 2.
- Múltiplas Keys → processa cada uma sequencialmente.

## Saída

### Listagens (`mine`, `find`, `status`)

**Humana** (default): tabela alinhada via `writeTable`. Colunas:

| Comando | Colunas |
|---------|---------|
| `mine` | Key, Prioridade, Status, Resumo |
| `find` | Key, Prioridade, Status, Responsável, Resumo |
| `status` | Key, Prioridade, Status, Resumo |

**JSON** (`--json`): array de objetos. Schema em `data-model.md` E1.

### Detalhe (`get`)

**Humana**: blocos formatados — cabeçalho + Summary/Status/Priority/Assignee/Reporter + Description + Comments.
**JSON** (`--json`): objeto único conforme `data-model.md` E2.

### Pick

**Humana**: TUI fzf (interativo). Ao selecionar, stdout = `<KEY>\n`, stderr nada decorativo.
**`--json`**: aceito mas inerte; saída continua sendo `<KEY>\n` (D-013 do research).

### Open

**Humana**: stderr = `Abrindo <KEY> no navegador...`. Stdout vazio.
**JSON** (`--json`): stdout = `{"ok":true,"key":"<KEY>","action":"open"}` (RF-019 da 001).

## Exit codes (herda 001)

| Comando | Sucesso | Falhas específicas |
|---------|---------|--------------------|
| `mine`/`find`/`status` | 0 (mesmo se zero issues) | RF-008 da 001 |
| `get` | 0 | 4 se issue não existe; 2 se Key inválida |
| `open` | 0 | 2 se Key inválida; 6 se browser falhou ao spawn |
| `pick` | 0 com Key emitida | 1 se ESC (cancelado); 1 se `fzf` ausente |

## Mensagens específicas

| Cenário | Mensagem |
|---------|----------|
| Listagem vazia (`mine`) | `Nenhuma issue encontrada.` |
| Truncagem em mine | `Mostrando 50 de <total> issues.` (stderr) |
| `find` sem resultados | `Nenhuma issue encontrada para o JQL informado.` |
| `status` sem resultados | `Nenhuma issue com status "<STATUS>" encontrada.` |
| `get` issue inexistente | `Issue <KEY> não encontrada.` (404 → exit 4) |
| `pick` sem fzf | `fzf não encontrado. Instale em: https://github.com/junegunn/fzf` |
| `open` sucesso | `Abrindo <KEY> no navegador...` |
| Key inválida | `Formato de Key inválido: '<entrada>'. Esperado padrão tipo ABC-123.` |

## Mudanças que rompem este contrato

Schema de saída JSON, nomes de flags locais, comportamento de pipe-ready: requer atualização de tasks.md e re-validação dos quickstarts dependentes.
