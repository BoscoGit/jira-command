# Contrato: Superfície do CLI (001 Foundation)

Define o que `jira` expõe ao usuário e a scripts. Atualizações neste contrato exigem revisão das specs 002-006.

---

## 1. Forma do binário

```
jira <command> [args] [--flags]
```

- Binário instalado globalmente como `jira` via `package.json` field `bin`.
- Distribuição MVP: `npm link` local. Publicação em registry decidida após MVP.

---

## 2. Comandos da feature 001

| Comando | Args | Descrição | Token requerido |
|---------|------|-----------|-----------------|
| `jira` (sem args) | — | Mostra help global | Não |
| `jira --help` / `jira -h` | — | Help global | Não |
| `jira <cmd> --help` | — | Help do subcomando | Não |
| `jira --version` / `jira -V` | — | Versão do `package.json` | Não |
| `jira me` | — | Valida token, exibe usuário autenticado | **Sim** |

Demais 31 comandos serão adicionados pelas features 002-006.

---

## 3. Flags globais

| Flag | Aplicabilidade | Comportamento |
|------|----------------|---------------|
| `--help` / `-h` | qualquer comando | Exibe help, sai com 0 |
| `--version` / `-V` | comando raiz | Exibe versão, sai com 0 |
| `--json` | qualquer comando | Saída em JSON UTF-8 (RF-009/019) |
| `--no-color` | qualquer comando | Desabilita cores (RF-025) |

`--quiet` é flag local de `new`/`sub`/`assign` (RF-010), não global.

---

## 4. Variáveis de ambiente

| Var | Obrigatória | Default | Validação |
|-----|-------------|---------|-----------|
| `JIRA_TOKEN` | sim (exceto `--help`/`--version`) | — | string não-vazia |
| `JIRA_BASE_URL` | sim (idem) | — | URL válida; barras finais removidas |
| `JIRA_INSECURE` | não | (não definida) | apenas `true` (case-insensitive) ativa |
| `JIRA_TIMEOUT` | não | `30` | inteiro positivo (segundos) |
| `JIRA_PATTERN_START` | não | regex default (spec 003) | regex válida |
| `JIRA_PATTERN_DONE` | não | regex default (spec 003) | regex válida |
| `JIRA_PATTERN_STOP` | não | regex default (spec 003) | regex válida |
| `NO_COLOR` | não | (não definida) | qualquer valor não-vazio = ativa (RF-025) |
| `EDITOR` / `VISUAL` | não | fallback por SO (spec 004) | path válido |

---

## 5. Exit codes

| Código | Significado | Origem |
|--------|-------------|--------|
| `0` | Sucesso | RF-008 |
| `1` | Erro genérico | RF-008 |
| `2` | Uso inválido (arg/comando/env malformados) | RF-008 |
| `3` | Falha de autenticação (HTTP 401) | RF-008 |
| `4` | Recurso não encontrado (HTTP 404) | RF-008 |
| `5` | Permissão negada (HTTP 403) | RF-008 |
| `6` | Erro de rede / timeout | RF-008 |
| `130` | Interrompido por SIGINT (Ctrl+C) | RF-026 |

---

## 6. Convenções de I/O

- **stdout**: dados primários (tabela, JSON, Key em quiet mode).
- **stderr**: mensagens decorativas, erros, mensagens de sucesso textuais.
- **Cores**: aplicadas apenas se stdout for TTY E `NO_COLOR` não definido E `--no-color` ausente.
- **Encoding**: UTF-8 em todos os SOs (RF-024).
- **stdin pipeline**: comandos com `<KEY>` posicional leem stdin não-TTY (RF-012):
  - uma Key por linha
  - `trim()` em cada linha
  - linhas vazias ignoradas
  - stdin vazio + arg ausente → exit 2

---

## 7. Saída JSON (`--json`)

### 7.1 Listagens (`me`, `mine`, `find`, etc.)

Array de objetos OU objeto único (no caso de `me`):
```json
{ "name": "bosco", "displayName": "Bosco", "emailAddress": "bosco@...", "key": "JIRAUSER123" }
```

### 7.2 Criação (`new`, `sub`)

Objeto da entidade criada:
```json
{ "key": "ABC-456", "url": "https://jira.example.com/browse/ABC-456" }
```

### 7.3 Ações (`move`, `assign`, `comment`, `log`, ...)

Envelope de resultado (RF-019):
- Sucesso: `{ "ok": true, "key": "...", "action": "<verbo>", ... }`
- Falha: `{ "ok": false, "error": "...", "exitCode": N }` (em stdout; processo sai com exitCode)

---

## 8. SIGINT (Ctrl+C)

- Aborta requisição HTTP em andamento (`AbortController`).
- Remove tmp files registrados (relevante para `jira desc` em features futuras).
- Exit code 130.

---

## 9. User-Agent

Toda requisição HTTP inclui:
```
User-Agent: jira-cli/<package.json version> (Node/<process.version>)
```

---

## 10. Mudanças que rompem este contrato

Qualquer alteração em:
- nomes de flags globais
- exit codes
- formato JSON de listagem/criação/ação
- env vars listadas

requer atualização sincronizada em todas as specs 001-006 e suas tasks.md.
