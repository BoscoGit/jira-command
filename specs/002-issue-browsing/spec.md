# Especificação de Feature: Consulta de Issues

**Branch**: `002-issue-browsing`  
**Criado**: 2026-05-09  
**Status**: Rascunho

## Cenários de Uso e Teste *(obrigatório)*

### História 1 - Ver minhas issues abertas de forma rápida (Prioridade: P1)

Um desenvolvedor quer ver rapidamente quais issues estão atribuídas a ele e pendentes de resolução, ordenadas por prioridade.

**Por que esta prioridade**: Comando mais usado no dia a dia — ponto de entrada principal da ferramenta.

**Teste independente**: Executar `jira mine` — deve exibir tabela com Key, Prioridade, Status e Resumo das issues abertas do usuário atual.

**Cenários de Aceite**:

1. **Dado** que o usuário tem issues abertas atribuídas a ele, **Quando** `jira mine` é executado, **Então** exibe tabela com colunas Key, Prioridade, Status, Resumo — ordenada por prioridade DESC, atualização DESC
2. **Dado** que o usuário não tem issues abertas, **Quando** `jira mine` é executado, **Então** exibe: `Nenhuma issue encontrada.`
3. **Dado** resultado com mais de 50 issues, **Quando** `jira mine` é executado, **Então** limita a 50 e informa: `Mostrando 50 de <total> issues.`

---

### História 2 - Ver detalhes completos de uma issue (Prioridade: P1)

Um desenvolvedor quer ver todos os detalhes de uma issue específica, incluindo descrição e últimos comentários.

**Por que esta prioridade**: Necessário para trabalhar em qualquer issue — entender contexto antes de agir.

**Teste independente**: Executar `jira get ABC-123` — deve exibir Key, Resumo, Status, Prioridade, Responsável, Relator, Descrição e últimos 10 comentários.

**Cenários de Aceite**:

1. **Dado** uma issue existente, **Quando** `jira get <KEY>` é executado, **Então** exibe Key, Resumo, Status, Prioridade, Responsável, Relator e Descrição
2. **Dado** uma issue com comentários, **Quando** `jira get <KEY>` é executado, **Então** exibe os 10 comentários mais recentes com autor e data
3. **Dado** uma issue sem comentários, **Quando** `jira get <KEY>` é executado, **Então** exibe os detalhes sem seção de comentários
4. **Dado** uma issue inexistente, **Quando** `jira get <KEY>` é executado, **Então** exibe: `Issue <KEY> não encontrada.`

---

### História 3 - Buscar issues com JQL personalizado (Prioridade: P2)

Um desenvolvedor quer buscar issues usando uma expressão JQL customizada para encontrar qualquer conjunto de issues.

**Por que esta prioridade**: Flexibilidade total — cobre casos que `jira mine` e `jira status` não cobrem.

**Teste independente**: Executar `jira find "project = ABC AND status = Open"` — deve retornar tabela com issues correspondentes.

**Cenários de Aceite**:

1. **Dado** um JQL válido com resultados, **Quando** `jira find "<JQL>"` é executado, **Então** exibe tabela com Key, Prioridade, Status, Responsável, Resumo
2. **Dado** um JQL válido sem resultados, **Quando** `jira find "<JQL>"` é executado, **Então** exibe: `Nenhuma issue encontrada para o JQL informado.`
3. **Dado** um JQL inválido, **Quando** `jira find "<JQL>"` é executado, **Então** exibe a mensagem de erro retornada pelo Jira
4. **Dado** a flag `--limit N`, **Quando** `jira find "<JQL>" --limit 10` é executado, **Então** retorna no máximo 10 resultados

---

### História 4 - Filtrar minhas issues por status (Prioridade: P2)

Um desenvolvedor quer ver apenas suas issues em um status específico, como "In Progress" ou "Code Review".

**Por que esta prioridade**: Alternativa ao JQL para o caso de uso mais comum: minhas issues em determinado estado.

**Teste independente**: Executar `jira status "In Progress"` — deve retornar issues do usuário atual naquele status.

**Cenários de Aceite**:

1. **Dado** um status existente com issues do usuário, **Quando** `jira status "<STATUS>"` é executado, **Então** exibe tabela das issues naquele status, ordenadas por atualização DESC
2. **Dado** um status sem issues do usuário, **Quando** `jira status "<STATUS>"` é executado, **Então** exibe: `Nenhuma issue com status "<STATUS>" encontrada.`

---

### História 5 - Abrir issue no navegador (Prioridade: P3)

Um desenvolvedor quer abrir rapidamente uma issue no browser para ver detalhes visuais ou compartilhar o link.

**Por que esta prioridade**: Ação complementar — usuário já conhece a Key e quer o contexto completo do Jira web.

**Teste independente**: Executar `jira open ABC-123` — deve abrir a URL `<JIRA_BASE_URL>/browse/ABC-123` no browser padrão.

**Cenários de Aceite**:

1. **Dado** uma Key de issue, **Quando** `jira open <KEY>` é executado, **Então** abre `<JIRA_BASE_URL>/browse/<KEY>` no navegador padrão do sistema
2. **Dado** a abertura bem-sucedida, **Quando** `jira open <KEY>` é executado, **Então** exibe: `Abrindo <KEY> no navegador...`

---

### História 6 - Selecionar issue interativamente com fzf (Prioridade: P3)

Um desenvolvedor quer selecionar uma issue de forma interativa usando busca fuzzy, para usar o resultado em outro comando.

**Por que esta prioridade**: Ergonomia avançada — evita digitar Keys manualmente ao encadear comandos.

**Teste independente**: Executar `jira pick` — deve abrir picker fzf com as issues abertas do usuário; a issue selecionada tem sua Key impressa no stdout para uso em pipes.

**Cenários de Aceite**:

1. **Dado** que `fzf` está instalado, **Quando** `jira pick` é executado, **Então** abre seletor interativo com Key, Status e Resumo de cada issue
2. **Dado** que o usuário seleciona uma issue, **Quando** o picker fecha, **Então** a Key da issue selecionada é impressa no stdout
3. **Dado** que o usuário cancela (ESC), **Quando** o picker fecha, **Então** nenhuma saída é produzida e o código de saída é diferente de zero
4. **Dado** a flag `--jql "<JQL>"`, **Quando** `jira pick --jql "<JQL>"` é executado, **Então** o picker carrega issues do JQL informado ao invés das issues padrão
5. **Dado** que `fzf` não está instalado, **Quando** `jira pick` é executado, **Então** exibe: `fzf não encontrado. Instale em: https://github.com/junegunn/fzf`

---

### Casos de Borda

- O que ocorre quando a Key tem formato inválido (ex: `123`, `ABC`)? — validar contra regex `^[A-Z][A-Z0-9_]+-\d+$` antes de chamar a API e exibir `Formato de Key inválido: '<entrada>'`
- O que ocorre quando o JQL contém aspas duplas? — passar como argumento único do shell; a ferramenta encoda corretamente via URL-encoding
- O que ocorre quando a descrição da issue está vazia? — exibir `(sem descrição)` na seção correspondente
- O que ocorre quando o `fzf` existe mas o terminal não é interativo? — `jira pick` falha cedo com `pick requer terminal interativo` e código de saída 2

## Requisitos *(obrigatório)*

### Requisitos Funcionais

- **RF-001**: `jira mine` DEVE buscar issues com `assignee = currentUser() AND resolution = Unresolved` limitadas a 50, ordenadas por prioridade DESC e atualização DESC
- **RF-002**: `jira get <KEY>` DEVE exibir: Key, Resumo, Status, Prioridade, Responsável, Relator, Descrição e os 10 comentários mais recentes
- **RF-003**: `jira find "<JQL>"` DEVE aceitar qualquer expressão JQL e exibir resultados em tabela; DEVE aceitar `--limit N` (padrão 50)
- **RF-004**: `jira status "<STATUS>"` DEVE buscar issues do usuário atual no status informado, ordenadas por atualização DESC
- **RF-005**: `jira open <KEY>` DEVE abrir `<JIRA_BASE_URL>/browse/<KEY>` no navegador padrão do sistema operacional
- **RF-006**: `jira pick` DEVE integrar com `fzf` para seleção interativa; DEVE aceitar `--jql` para customizar a busca; DEVE imprimir apenas a Key no stdout ao selecionar; DEVE limitar a busca padrão a 200 issues
- **RF-007**: Todos os comandos de listagem DEVEM exibir saída em formato de tabela alinhada por padrão; com `--json` (RF-009 do spec 001) DEVEM emitir JSON
- **RF-008**: Validação de formato de Key DEVE ocorrer localmente antes da chamada HTTP (regex `^[A-Z][A-Z0-9_]+-\d+$`); falha retorna código 2

### Entidades Chave

- **Issue**: Key (ex: ABC-123), Resumo, Status, Prioridade, Responsável, Relator, Descrição, Comentários

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **CS-001**: `jira mine` retorna resultado em menos de 3 segundos para até 50 issues
- **CS-002**: `jira get <KEY>` exibe todos os campos obrigatórios em no máximo 2 chamadas ao servidor (uma para a issue, opcionalmente uma para os comentários se não vierem expandidos)
- **CS-003**: `jira pick | jira get` funciona como pipeline — a saída de um alimenta o outro
- **CS-004**: Erros de issue não encontrada são exibidos sem stack trace

## Premissas

- `fzf` é uma dependência opcional — comandos sem picker funcionam sem ele
- A saída de `jira pick` é apenas a Key (sem espaços extras) para compatibilidade com pipes
- A exibição de comentários limita-se aos 10 mais recentes para não sobrecarregar o terminal
- Campos nulos/ausentes no Jira são exibidos como string vazia, sem quebrar o comando
