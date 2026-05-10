import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { humanError } from '../output.js';
import { resolveKeys } from '../stdin.js';
import { runTransitionById } from './_transitions.js';

export const moveCommand = defineCommand({
  meta: {
    name: 'move',
    description: 'Aplica transição por ID exato. Use jira trans <KEY> para descobrir IDs.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    id: { type: 'positional', required: true, description: 'ID numérico da transição.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const transitionId = String(args.id ?? '');
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        await runTransitionById(config, key, transitionId);
      } catch (err) {
        if (err instanceof JiraError) {
          humanError(err.message);
          errors.push(err);
        } else {
          throw err;
        }
      }
    }
    if (errors.length > 0) {
      const first = errors[0];
      if (first) throw first;
    }
  },
});
