import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { updateField } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const prioCommand = defineCommand({
  meta: {
    name: 'prio',
    description: 'Altera prioridade da issue (ex: High, Medium, Low). Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    priority: { type: 'positional', required: true, description: 'Nome da prioridade.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const priority = String(args.priority ?? '');
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        await updateField(config, key, { priority: { name: priority } });
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'prio', priority });
        } else {
          humanLog(process.stderr, `${key} prioridade definida para ${priority}.`, 'green');
        }
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
