# Especificação de Feature: Comentários e Registro de Tempo

**Branch**: `005-comments-worklog`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Adicionar comentário a uma issue (Prioridade: P1)

Um desenvolvedor quer registrar uma atualização ou informação em uma issue diretamente do terminal, sem abrir o browser.

**Por que esta prioridade**: Comunicação é central no fluxo de trabalho — atualizar status, informar PR enviado, pedir feedback.

**Teste independente**: Executar `jira comment ABC-123 "PR enviado para revisão"` — deve criar o comentário e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue existente e um texto de comentário, **Quando** `jira comment <KEY> "<TEXTO>"` é executado, **Então** o comentário é criado e exibe: `Comentário adicionado em <KEY>.`
2. **Dado** um texto de comentário vazio, **Quando** `jira comment <KEY> ""` é executado, **Então** exibe: `O texto do comentário não pode ser vazio.`
3. **Dado** uma issue inexistente, **Quando** `jira comment <KEY> "<TEXTO>"` é executado, **Então** exibe: `Issue <KEY> não encontrada.`

---

### História 2 - Listar comentários de uma issue (Prioridade: P2)

Um desenvolvedor quer ver o histórico de comunicação de uma issue em formato resumido no terminal.

**Por que esta prioridade**: Necessário para entender o contexto atual antes de comentar ou agir.

**Teste independente**: Executar `jira comments ABC-123` — deve listar os comentários mais recentes com ID, Autor, Data e preview do texto (80 chars).

**Cenários de Aceite**:

1. **Dado** uma issue com comentários, **Quando** `jira comments <KEY>` é executado, **Então** exibe tabela com ID, Autor, Data e preview do comentário (truncado em 80 caracteres) — os mais recentes primeiro
2. **Dado** uma issue sem comentários, **Quando** `jira comments <KEY>` é executado, **Então** exibe: `Nenhum comentário em <KEY>.`
3. **Dado** issue com mais de 50 comentários, **Quando** `jira comments <KEY>` é executado, **Então** exibe os 50 mais recentes

---

### História 3 - Remover um comentário (Prioridade: P3)

Um desenvolvedor quer deletar um comentário criado por engano ou desatualizado.

**Por que esta prioridade**: Correção de erro — menos frequente mas necessário.

**Teste independente**: Executar `jira comment-del ABC-123 12345` — deve pedir confirmação, e ao confirmar, deletar o comentário.

**Cenários de Aceite**:

1. **Dado** um ID de comentário válido, **Quando** `jira comment-del <KEY> <ID>` é executado, **Então** pede confirmação: `Deletar comentário <ID> de <KEY>? (s/n):`
2. **Dado** confirmação `s`, **Quando** o usuário responde, **Então** o comentário é deletado e exibe: `Comentário <ID> deletado.`
3. **Dado** confirmação diferente de `s`, **Quando** o usuário responde, **Então** exibe: `Operação cancelada.` e nada é deletado
4. **Dado** um ID de comentário inexistente, **Quando** `jira comment-del <KEY> <ID>` é executado com confirmação, **Então** exibe o erro retornado pelo Jira

---

### História 4 - Registrar tempo trabalhado em uma issue (Prioridade: P1)

Um desenvolvedor quer apontar horas trabalhadas em uma issue usando o formato de tempo do Jira.

**Por que esta prioridade**: Apontamento de horas é requisito de processo em muitas equipes — uso diário.

**Teste independente**: Executar `jira log ABC-123 "1h 30m" "investigação do bug"` — deve criar o worklog e confirmar.

**Cenários de Aceite**:

1. **Dado** uma issue e um tempo válido, **Quando** `jira log <KEY> <TEMPO>` é executado, **Então** o worklog é criado e exibe: `Worklog <TEMPO> registrado em <KEY>.`
2. **Dado** a opção de comentário, **Quando** `jira log <KEY> <TEMPO> "<DESCRICAO>"` é executado, **Então** o worklog é criado com a descrição informada
3. **Dado** um formato de tempo inválido (ex: `2dias`), **Quando** `jira log <KEY> <TEMPO>` é executado, **Então** exibe o erro retornado pelo Jira com o formato aceito
4. **Dado** uma issue inexistente, **Quando** `jira log <KEY> <TEMPO>` é executado, **Então** exibe: `Issue <KEY> não encontrada.`

---

### História 5 - Listar worklogs de uma issue (Prioridade: P2)

Um desenvolvedor quer ver o histórico de apontamentos de uma issue para verificar quanto tempo foi investido e por quem.

**Por que esta prioridade**: Auditoria e controle de horas — necessário para relatórios e planejamento.

**Teste independente**: Executar `jira logs ABC-123` — deve listar todos os worklogs com ID, Autor, Data, Tempo e preview da descrição.

**Cenários de Aceite**:

1. **Dado** uma issue com worklogs, **Quando** `jira logs <KEY>` é executado, **Então** exibe tabela com ID, Autor, Data, Tempo e preview da descrição (60 chars)
2. **Dado** uma issue sem worklogs, **Quando** `jira logs <KEY>` é executado, **Então** exibe: `Nenhum apontamento em <KEY>.`

---

### Casos de Borda

- O que ocorre quando o texto do comentário tem quebras de linha? — preservar literalmente; passar como string única no JSON da requisição
- O que ocorre quando o usuário não tem permissão para deletar o comentário (de outro autor)? — repassar erro 403 do Jira como mensagem legível
- Formatos de tempo aceitos pelo Jira: `1h`, `30m`, `1h 30m`, `2h 15m`, `1d` — formatos sem espaço como `1h30m` são rejeitados pelo Jira; ferramenta repassa erro
- O que ocorre quando o terminal não é interativo e `jira comment-del` pede confirmação? — operação cancelada por segurança com código 2; suporta `--yes` para pular confirmação

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: `jira comment <KEY> "<TEXTO>"` DEVE criar um comentário via API e confirmar a criação
- **RF-002**: `jira comments <KEY>` DEVE listar os 50 comentários mais recentes em tabela com ID, Autor, Data e preview de 80 caracteres; sufixo `...` DEVE ser anexado apenas quando o texto original ultrapassar 80 caracteres
- **RF-003**: `jira comment-del <KEY> <ID>` DEVE pedir confirmação antes de deletar; DEVE deletar apenas com resposta `s` ou `y`; DEVE aceitar flag `--yes` para pular confirmação; em modo não-interativo sem `--yes` DEVE cancelar com código 2
- **RF-004**: `jira log <KEY> <TEMPO>` DEVE registrar worklog; DEVE aceitar descrição opcional como terceiro argumento posicional
- **RF-005**: `jira logs <KEY>` DEVE listar todos os worklogs com ID, Autor, Data, Tempo e preview de 60 caracteres da descrição; sufixo `...` DEVE ser anexado apenas quando o texto original ultrapassar 60 caracteres
- **RF-006**: Formatos de tempo aceitos são os suportados pelo Jira Server (ex: `1h`, `30m`, `1h 30m`) — erros do servidor DEVEM ser parseados (campos `errorMessages`/`errors`) e exibidos como mensagem legível, não JSON cru

### Entidades Chave

- **Comentário**: ID, Autor (displayName), Data de criação, Texto
- **Worklog**: ID, Autor (displayName), Data de início, Tempo (timeSpent), Descrição

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: `jira log` registra horas em menos de 3 segundos
- **CS-002**: `jira comment-del` nunca deleta sem confirmação explícita do usuário (`s`)
- **CS-003**: `jira comments` e `jira logs` exibem todas as informações necessárias para identificar o item a deletar
- **CS-004**: O fluxo `jira pick | jira log <TIME>` funciona em pipeline

## Premissas

- O formato de tempo é validado pelo servidor Jira — a ferramenta repassa o erro sem tentar parsear o formato localmente
- A confirmação de deleção de comentário requer entrada interativa (`s` para confirmar); em modo não-interativo (pipe/CI), a operação é cancelada por segurança
- A listagem de comentários exibe os mais recentes primeiro (ordem decrescente por data)
- O preview de texto é truncado sem cortar palavras quando possível, mas o limite de caracteres tem prioridade
