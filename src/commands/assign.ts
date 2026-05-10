import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { resolveAssignee, updateAssignee } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut, quietOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const assignCommand = defineCommand({
  meta: {
    name: 'assign',
    description: 'Atribui issue a um usuário (default: você). Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    user: { type: 'string', description: 'Username destino (default = você).' },
    quiet: { type: 'boolean', description: 'Imprime apenas a Key no stdout (RF-010).' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const username = await resolveAssignee(config, args.user as string | undefined);
    const mode = getOutputMode();
    const localQuiet = Boolean(args.quiet);

    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        await updateAssignee(config, key, username);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'assign', user: username });
        } else {
          humanLog(process.stderr, `${key} atribuído a ${username}.`, 'green');
          if (localQuiet) quietOut(key);
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
