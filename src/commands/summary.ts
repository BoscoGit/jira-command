import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { updateField } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const summaryCommand = defineCommand({
  meta: {
    name: 'summary',
    description: 'Altera o título (summary) da issue. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    summary: { type: 'positional', required: true, description: 'Novo título.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const summary = String(args.summary ?? '');
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        await updateField(config, key, { summary });
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'summary', summary });
        } else {
          humanLog(process.stderr, `${key} título atualizado.`, 'green');
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
