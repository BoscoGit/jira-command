import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { validateKey } from '../jira/key.js';
import { createLink } from '../jira/links.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';

export const linkCommand = defineCommand({
  meta: {
    name: 'link',
    description: 'Cria link entre duas issues. Ex: jira link --from A --type Blocks --to B.',
  },
  args: {
    from: { type: 'string', required: true, description: 'Issue origem.' },
    type: { type: 'string', required: true, description: 'Nome do tipo de link.' },
    to: { type: 'string', required: true, description: 'Issue destino.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const from = String(args.from ?? '');
    const to = String(args.to ?? '');
    const type = String(args.type ?? '');
    validateKey(from);
    validateKey(to);

    try {
      await createLink(config, from, type, to);
      const mode = getOutputMode();
      if (mode.json) {
        jsonOut({ ok: true, action: 'link', from, to, type });
      } else {
        humanLog(process.stderr, `Link criado: ${from} -[${type}]-> ${to}.`, 'green');
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
