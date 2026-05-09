import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { jiraFetch } from '../http.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

interface Myself {
  name: string;
  displayName: string;
  emailAddress: string;
  key: string;
}

export const meCommand = defineCommand({
  meta: {
    name: 'me',
    description: 'Mostra usuário autenticado (valida token).',
  },
  async run() {
    const config = loadConfigForApi();
    const res = await jiraFetch(config, '/rest/api/2/myself');
    const me = (await res.json()) as Myself;

    const mode = getOutputMode();
    if (mode.json) {
      jsonOut({
        name: me.name,
        displayName: me.displayName,
        emailAddress: me.emailAddress,
        key: me.key,
      });
      return;
    }

    humanLog(process.stdout, `Logado como: ${me.displayName} <${me.emailAddress}>`, 'green');
    humanLog(process.stdout, `Username  : ${me.name}`, 'cyan');
    humanLog(process.stdout, `Key       : ${me.key}`, 'cyan');
  },
});
