# Especificação de Feature: Atribuição e Edição de Campos

**Branch**: `004-assignment-editing`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Assumir responsabilidade por uma issue (Prioridade: P1)

Um desenvolvedor quer se atribuir a uma issue sem precisar informar seu próprio username.

**Por que esta prioridade**: Ação frequente ao pegar uma tarefa — a auto-atribuição é o caso mais comum.

**Teste independente**: Executar `jira assign ABC-123` — deve atribuir a issue ao usuário autenticado e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue existente e nenhum `--user` fornecido, **Quando** `jira assign <KEY>` é executado, **Então** a issue é atribuída ao usuário autenticado e exibe: `<KEY> atribuída a <username>.`
2. **Dado** a flag `--user <USERNAME>`, **Quando** `jira assign <KEY> --user joao.silva` é executado, **Então** a issue é atribuída ao usuário informado
3. **Dado** um username inexistente no projeto, **Quando** `jira assign <KEY> --user <USERNAME>` é executado, **Então** exibe erro retornado pelo Jira

---

### História 2 - Remover o responsável de uma issue (Prioridade: P2)

Um desenvolvedor quer deixar uma issue sem responsável para que qualquer um do time possa pegá-la.

**Por que esta prioridade**: Necessário para devolver issues ao pool do time sem atribuir a ninguém específico.

**Teste independente**: Executar `jira unassign ABC-123` — deve remover o responsável e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue com responsável, **Quando** `jira unassign <KEY>` é executado, **Então** o responsável é removido e exibe: `<KEY> sem responsável.`
2. **Dado** uma issue já sem responsável, **Quando** `jira unassign <KEY>` é executado, **Então** o comando é executado sem erro

---

### História 3 - Alterar a prioridade de uma issue (Prioridade: P2)

Um desenvolvedor quer ajustar a prioridade de uma issue diretamente do terminal.

**Por que esta prioridade**: Alteração de prioridade é frequente durante refinements e triagem.

**Teste independente**: Executar `jira prio ABC-123 High` — deve alterar a prioridade e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue e uma prioridade válida, **Quando** `jira prio <KEY> <PRIORIDADE>` é executado, **Então** a prioridade é alterada e exibe: `<KEY> prioridade definida para <PRIORIDADE>.`
2. **Dado** uma prioridade inválida, **Quando** `jira prio <KEY> <PRIORIDADE>` é executado, **Então** exibe o erro retornado pelo Jira com as prioridades aceitas

---

### História 4 - Alterar o título de uma issue (Prioridade: P2)

Um desenvolvedor quer corrigir ou atualizar o título de uma issue sem abrir o browser.

**Por que esta prioridade**: Títulos precisam de ajuste frequentemente após criação.

**Teste independente**: Executar `jira summary ABC-123 "Novo título"` — deve atualizar o campo summary e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue e um novo título, **Quando** `jira summary <KEY> "<TITULO>"` é executado, **Então** o summary é atualizado e exibe: `<KEY> título atualizado.`

---

### História 5 - Adicionar e remover labels de uma issue (Prioridade: P3)

Um desenvolvedor quer categorizar issues com labels para facilitar buscas JQL posteriores.

**Por que esta prioridade**: Labels são usadas em buscas e relatórios; edição frequente em triagem.

**Teste independente**: Executar `jira label ABC-123 backend` — deve adicionar a label preservando as existentes. Executar `jira label-del ABC-123 backend` — deve remover apenas aquela label.

**Cenários de Aceite**:

1. **Dado** uma issue e uma nova label, **Quando** `jira label <KEY> <LABEL>` é executado, **Então** a label é adicionada preservando as labels existentes, e exibe: `Label '<LABEL>' adicionada em <KEY>.`
2. **Dado** uma issue e uma label existente, **Quando** `jira label-del <KEY> <LABEL>` é executado, **Então** apenas aquela label é removida, e exibe: `Label '<LABEL>' removida de <KEY>.`
3. **Dado** `jira label-del` com uma label que não existe na issue, **Quando** executado, **Então** o comando é executado sem erro (Jira ignora silenciosamente)

---

### História 6 - Editar a descrição de uma issue no editor de texto (Prioridade: P3)

Um desenvolvedor quer editar a descrição longa de uma issue usando seu editor de texto preferido no terminal.

**Por que esta prioridade**: Descrições longas são impraticáveis de editar como argumento de linha de comando.

**Teste independente**: Executar `jira desc ABC-123` — deve abrir a descrição atual no editor (`$EDITOR` ou padrão do sistema), e salvar no Jira ao fechar o arquivo.

**Cenários de Aceite**:

1. **Dado** que `$EDITOR` está definido, **Quando** `jira desc <KEY>` é executado, **Então** abre a descrição atual da issue no editor definido por `$EDITOR`
2. **Dado** que `$EDITOR` não está definido, **Quando** `jira desc <KEY>` é executado, **Então** abre no editor padrão do sistema operacional (ex: notepad no Windows, nano no Linux/macOS)
3. **Dado** que o usuário salva e fecha o editor com alterações, **Quando** o editor fecha, **Então** a nova descrição é salva na issue e exibe: `<KEY> descrição atualizada.`
4. **Dado** que o usuário fecha o editor sem alterar o conteúdo, **Quando** o editor fecha, **Então** nenhuma requisição ao Jira é feita e exibe: `Sem alterações em <KEY>.`

---

### Casos de Borda

- O que ocorre quando o editor fecha com erro (código diferente de zero)? — abortar sem PUT, exibir `Editor saiu com erro; descrição não foi alterada.` e código de saída 1
- O que ocorre quando a descrição atual está vazia e o usuário abre o editor? — abrir arquivo vazio normalmente; salvar conteúdo digitado se não-vazio
- O que ocorre quando `jira assign` é chamado com `--user me` explicitamente? — equivale a omitir `--user`
- Prioridades aceitas pelo Jira variam por instância — como lidar com valores inválidos? — repassar erro do Jira sem enumeração local
- O que ocorre quando `jira desc` é executado em pipe (sem TTY)? — falha cedo com `desc requer terminal interativo` e código de saída 2

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: `jira assign <KEY>` DEVE atribuir ao usuário autenticado por padrão; `--user <USERNAME>` DEVE atribuir a outro usuário; `--quiet` DEVE imprimir apenas a Key no stdout (compatível com pipelines — ver spec 001 RF-010)
- **RF-002**: `jira unassign <KEY>` DEVE remover o responsável (definir assignee como nulo)
- **RF-003**: `jira prio <KEY> <PRIORIDADE>` DEVE atualizar o campo `priority.name` da issue
- **RF-004**: `jira summary <KEY> "<TITULO>"` DEVE atualizar o campo `summary` da issue
- **RF-005**: `jira label <KEY> <LABEL>` DEVE adicionar a label usando operação `add` (preserva existentes)
- **RF-006**: `jira label-del <KEY> <LABEL>` DEVE remover a label usando operação `remove` (preserva demais)
- **RF-007**: `jira desc <KEY>` DEVE: (a) buscar descrição atual, (b) salvar em arquivo temporário UTF-8 sem BOM com extensão `.md`, (c) abrir no editor, (d) ao fechar, ler conteúdo, fazer trim apenas de newlines finais (`\r`, `\n`), comparar com original e fazer PUT apenas se houve diferença, (e) remover o arquivo temporário ao final independentemente do resultado
- **RF-008**: O editor a ser usado DEVE seguir a variável `$EDITOR` (ou `$VISUAL`); sem ela, usar fallback por SO: `notepad.exe` no Windows, `nano` (com fallback para `vi`) no Linux/macOS
- **RF-009**: Quando o editor sai com código diferente de zero, NÃO DEVE fazer PUT e DEVE exibir erro com código de saída 1
- **RF-010**: `jira desc <KEY>` DEVE recusar execução quando stdout não é TTY (modo pipe), saindo com código 2

### Entidades Chave

- **Issue**: Key, Responsável (username), Prioridade (nome), Título (summary), Labels (lista), Descrição

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: `jira assign` sem `--user` atribui ao usuário atual sem necessidade de conhecer o próprio username
- **CS-002**: `jira label` nunca sobrescreve labels existentes — apenas adiciona a nova
- **CS-003**: `jira desc` não faz requisição ao Jira quando o usuário não altera o conteúdo no editor
- **CS-004**: O fluxo `jira pick | jira assign` funciona em pipeline

## Premissas

- As prioridades aceitas dependem da configuração do Jira — a ferramenta repassa o erro da API sem enumerar valores válidos
- O arquivo temporário para edição de descrição é criado no diretório temporário do sistema e apagado após uso
- `jira assign` com `--user me` é equivalente a `jira assign` sem `--user`
- A edição de descrição usa formato texto simples (o Jira Server API v2 aceita texto plano e wiki markup)
