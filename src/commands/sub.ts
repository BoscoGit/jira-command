import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { createIssue, getParentProjectKey } from '../jira/create.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut, quietOut } from '../output.js';

export const subCommand = defineCommand({
  meta: {
    name: 'sub',
    description: 'Cria subtask herdando o projeto do parent.',
  },
  args: {
    parent: { type: 'string', required: true, description: 'Key da issue parent.' },
    summary: { type: 'string', required: true, description: 'Título da subtask.' },
    type: { type: 'string', description: 'Tipo (default Sub-task).', default: 'Sub-task' },
    desc: { type: 'string', description: 'Descrição opcional.' },
    assignee: { type: 'string', description: 'Username do responsável.' },
    quiet: { type: 'boolean', description: 'Imprime apenas Key em stdout.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const parent = String(args.parent ?? '');
    validateKey(parent);

    try {
      const projectKey = await getParentProjectKey(config, parent);
      const fields: Record<string, unknown> = {
        project: { key: projectKey },
        summary: String(args.summary ?? ''),
        issuetype: { name: String(args.type ?? 'Sub-task') },
        parent: { key: parent },
      };
      const desc = args.desc as string | undefined;
      const assignee = args.assignee as string | undefined;
      if (desc && desc.length > 0) fields.description = desc;
      if (assignee && assignee.length > 0) fields.assignee = { name: assignee };

      const created = await createIssue(config, fields);
      const mode = getOutputMode();
      if (mode.json) {
        jsonOut({
          ok: true,
          key: created.key,
          action: 'sub',
          url: created.url,
          parent,
        });
      } else if (args.quiet) {
        quietOut(created.key);
      } else {
        humanLog(process.stderr, `Subtask criada: ${created.key} (parent ${parent})`, 'green');
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
