import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { humanError } from '../output.js';
import { resolveKeys } from '../stdin.js';
import { runTransitionByPattern } from './_transitions.js';

export const doneCommand = defineCommand({
  meta: {
    name: 'done',
    description: 'Move issue para "Concluído" via match de padrão. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        await runTransitionByPattern(config, key, 'done');
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
