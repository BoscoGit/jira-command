import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { updateAssignee } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const unassignCommand = defineCommand({
  meta: {
    name: 'unassign',
    description: 'Remove o responsável da issue. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        await updateAssignee(config, key, null);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'unassign' });
        } else {
          humanLog(process.stderr, `${key} sem responsável.`, 'green');
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
