# Especificação de Feature: Criação e Gerenciamento de Issues

**Branch**: `006-create-manage`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Criar uma nova issue (Prioridade: P1)

Um desenvolvedor quer criar uma nova issue em um projeto sem abrir o browser, informando título, tipo e opcionalmente descrição e prioridade.

**Por que esta prioridade**: Criação de tasks, bugs e stories é parte do fluxo diário de desenvolvimento.

**Teste independente**: Executar `jira new --project ABC --summary "Bug no login"` — deve criar a issue, imprimir a Key gerada e a URL da issue.

**Cenários de Aceite**:

1. **Dado** projeto e título válidos, **Quando** `jira new --project <PROJETO> --summary "<TITULO>"` é executado, **Então** cria a issue como "Task" por padrão, exibe `Issue criada: <KEY>` em stderr e a URL completa em stderr; stdout recebe a Key (uma linha)
2. **Dado** a flag `--type Bug`, **Quando** `jira new --project <PROJETO> --summary "<TITULO>" --type Bug` é executado, **Então** cria a issue do tipo Bug
3. **Dado** as flags opcionais `--desc`, `--priority` e `--assignee`, **Quando** informadas, **Então** a issue é criada com esses campos preenchidos
4. **Dado** um projeto inexistente, **Quando** `jira new --project <PROJETO> ...` é executado, **Então** exibe o erro retornado pelo Jira
5. **Dado** que `--summary` não é informado, **Quando** o comando é executado, **Então** exibe: `--summary é obrigatório` e sai com código 2
6. **Dado** a flag `--quiet`, **Quando** `jira new --project P --summary S --quiet` é executado, **Então** stdout recebe apenas a Key, sem URL nem mensagens decorativas — habilitando `jira new ... --quiet | jira assign`

---

### História 2 - Criar uma subtask de uma issue existente (Prioridade: P2)

Um desenvolvedor quer dividir uma issue em subtasks sem precisar informar o projeto manualmente — ele já é herdado do parent.

**Por que esta prioridade**: Decomposição de tasks é prática comum no planejamento de sprint.

**Teste independente**: Executar `jira sub --parent ABC-123 --summary "Implementar handler"` — deve criar subtask herdando o projeto do parent e imprimir a Key gerada.

**Cenários de Aceite**:

1. **Dado** um parent válido e um título, **Quando** `jira sub --parent <KEY> --summary "<TITULO>"` é executado, **Então** cria a subtask como "Sub-task" por padrão, herdando o projeto do parent, e exibe a Key gerada e URL
2. **Dado** a flag `--type "Subtarefa"` (PT-BR), **Quando** informada, **Então** usa o tipo informado ao invés do padrão
3. **Dado** um parent inexistente, **Quando** `jira sub --parent <KEY> ...` é executado, **Então** exibe: `Issue <KEY> não encontrada.`

---

### História 3 - Listar subtasks de uma issue (Prioridade: P2)

Um desenvolvedor quer ver rapidamente quais subtasks existem em uma issue para entender o progresso de decomposição.

**Por que esta prioridade**: Verificação de progresso — necessário para issues grandes divididas em subtasks.

**Teste independente**: Executar `jira subs ABC-123` — deve listar Key, Status, Tipo e Resumo de cada subtask.

**Cenários de Aceite**:

1. **Dado** uma issue com subtasks, **Quando** `jira subs <KEY>` é executado, **Então** exibe tabela com Key, Status, Tipo e Resumo
2. **Dado** uma issue sem subtasks, **Quando** `jira subs <KEY>` é executado, **Então** exibe: `<KEY> não tem subtasks.`

---

### História 4 - Criar link entre duas issues (Prioridade: P2)

Um desenvolvedor quer registrar a relação entre duas issues (bloqueio, duplicata, relacionamento) diretamente do terminal.

**Por que esta prioridade**: Rastreabilidade — links entre issues são usados em relatórios e análise de dependências.

**Teste independente**: Executar `jira link --from ABC-1 --type Blocks --to ABC-2` — deve criar o link e confirmar.

**Cenários de Aceite**:

1. **Dado** duas issues e um tipo de link válido, **Quando** `jira link --from <FROM> --type <TIPO> --to <TO>` é executado, **Então** o link é criado e exibe: `Link criado: <FROM> -[<TIPO>]-> <TO>.`
2. **Dado** um tipo de link inválido, **Quando** o comando é executado, **Então** exibe o erro retornado pelo Jira

---

### História 5 - Listar links de uma issue (Prioridade: P2)

Um desenvolvedor quer ver todas as dependências e relacionamentos de uma issue.

**Por que esta prioridade**: Necessário antes de fechar uma issue — verificar se não há bloqueios ativos.

**Teste independente**: Executar `jira links ABC-123` — deve listar todos os links (entrada e saída) com Direção, Tipo, Issue e Status.

**Cenários de Aceite**:

1. **Dado** uma issue com links, **Quando** `jira links <KEY>` é executado, **Então** exibe tabela com Direção (`->` ou `<-`), Tipo do link, Key da issue relacionada, Status e Resumo
2. **Dado** uma issue sem links, **Quando** `jira links <KEY>` é executado, **Então** exibe: `<KEY> não tem links.`

---

### História 6 - Listar projetos disponíveis (Prioridade: P3)

Um desenvolvedor quer descobrir as chaves dos projetos disponíveis no Jira, especialmente ao criar uma nova issue.

**Por que esta prioridade**: Necessário ao criar issues — o desenvolvedor precisa conhecer a chave do projeto.

**Teste independente**: Executar `jira projects` — deve listar projetos onde o usuário tem issues atribuídas. `jira projects --all` lista todos os projetos visíveis.

**Cenários de Aceite**:

1. **Dado** nenhuma flag, **Quando** `jira projects` é executado, **Então** exibe tabela com Key, ID, Nome e contagem de issues do usuário — apenas projetos onde é assignee ou reporter
2. **Dado** a flag `--all`, **Quando** `jira projects --all` é executado, **Então** exibe todos os projetos visíveis no Jira em ordem alfabética por Key
3. **Dado** nenhum projeto encontrado, **Quando** o comando é executado, **Então** exibe: `Nenhum projeto encontrado.`

---

### História 7 - Listar usuários atribuíveis a um projeto (Prioridade: P3)

Um desenvolvedor quer descobrir os usernames disponíveis para atribuição em um projeto, ao usar `jira assign --user`.

**Por que esta prioridade**: Descoberta de usernames — sem esta função o usuário precisa abrir o browser para encontrar usernames.

**Teste independente**: Executar `jira users MTET` — deve listar todos os usuários atribuíveis ao projeto. `jira users MTET --filter silva` filtra por substring.

**Cenários de Aceite**:

1. **Dado** uma chave de projeto válida, **Quando** `jira users <PROJETO>` é executado, **Então** exibe tabela com Username, Nome, E-mail e status Ativo — ordenada por Nome
2. **Dado** a flag `--filter <TEXTO>`, **Quando** `jira users <PROJETO> --filter silva` é executado, **Então** filtra usuários por substring no username ou nome (uma única chamada à API)
3. **Dado** sem `--filter`, **Quando** `jira users <PROJETO>` é executado, **Então** faz varredura a-z para coletar todos os usuários (26 chamadas à API) e exibe contagem de resultados
4. **Dado** um projeto sem usuários atribuíveis, **Quando** o comando é executado, **Então** exibe: `Nenhum usuário encontrado em <PROJETO>.`

---

### Casos de Borda

- O que ocorre ao criar issue com tipo inexistente no projeto (ex: "Bug" em projeto que só tem "Task")? — repassar erro do Jira
- O que ocorre quando o projeto tem muitos usuários e a varredura a-z retorna duplicatas? — deduplicar pelo `username` (chave única)
- `jira sub` com parent que já é uma subtask — o Jira permite isso? — não; repassar erro do Jira
- Tipos de link variam por instância Jira — como lidar com tipo inválido? — repassar erro do Jira; sugerir consulta a `/rest/api/2/issueLinkType` em mensagem
- Projetos PT-BR usam "Tarefa" em vez de "Task" — `--type` aceita qualquer string sem validação local
- `jira projects` (sem `--all`) limita-se a 500 issues do usuário para descobrir projetos — em casos extremos pode subestimar a contagem; ferramenta exibe aviso quando o limite é atingido

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: `jira new` DEVE aceitar `--project` (obrigatório), `--summary` (obrigatório), `--type` (padrão: "Task"), `--desc`, `--priority`, `--assignee`, `--quiet` (todos opcionais)
- **RF-002**: `jira new` DEVE exibir, em modo padrão, `Issue criada: <KEY>` e a URL em stderr e a Key em stdout; em modo `--quiet`, DEVE imprimir apenas a Key em stdout
- **RF-003**: `jira sub` DEVE aceitar `--parent` (obrigatório), `--summary` (obrigatório), `--type` (padrão: "Sub-task"), `--desc`, `--assignee`, `--quiet`; DEVE herdar o projeto do parent automaticamente
- **RF-004**: `jira subs <KEY>` DEVE listar subtasks com Key, Status, Tipo e Resumo em tabela
- **RF-005**: `jira link` DEVE aceitar `--from`, `--type` e `--to` (todos obrigatórios)
- **RF-006**: `jira links <KEY>` DEVE listar links de entrada e saída com Direção (`->` outward, `<-` inward), Tipo, Key relacionada, Status e Resumo
- **RF-007**: `jira projects` DEVE exibir projetos do usuário por padrão; `--all` DEVE listar todos os projetos visíveis em ordem alfabética por Key
- **RF-008**: `jira users <PROJETO>` DEVE listar usuários atribuíveis; `--filter <TEXTO>` DEVE usar uma única chamada à API com substring; sem `--filter` DEVE fazer varredura a-z deduplicando por `username`; DEVE exibir contagem total ao final
- **RF-009**: A separação stdout/stderr DEVE ser consistente em todos os comandos de criação: identificadores em stdout, mensagens decorativas em stderr

### Entidades Chave

- **Issue**: Key, Projeto, Tipo, Título, Descrição, Prioridade, Responsável, Parent (para subtasks)
- **Link**: Tipo, Issue Origem, Issue Destino, Direção (inward/outward)
- **Projeto**: Key, ID, Nome
- **Usuário**: Username, Nome, E-mail, Ativo

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: `jira new` e `jira sub` exibem a URL da issue criada para acesso imediato via browser
- **CS-002**: `jira users <PROJETO> --filter <TEXTO>` retorna resultado em menos de 3 segundos (uma chamada à API)
- **CS-003**: `jira sub` não requer que o desenvolvedor conheça a chave do projeto — herdada automaticamente do parent
- **CS-004**: O fluxo `jira new --project P --summary S --quiet | jira assign` funciona em pipeline — `--quiet` garante que apenas a Key seja emitida em stdout

## Premissas

- O tipo padrão de issue é "Task"; o tipo padrão de subtask é "Sub-task" — ambos podem ser sobrescritos com `--type`
- Projetos Jira em PT-BR podem usar "Subtarefa" em vez de "Sub-task" — `--type` aceita qualquer string sem validação local
- A varredura a-z para listar usuários sem filtro é necessária porque o Jira Server exige um username não-vazio na busca
- Links outward usam `->` e inward usam `<-` na exibição para indicar direção
