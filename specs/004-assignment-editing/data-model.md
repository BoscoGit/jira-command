# Phase 1 — Data Model: Atribuição e Edição (004)

Sem persistência. Modelos descrevem entidades Jira consumidas e tipos internos da edição.

---

## E1. Field updates (PUT body shapes)

```ts
type AssigneeBody = { name: string | null };

type FieldUpdateBody = {
  fields: {
    priority?: { name: string };
    summary?: string;
    description?: string;
  };
};

type LabelUpdateBody = {
  update: {
    labels: Array<{ add: string } | { remove: string }>;
  };
};
```

## E2. AssigneeResolution

```ts
async function resolveAssignee(
  config: Config,
  raw: string | undefined,
): Promise<string>;
// Quando raw === undefined || raw === 'me' (case-insensitive), faz GET /myself
// e cacheia. Demais valores são repassados literalmente.
```

## E3. Description editing pipeline

```ts
interface DescEditResult {
  updated: boolean;        // true se PUT foi feito
  originalLength: number;  // métrica para log
  newLength: number;       // métrica para log
}
```

Pipeline:
1. TTY check → recusa se pipe.
2. `getDescription(config, key)` → string (vazia se null).
3. Cria tmp file com descrição atual + extensão `.md`.
4. `registerTmpFile(path)`.
5. `openEditor(path)` aguarda close.
6. Editor exit != 0 → erro.
7. Lê arquivo, trim trailing `\r`/`\n`.
8. Comparar com original trimado.
9. Se igual → `updated: false`, sem PUT.
10. Senão → `updateField(config, key, 'description', newText)`, `updated: true`.
11. `finally`: `unregisterTmpFile(path)` + `fs.rmSync(path, force: true)`.

## E4. EditorCommand

```ts
interface EditorCommand {
  cmd: string;
  args: string[];
}

function commandFor(
  filePath: string,
  env: NodeJS.ProcessEnv = process.env,
  plat: NodeJS.Platform = process.platform,
): EditorCommand;
```

Resolução:
1. `env.EDITOR` → `{ cmd: <EDITOR>, args: [filePath] }` (split em tokens se contém espaço — ex `code -w`).
2. `env.VISUAL` → idem.
3. `plat === 'win32'` → `{ cmd: 'notepad.exe', args: [filePath] }`.
4. demais → `{ cmd: 'nano', args: [filePath] }` (com fallback para `vi` em ENOENT em runtime, não em commandFor).

## E5. Saída de comandos (humana / JSON)

| Comando | Humana (stderr) | JSON (stdout) |
|---------|-----------------|----------------|
| `assign` | `<KEY> atribuído a <username>.` | `{ok, key, action:'assign', user}` |
| `unassign` | `<KEY> sem responsável.` | `{ok, key, action:'unassign'}` |
| `prio` | `<KEY> prioridade definida para <PRIORIDADE>.` | `{ok, key, action:'prio', priority}` |
| `summary` | `<KEY> título atualizado.` | `{ok, key, action:'summary', summary}` |
| `label` | `Label '<LABEL>' adicionada em <KEY>.` | `{ok, key, action:'label', added}` |
| `label-del` | `Label '<LABEL>' removida de <KEY>.` | `{ok, key, action:'label-del', removed}` |
| `desc` (mudou) | `<KEY> descrição atualizada.` | `{ok, key, action:'desc', updated:true}` |
| `desc` (não) | `Sem alterações em <KEY>.` | `{ok, key, action:'desc', updated:false}` |

`assign --quiet`: stdout = `<KEY>\n`; stderr ainda mantém a mensagem decorativa.

## E6. Erros (mapeamento)

| Cenário | Mensagem | Exit code |
|---------|----------|-----------|
| Key inválida local | `Formato de Key inválido: '<entrada>'.` | 2 |
| 401 | RF-008 da 001 | 3 |
| 403 (sem permissão para editar) | "Sem permissão: ..." (RF-008 da 001 mapeia automaticamente) | 5 |
| 404 (issue não existe) | "Recurso não encontrado: ..." (idem) | 4 |
| 400 (priority inválida, label vazia, etc.) | mensagem do servidor parseada | 1 |
| `desc` em pipe | `desc requer terminal interativo.` | 2 |
| Editor exit code != 0 | `Editor saiu com erro; descrição não foi alterada.` | 1 |

---

## Resumo

Sem persistência. Tipos definem shapes de PUT. `resolveAssignee` cacheia o usuário autenticado para `--user me`. Pipeline de `desc` registra tmp file no signal handler para cleanup em SIGINT.
