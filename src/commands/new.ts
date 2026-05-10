import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { createIssue } from '../jira/create.js';
import { getOutputMode, humanError, humanLog, jsonOut, quietOut } from '../output.js';

export const newCommand = defineCommand({
  meta: {
    name: 'new',
    description: 'Cria nova issue. --quiet emite apenas a Key (pipe-friendly).',
  },
  args: {
    project: { type: 'string', required: true, description: 'Chave do projeto.' },
    summary: { type: 'string', required: true, description: 'Título da issue.' },
    type: { type: 'string', description: 'Tipo (default Task).', default: 'Task' },
    desc: { type: 'string', description: 'Descrição opcional.' },
    priority: { type: 'string', description: 'Prioridade opcional.' },
    assignee: { type: 'string', description: 'Username do responsável.' },
    quiet: { type: 'boolean', description: 'Imprime apenas Key em stdout.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const fields: Record<string, unknown> = {
      project: { key: String(args.project ?? '') },
      summary: String(args.summary ?? ''),
      issuetype: { name: String(args.type ?? 'Task') },
    };
    const desc = args.desc as string | undefined;
    const priority = args.priority as string | undefined;
    const assignee = args.assignee as string | undefined;
    if (desc && desc.length > 0) fields.description = desc;
    if (priority && priority.length > 0) fields.priority = { name: priority };
    if (assignee && assignee.length > 0) fields.assignee = { name: assignee };

    try {
      const created = await createIssue(config, fields);
      const mode = getOutputMode();
      if (mode.json) {
        jsonOut({ ok: true, key: created.key, action: 'new', url: created.url });
      } else if (args.quiet) {
        quietOut(created.key);
      } else {
        humanLog(process.stderr, `Issue criada: ${created.key}`, 'green');
        humanLog(process.stderr, created.url, 'cyan');
        quietOut(created.key);
      }
    } catch (err) {
      if (err instanceof JiraError) {
        humanError(err.message);
        throw err;
      }
      throw err;
    }
  },
});
