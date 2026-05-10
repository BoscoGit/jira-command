# jira-command

CLI Jira em TypeScript ESM. Substitui o script PowerShell `jira.ps1`. Conecta a uma instância Jira Server v2 via Personal Access Token e expõe comandos curtos para listar, transitar, comentar, criar issues etc.

A feature **001 (Fundação)** entrega: configuração via env, autenticação Bearer, bypass SSL para servidores corporativos, ajuda global, saída humano/JSON/quiet, pipeline stdin, exit codes granulares, SIGINT limpo e o comando `jira me` para validar token.

A feature **002 (Consulta de Issues)** entrega seis comandos de leitura: `mine`, `get`, `find`, `status`, `open`, `pick`.

A feature **003 (Transições de Workflow)** entrega cinco comandos: `trans`, `start`, `done`, `stop`, `move`.

A feature **004 (Atribuição e Edição)** entrega sete comandos: `assign`, `unassign`, `prio`, `summary`, `label`, `label-del`, `desc`.

## Requisitos

- Node 22 LTS (recursos usados rodam em Node 20+, mas `engines` declara `>=22`).
- Acesso a um Jira Server REST v2 com PAT.

## Instalação (MVP — link local)

```powershell
git clone <repo>
cd jira-command
npm install
npm run build
npm link
```

`jira` fica disponível globalmente. Publicação em registry npm / GitHub Packages será decidida após validação do MVP.

## Configuração

```powershell
$env:JIRA_TOKEN     = "<seu-personal-access-token>"
$env:JIRA_BASE_URL  = "https://jira.suaempresa.com"
$env:JIRA_INSECURE  = "true"   # opcional, certificado auto-assinado
$env:JIRA_TIMEOUT   = "30"     # opcional, segundos (default 30)
```

| Var | Obrigatória | Default | Notas |
|-----|-------------|---------|-------|
| `JIRA_TOKEN` | sim (exceto `--help`/`--version`) | — | Bearer token |
| `JIRA_BASE_URL` | sim (idem) | — | barras finais removidas |
| `JIRA_INSECURE` | não | — | apenas literal `true` (case-insensitive) ativa bypass SSL |
| `JIRA_TIMEOUT` | não | `30` | inteiro positivo em segundos |
| `NO_COLOR` / `--no-color` | não | — | qualquer valor não-vazio desativa cores |

## Uso

```powershell
jira --version          # imprime versão (não exige token)
jira --help             # ajuda global
jira <cmd> --help       # ajuda de subcomando

jira me                 # valida token, exibe usuário autenticado
jira me --json          # mesma info em JSON UTF-8 (ideal para scripts)
```

### Consulta de issues (feature 002)

```powershell
jira mine                                    # minhas issues abertas (até 50, ordenadas)
jira get ABC-123                             # detalhes + 10 comentários mais recentes
jira find "project = ABC AND status = Open"  # busca livre via JQL
jira find "project = ABC" --limit 10         # com limite
jira status "In Progress"                    # minhas issues no status informado
jira open ABC-123                            # abre <BASE>/browse/ABC-123 no browser
jira pick                                    # picker interativo (requer fzf no PATH)
jira pick --jql "project = ABC"              # picker com JQL custom
jira pick | jira get                         # pipeline ergonômico
echo ABC-123 | jira open                     # pipe stdin em comandos com <KEY>
```

`fzf` é dependência opcional — instale em https://github.com/junegunn/fzf para usar `jira pick`. Demais comandos funcionam sem ele.

### Transições de workflow (feature 003)

```powershell
jira trans ABC-123                # lista transições disponíveis (ID, Nome, Para)
jira start ABC-123                # match automático para "Em Andamento"
jira done ABC-123                 # match automático para "Concluído"
jira stop ABC-123                 # match automático para "A Fazer"
jira move ABC-123 21              # aplica transição por ID exato (fallback)
jira pick | jira start            # pipeline: seleciona e inicia
echo ABC-1 | jira done            # pipe stdin
```

Match ambíguo (várias transições casando o padrão) recusa aplicar e instrui usar `jira move`. A mensagem de sucesso usa o nome real do estado destino retornado pela API (ex: "Doing", "Em desenvolvimento").

Override dos padrões via env quando workflow do projeto usa nomes customizados:

```powershell
$env:JIRA_PATTERN_START = "Custom Start Step"   # regex case-insensitive
$env:JIRA_PATTERN_DONE  = "Closed|Cancelled"
$env:JIRA_PATTERN_STOP  = "Backlog"
```

### Atribuição e edição (feature 004)

```powershell
jira assign ABC-123                          # atribui a você (default = me)
jira assign ABC-123 --user joao.silva        # atribui a outro
jira assign ABC-123 --quiet                  # imprime só a Key (pipe-friendly)
jira unassign ABC-123                        # remove responsável
jira prio ABC-123 High                       # altera prioridade
jira summary ABC-123 "Novo título"           # altera título
jira label ABC-123 backend                   # adiciona label (preserva existentes)
jira label-del ABC-123 backend               # remove label específica
jira desc ABC-123                            # abre descrição em $EDITOR
jira pick | jira assign --quiet | jira start # pipeline ergonômico
```

`jira desc` exige terminal interativo — em pipe falha com exit 2. Editor escolhido em ordem: `$EDITOR` → `$VISUAL` → `notepad.exe` (Windows) → `nano` com fallback `vi` (Linux/macOS). Sem mudança no editor → não envia PUT.

## Pipeline

Comandos com argumento `<KEY>` posicional aceitam Keys via stdin (uma por linha):

```powershell
echo "ABC-123" | jira get             # quando spec 002 entregar `get`
"ABC-1`nABC-2" | jira start           # processa cada linha
```

Linhas vazias são ignoradas. Espaços ao redor são removidos. Stdin não-TTY vazio sem argumento → exit 2.

## Exit codes

| Código | Significado |
|--------|-------------|
| `0` | Sucesso |
| `1` | Erro genérico |
| `2` | Uso inválido |
| `3` | Falha de autenticação (HTTP 401) |
| `4` | Recurso não encontrado (HTTP 404) |
| `5` | Permissão negada (HTTP 403) |
| `6` | Rede / timeout |
| `130` | Interrompido por SIGINT (Ctrl+C) |

## Desenvolvimento

```powershell
npm run dev -- me        # tsx em modo dev
npm run lint             # biome check
npm run format           # biome format --write
npm run typecheck        # tsc --noEmit
npm run test             # vitest run
npm run test:watch       # vitest em watch
npm run build            # gera dist/
```

CI (GitHub Actions): `lint`, `typecheck`, `test`, `build` em PRs e push em main/master.

## Documentação detalhada

- [`specs/001-cli-foundation/`](specs/001-cli-foundation/) — spec, plan, research, data-model, contratos, quickstart, tasks
- [`specs/002-006`](specs/) — features futuras (browse, transitions, edit, comments/worklog, create/manage)

## Encoding em Windows

Stdout/stderr operam em UTF-8 por padrão em Node 22 + Windows Terminal moderno. Em `cmd.exe` legado pode ser necessário rodar `chcp 65001` antes para preservar acentos PT-BR.
