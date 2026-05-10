import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { addLabel } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const labelCommand = defineCommand({
  meta: {
    name: 'label',
    description: 'Adiciona label à issue (preserva existentes). Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    label: { type: 'positional', required: true, description: 'Label a adicionar.' },
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
        await addLabel(config, key, label);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'label', added: label });
        } else {
          humanLog(process.stderr, `Label '${label}' adicionada em ${key}.`, 'green');
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
