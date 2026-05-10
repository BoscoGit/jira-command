import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { openInBrowser } from '../platform/browser.js';
import { resolveKeys } from '../stdin.js';

export const openCommand = defineCommand({
  meta: {
    name: 'open',
    description: 'Abre uma issue no browser padrão. Aceita Key via argumento ou stdin.',
  },
  args: {
    key: {
      type: 'positional',
      required: false,
      description: 'Chave da issue (ex: ABC-123).',
    },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();

    for (const key of keys) {
      validateKey(key);
      const url = `${config.baseUrl}/browse/${key}`;
      await openInBrowser(url);

      if (mode.json) {
        jsonOut({ ok: true, key, action: 'open' });
      } else {
        humanLog(process.stderr, `Abrindo ${key} no navegador...`, 'cyan');
      }
    }
  },
});
