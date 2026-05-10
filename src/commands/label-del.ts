import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { removeLabel } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const labelDelCommand = defineCommand({
  meta: {
    name: 'label-del',
    description: 'Remove label específica da issue (preserva demais). Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    label: { type: 'positional', required: true, description: 'Label a remover.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const label = String(args.label ?? '');
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        await removeLabel(config, key, label);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'label-del', removed: label });
        } else {
          humanLog(process.stderr, `Label '${label}' removida de ${key}.`, 'green');
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
