# Especificação de Feature: Fundação do CLI

**Branch**: `001-cli-foundation`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Configurar credenciais uma vez, usar em todos os comandos (Prioridade: P1)

Um desenvolvedor configura o token Jira e a URL base via variáveis de ambiente e todos os comandos funcionam sem reentrar credenciais.

**Por que esta prioridade**: Todo o restante depende de autenticação. Sem isso, nada funciona.

**Teste independente**: Definir `JIRA_TOKEN` e `JIRA_BASE_URL`, executar `jira me` — deve retornar nome e e-mail do usuário autenticado.

**Cenários de Aceite**:

1. **Dado** que `JIRA_TOKEN` e `JIRA_BASE_URL` estão definidos no ambiente, **Quando** qualquer comando é executado, **Então** usa esses valores sem solicitar ao usuário
2. **Dado** que `JIRA_TOKEN` está ausente, **Quando** qualquer comando é executado, **Então** exibe erro claro: `Variável de ambiente JIRA_TOKEN é obrigatória`
3. **Dado** que `JIRA_BASE_URL` está ausente, **Quando** qualquer comando é executado, **Então** exibe erro claro: `Variável de ambiente JIRA_BASE_URL é obrigatória`
4. **Dado** que o token é inválido, **Quando** qualquer comando é executado, **Então** exibe: `Falha na autenticação — verifique seu JIRA_TOKEN`

---

### História 2 - Trabalhar com Jira corporativo com SSL auto-assinado (Prioridade: P2)

Um desenvolvedor em ambiente corporativo com certificado auto-assinado pode ignorar verificação SSL para usar a ferramenta.

**Por que esta prioridade**: O script PowerShell atual já ignora SSL; sem isso a ferramenta é inutilizável on-premise.

**Teste independente**: Definir `JIRA_INSECURE=true`, executar `jira me` — deve funcionar mesmo com certificado auto-assinado.

**Cenários de Aceite**:

1. **Dado** que `JIRA_INSECURE=true` está definido, **Quando** qualquer comando é executado, **Então** a validação do certificado SSL é ignorada
2. **Dado** que `JIRA_INSECURE` não está definido, **Quando** qualquer comando é executado, **Então** a validação SSL é aplicada (padrão seguro)
3. **Dado** que a verificação SSL falha e `JIRA_INSECURE` não está definido, **Quando** qualquer comando é executado, **Então** exibe: `Falha na verificação SSL — defina JIRA_INSECURE=true para certificados auto-assinados`

---

### História 3 - Descobrir comandos disponíveis sem ler documentação (Prioridade: P3)

Um desenvolvedor pode descobrir todos os comandos e sua utilização diretamente no terminal.

**Por que esta prioridade**: A ferramenta deve ser autodocumentada.

**Teste independente**: Executar `jira --help` e `jira <comando> --help` — deve listar comandos com descrições e exemplos.

**Cenários de Aceite**:

1. **Dado** que a ferramenta está instalada, **Quando** `jira --help` ou `jira` (sem argumentos) é executado, **Então** todos os grupos de comandos são listados com descrição em uma linha
2. **Dado** um comando específico, **Quando** `jira <comando> --help` é executado, **Então** exibe os argumentos, opções e pelo menos um exemplo
3. **Dado** um comando desconhecido, **Quando** é executado, **Então** exibe: `Comando desconhecido '<nome>'. Execute 'jira --help' para ver os comandos disponíveis.` e sai com código 2 (uso inválido — ver RF-008)

---

### História 4 - Saída legível por humano e por máquina (Prioridade: P2)

Um desenvolvedor quer usar a ferramenta tanto interativamente (tabela formatada) quanto em scripts (JSON ou apenas a Key).

**Por que esta prioridade**: Sem isso, scripts shell precisam parsear tabela alinhada — frágil. Habilita pipelines como `jira new ... --quiet | jira assign`.

**Teste independente**: Executar `jira mine --json` — deve emitir JSON array no stdout. Executar `jira new --project ABC --summary X --quiet` — deve emitir apenas a Key gerada (sem URL, sem mensagens decorativas) no stdout.

**Cenários de Aceite**:

1. **Dado** a flag global `--json`, **Quando** qualquer comando (listagem, criação ou ação) é executado, **Então** stdout recebe JSON válido (array ou objeto) e nada mais; mensagens decorativas vão para stderr
2. **Dado** a flag `--quiet` em `new`, `sub` ou `assign`, **Quando** o comando é executado, **Então** stdout recebe apenas o identificador essencial (Key, ID) — uma linha por item — e mensagens vão para stderr
3. **Dado** ambas `--json` e `--quiet`, **Quando** o comando é executado, **Então** `--json` prevalece

---

### História 5 - Encadear comandos via pipeline (Prioridade: P2)

Um desenvolvedor quer encadear comandos: a Key de uma issue produzida em um comando alimenta o próximo via stdin.

**Por que esta prioridade**: Reproduz a ergonomia do PowerShell pipeline (`jpick | jget`) em qualquer shell POSIX/Windows.

**Teste independente**: Executar `echo ABC-123 | jira get` — deve carregar detalhes de ABC-123 sem passar Key como argumento.

**Cenários de Aceite**:

1. **Dado** um comando que aceita `<KEY>` posicional, **Quando** a Key é omitida e stdin não é TTY, **Então** lê uma Key por linha do stdin
2. **Dado** múltiplas linhas no stdin, **Quando** o comando é executado, **Então** processa cada Key em sequência
3. **Dado** Key fornecida tanto por argumento quanto por stdin, **Quando** o comando é executado, **Então** o argumento prevalece e stdin é ignorado
4. **Dado** linhas vazias no stdin, **Quando** o comando é executado, **Então** as linhas vazias são ignoradas (não geram chamada à API nem erro)
5. **Dado** Keys com espaços/tabs ao redor (ex: `  ABC-123\n`), **Quando** o comando é executado, **Então** os espaços são removidos antes da validação de formato
6. **Dado** stdin não-TTY porém vazio (após filtrar linhas em branco), **Quando** o comando é executado sem argumento, **Então** exibe `Nenhuma Key recebida via stdin nem como argumento.` e sai com código 2

---

### Casos de Borda

- O que ocorre quando `JIRA_BASE_URL` tem barra final? — RF-004 normaliza removendo barras finais antes de qualquer requisição
- O que ocorre quando o servidor Jira está inacessível (timeout)? — exibe `Falha de rede: timeout após <N>s. Verifique JIRA_BASE_URL e conectividade.` e sai com código 6
- O que ocorre quando o servidor retorna erro 403 (sem permissão)? — exibe `Sem permissão: <mensagem do Jira>` e sai com código 5
- O que ocorre quando `--json` é usado num comando puramente de ação (ex: `jira move`)? — ver RF-019: emite `{"ok":true,"key":"...","action":"<verbo>"}` em sucesso, ou `{"ok":false,"error":"...","exitCode":N}` em falha

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: A ferramenta DEVE ler `JIRA_TOKEN` e `JIRA_BASE_URL` das variáveis de ambiente quando um comando precisar acessar a API Jira (ver RF-021 para exceções de `--help`/`--version`)
- **RF-002**: A ferramenta DEVE falhar rapidamente com mensagem legível se variáveis obrigatórias estiverem ausentes
- **RF-003**: A ferramenta DEVE suportar `JIRA_INSECURE=true` para ignorar validação SSL. Apenas o valor literal `true` (comparação case-insensitive) ativa o bypass; qualquer outro valor (`1`, `yes`, `on`, vazio, ausente) mantém a validação SSL ativa
- **RF-004**: A ferramenta DEVE normalizar `JIRA_BASE_URL` removendo barras finais
- **RF-005**: A ferramenta DEVE exibir ajuda global listando todos os comandos quando executada com `--help` ou sem argumentos
- **RF-006**: Todo subcomando DEVE suportar `--help` mostrando argumentos, opções e exemplo
- **RF-007**: A ferramenta DEVE exibir mensagem de erro significativa (não stack trace) para timeouts e conexão recusada
- **RF-008**: A ferramenta DEVE usar códigos de saída granulares: `0` sucesso; `1` erro genérico; `2` erro de uso (argumento inválido, comando desconhecido); `3` erro de autenticação (401); `4` recurso não encontrado (404); `5` permissão negada (403); `6` erro de rede/timeout
- **RF-009**: A ferramenta DEVE suportar flag global `--json` que serializa qualquer saída de listagem, criação ou ação como JSON UTF-8 no stdout, mantendo mensagens decorativas em stderr
- **RF-010**: Comandos `new`, `sub` e `assign` DEVEM aceitar `--quiet` que emite apenas o identificador essencial (Key) no stdout, viabilizando pipes
- **RF-011**: Quando uma flag `--json` e `--quiet` são combinadas, `--json` prevalece
- **RF-012**: Comandos que aceitam `<KEY>` posicional DEVEM ler Keys do stdin (uma por linha) quando stdin não é TTY e o argumento não é fornecido; quando ambos existem, o argumento prevalece. Linhas vazias DEVEM ser ignoradas; espaços/tabs ao redor de cada Key DEVEM ser removidos antes da validação. Se stdin não-TTY estiver vazio (após filtro) e nenhum argumento foi passado, DEVE sair com código 2 e mensagem de uso.
- **RF-013**: Mensagens de erro retornadas pela API Jira DEVEM ser parseadas (campo `errorMessages` / `errors`) e exibidas de forma legível, não como JSON cru. Quando a resposta NÃO contiver `errorMessages` nem `errors` (ex: HTML de proxy, texto puro, corpo vazio, schema desconhecido), a ferramenta DEVE exibir: o status HTTP numérico, o `statusText` e uma mensagem genérica acionável (ex: `HTTP 502 Bad Gateway — verifique conectividade ou status do servidor Jira`). O corpo bruto NÃO DEVE ser despejado no terminal
- **RF-014**: Distinção entre falha SSL e falha de autenticação DEVE ser explícita nas mensagens (401 → mensagem de auth; erro de TLS → mensagem de SSL com sugestão de `JIRA_INSECURE`)
- **RF-017**: A ferramenta DEVE enviar o token Jira usando o header `Authorization: Bearer <JIRA_TOKEN>`
- **RF-018**: Basic Auth e OAuth NÃO serão suportados no MVP
- **RF-019**: Quando `--json` for usado em comandos de ação (sem payload de listagem), a ferramenta DEVE emitir um objeto JSON de resultado no stdout, por exemplo `{"ok":true,"key":"ABC-123","action":"move","transitionId":"21"}`. Em caso de falha, DEVE emitir `{"ok":false,"error":"<mensagem>","exitCode":<código>}` no stdout e ainda assim sair com o código de erro apropriado
- **RF-020**: A ferramenta DEVE suportar `jira --version` e `jira -V`, imprimindo a versão definida em `package.json` no stdout e saindo com código 0
- **RF-021**: `--help`, `-h`, `--version` e `-V` DEVEM funcionar SEM `JIRA_TOKEN` ou `JIRA_BASE_URL` definidos; a validação de variáveis de ambiente DEVE ocorrer apenas quando o comando precisar acessar a API
- **RF-022**: A ferramenta NÃO DEVE retentar requisições falhas automaticamente; cada chamada à API é uma única tentativa. Falhas transitórias retornam erro ao usuário sem retry
- **RF-023**: Toda requisição HTTP DEVE incluir o header `User-Agent: jira-cli/<VERSION> (Node/<NODE_VERSION>)` para identificação nos logs do servidor Jira
- **RF-024**: O stdout e stderr DEVEM operar em UTF-8 em todos os SOs; em Windows, a ferramenta DEVE forçar encoding UTF-8 (via `chcp` programático ou configuração de stream) para preservar acentos PT-BR
- **RF-025**: A ferramenta DEVE respeitar a convenção `NO_COLOR` (https://no-color.org): quando `NO_COLOR` estiver definido (qualquer valor) ou quando stdout não for TTY, cores DEVEM ser desabilitadas. A flag `--no-color` DEVE forçar saída sem cores independentemente do ambiente
- **RF-026**: Em recebimento de SIGINT (Ctrl+C), a ferramenta DEVE: (a) abortar a requisição HTTP em andamento, (b) remover arquivos temporários criados (ex: tmp file de `jira desc`), (c) sair com código 130 (convenção POSIX para SIGINT)

### Entidades Chave

- **Configuração**: JIRA_TOKEN (autenticação Bearer), JIRA_BASE_URL (URL do servidor), JIRA_INSECURE (flag para ignorar SSL), JIRA_TIMEOUT (timeout em segundos, padrão 30)

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: Um desenvolvedor consegue configurar credenciais e executar o primeiro comando em menos de 2 minutos
- **CS-002**: Toda mensagem de erro satisfaz, simultaneamente, os critérios abaixo (verificáveis por inspeção do código e por testes):
  - (a) NÃO contém stack trace, número de linha de código fonte ou nome de função interna
  - (b) Quando a falha está ligada a configuração ausente, cita o nome exato da variável de ambiente envolvida (ex: `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_INSECURE`, `JIRA_TIMEOUT`)
  - (c) Quando a falha admite ação corretiva via comando, cita o comando exato a executar (ex: `Execute 'jira trans <KEY>' para ver as transições disponíveis.`)
  - (d) Quando a falha vem da API Jira, inclui a mensagem do servidor parseada (RF-013) — não JSON cru nem HTML de proxy
  - (e) Mensagem termina sem ponto-e-vírgula técnico ou texto de debug; usa pontuação natural em português
- **CS-003**: `jira --help` e `jira <cmd> --help` cobrem 100% dos comandos disponíveis
- **CS-004**: A ferramenta sai com código 0 no sucesso e diferente de zero em qualquer falha (verificável via `$?` / `$LASTEXITCODE`); falhas de classe distinta retornam códigos distintos
- **CS-005**: Pipeline `jira pick | jira get`, `jira new ... --quiet | jira assign` e `echo KEY | jira get` funcionam sem parsing manual

## Premissas

- Credenciais armazenadas em variáveis de ambiente (mais seguro para CI/CD, sem arquivo de configuração local)
- A instância Jira usa API REST v2 (mesma versão do script PowerShell existente)
- A ferramenta é distribuída como pacote npm com `bin` global chamado `jira`
- Autenticação é exclusivamente Bearer (Personal Access Token); Basic Auth e OAuth não são suportados
- Timeout padrão para todas as requisições HTTP: 30 segundos (override via `JIRA_TIMEOUT`)
- Motivação para mover credenciais para env vars: o script PowerShell original (`jira.ps1`) tem token hardcoded, criando risco de vazamento em commits
- Sem retry automático de requisições: simplicidade e previsibilidade. Falhas transitórias são responsabilidade do usuário (re-executar) ou de wrapper externo (script com retry)
- A versão (`--version`) é lida do `package.json` no momento do build/execução; não é hardcoded no código fonte
