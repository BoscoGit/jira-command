import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { searchIssues } from '../jira/issues.js';
import { quietOut } from '../output.js';
import { pickWithFzf } from '../platform/fzf.js';

const PICK_DEFAULT_JQL =
  'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC';

const PICK_FIELDS = 'summary,status,priority';
const PICK_LIMIT = 200;

function formatLine(key: string, status: string, summary: string): string {
  const keyCol = key.padEnd(14);
  const statusCol = `[${status}]`.padEnd(17);
  return `${keyCol}${statusCol} ${summary}`;
}

export const pickCommand = defineCommand({
  meta: {
    name: 'pick',
    description: 'Seleciona uma issue interativamente via fzf. Imprime a Key escolhida no stdout.',
  },
  args: {
    jql: {
      type: 'string',
      description: 'JQL custom (default: minhas issues abertas).',
    },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const jql = (args.jql as string | undefined) ?? PICK_DEFAULT_JQL;

    const { issues } = await searchIssues(config, jql, PICK_FIELDS, PICK_LIMIT);
    if (issues.length === 0) {
      // Sem issues: exit 1 sem mensagem ruidosa (consistente com cancelamento).
      process.exitCode = 1;
      return;
    }

    const lines = issues.map((i) => formatLine(i.key, i.status, i.summary));
    const selected = await pickWithFzf(lines);

    if (selected === null) {
      process.exitCode = 1;
      return;
    }

    // Linha tem formato `<KEY>          [<STATUS>]   <RESUMO>`. Extrair primeiro token.
    const key = selected.split(/\s+/)[0] ?? '';
    if (key.length > 0) {
      quietOut(key);
    } else {
      process.exitCode = 1;
    }
  },
});
