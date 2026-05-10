import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { validateKey } from '../jira/key.js';
import { createWorklog } from '../jira/worklog.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const logCommand = defineCommand({
  meta: {
    name: 'log',
    description: 'Registra tempo trabalhado em uma issue. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    time: {
      type: 'positional',
      required: true,
      description: 'Tempo formato Jira (ex: "1h", "30m", "1h 30m").',
    },
    comment: { type: 'positional', required: false, description: 'Descrição opcional.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const time = String(args.time ?? '');
    const comment = args.comment as string | undefined;
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        const created = await createWorklog(config, key, time, comment);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'log', time, worklogId: created.id });
        } else {
          humanLog(process.stderr, `Worklog ${time} registrado em ${key}.`, 'green');
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
