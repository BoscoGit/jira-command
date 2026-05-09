# Especificação de Feature: Transições de Workflow

**Branch**: `003-workflow-transitions`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Iniciar trabalho em uma issue (Prioridade: P1)

Um desenvolvedor quer mover uma issue para "Em Andamento" sem precisar saber o ID exato da transição — a ferramenta encontra a transição correta automaticamente.

**Por que esta prioridade**: Ação mais frequente no workflow diário — iniciar uma tarefa.

**Teste independente**: Executar `jira start ABC-123` — deve mover a issue para o estado "In Progress" (ou equivalente em PT-BR) e confirmar a mudança.

**Cenários de Aceite**:

1. **Dado** uma issue com transição disponível para "In Progress", **Quando** `jira start <KEY>` é executado, **Então** a issue é movida e exibe: `<KEY> movida para '<NOME_DESTINO>'.` usando o nome real do estado destino retornado pela API
2. **Dado** uma issue sem transição disponível para "In Progress", **Quando** `jira start <KEY>` é executado, **Então** exibe as transições disponíveis e informa: `Transição 'Em Andamento' não disponível. Transições disponíveis: <lista>`
3. **Dado** que múltiplas transições correspondem ao padrão, **Quando** `jira start <KEY>` é executado, **Então** exibe aviso `Várias transições correspondem ao padrão: <lista>. Use 'jira move <KEY> <ID>' para escolha exata.` e não aplica nenhuma transição
4. **Dado** que a transição falha por permissão, **Quando** `jira start <KEY>` é executado, **Então** exibe: `Sem permissão para realizar esta transição em <KEY>.`

---

### História 2 - Concluir uma issue (Prioridade: P1)

Um desenvolvedor quer mover uma issue para "Concluído" ao finalizar o trabalho.

**Por que esta prioridade**: Segunda ação mais frequente no workflow — fechar uma tarefa concluída.

**Teste independente**: Executar `jira done ABC-123` — deve mover a issue para "Done" (ou equivalente) e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue com transição disponível para "Done", **Quando** `jira done <KEY>` é executado, **Então** a issue é movida e exibe: `<KEY> marcada como Concluída.`
2. **Dado** uma issue sem transição para "Done", **Quando** `jira done <KEY>` é executado, **Então** exibe as transições disponíveis e informa que "Concluído" não está disponível

---

### História 3 - Reabrir ou pausar uma issue (Prioridade: P2)

Um desenvolvedor quer retornar uma issue para "A Fazer" quando o trabalho é pausado ou a issue precisa ser reaberta.

**Por que esta prioridade**: Necessário para corrigir o estado de issues em progresso que precisam ser devolvidas ao backlog.

**Teste independente**: Executar `jira stop ABC-123` — deve mover a issue para "To Do" (ou equivalente) e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue com transição disponível para "To Do", **Quando** `jira stop <KEY>` é executado, **Então** a issue é movida e exibe: `<KEY> retornada para A Fazer.`
2. **Dado** uma issue sem transição para "To Do", **Quando** `jira stop <KEY>` é executado, **Então** exibe as transições disponíveis

---

### História 4 - Ver transições disponíveis antes de agir (Prioridade: P2)

Um desenvolvedor quer ver quais transições estão disponíveis para uma issue antes de executar uma delas.

**Por que esta prioridade**: Diagnóstico — necessário quando os comandos `start`/`done`/`stop` não encontram a transição correta.

**Teste independente**: Executar `jira trans ABC-123` — deve listar ID, Nome e Estado destino de cada transição disponível.

**Cenários de Aceite**:

1. **Dado** uma issue com transições disponíveis, **Quando** `jira trans <KEY>` é executado, **Então** exibe tabela com ID, Nome da Transição e Estado Destino
2. **Dado** uma issue sem transições disponíveis, **Quando** `jira trans <KEY>` é executado, **Então** exibe: `Nenhuma transição disponível para <KEY> no estado atual.`

---

### História 5 - Aplicar transição diretamente pelo ID (Prioridade: P3)

Um desenvolvedor quer aplicar uma transição específica pelo seu ID numérico, para casos que os comandos inteligentes não cobrem.

**Por que esta prioridade**: Fallback de precisão — garante controle total mesmo quando a detecção automática falha.

**Teste independente**: Executar `jira move ABC-123 21` — deve aplicar a transição de ID 21 na issue ABC-123.

**Cenários de Aceite**:

1. **Dado** um ID de transição válido, **Quando** `jira move <KEY> <ID>` é executado, **Então** a transição é aplicada e exibe: `Transição <ID> aplicada em <KEY>.`
2. **Dado** um ID de transição inválido, **Quando** `jira move <KEY> <ID>` é executado, **Então** exibe: `Transição <ID> não encontrada para <KEY>. Execute 'jira trans <KEY>' para ver as disponíveis.`

---

### Casos de Borda

- O que ocorre quando a issue já está no estado destino (ex: `jira done` em issue já "Done")?
- O que ocorre quando múltiplas transições correspondem ao padrão (ex: duas transições com "Progress" no nome)?
- O que ocorre quando o workflow do projeto usa nomes totalmente customizados em PT-BR?

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: `jira start <KEY>` DEVE encontrar automaticamente a transição para "Em Andamento" por correspondência case-insensitive de substring nos nomes; padrão default: `Progress|Iniciar|Start|Em andamento|Andamento`; override via env `JIRA_PATTERN_START`
- **RF-002**: `jira done <KEY>` DEVE encontrar automaticamente a transição para "Concluído" por correspondência case-insensitive de substring; padrão default: `Done|Concluído|Concluido|Resolved|Resolvido|Finalizar|Fechar|Close`; override via env `JIRA_PATTERN_DONE`
- **RF-003**: `jira stop <KEY>` DEVE encontrar automaticamente a transição para "A Fazer" por correspondência case-insensitive de substring; padrão default: `To Do|Reopen|Reabrir|Aberto|Pendente|Backlog`; override via env `JIRA_PATTERN_STOP`
- **RF-004**: Quando a transição esperada não for encontrada, DEVE listar todas as transições disponíveis com ID, Nome e Estado Destino
- **RF-005**: `jira trans <KEY>` DEVE listar transições disponíveis em tabela com ID, Nome e Estado Destino (somente leitura)
- **RF-006**: `jira move <KEY> <ID>` DEVE aplicar a transição pelo ID numérico exato
- **RF-007**: Quando múltiplas transições correspondem ao padrão, NÃO DEVE aplicar nenhuma; DEVE listar as candidatas e instruir o uso de `jira move <KEY> <ID>`
- **RF-008**: Mensagens de confirmação DEVEM usar o nome real do estado destino retornado pela API, não rótulos hardcoded

### Entidades Chave

- **Transição**: ID (numérico), Nome, Estado Destino
- **Issue**: Key, Estado Atual

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: `jira start`, `jira done` e `jira stop` funcionam corretamente em projetos com nomes em PT-BR e EN
- **CS-002**: Quando a transição automática falha, o usuário recebe informação suficiente para usar `jira move` como alternativa — sem precisar abrir o browser
- **CS-003**: O fluxo `jira pick | jira start` (selecionar e iniciar em pipeline) funciona sem intervenção manual

## Premissas

- A detecção automática usa correspondência de substring case-insensitive nos nomes das transições
- Projetos com nomes de transição totalmente customizados que não correspondam aos padrões requerem uso de `jira move <KEY> <ID>` ou definição das env vars `JIRA_PATTERN_START` / `JIRA_PATTERN_DONE` / `JIRA_PATTERN_STOP`
- A ferramenta não define qual transição é "correta" — apenas encontra a mais provável pelo padrão; em caso de ambiguidade, recusa decidir
- Transições requerem que o usuário tenha permissão no projeto; erros de permissão são repassados como mensagem legível
- A mensagem de sucesso usa o nome do estado destino retornado pela API (`transition.to.name`), permitindo que projetos PT-BR exibam "Em Andamento", "Doing", "Em desenvolvimento", etc.
