import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { validateKey } from '../jira/key.js';
import { listTransitions } from '../jira/transitions.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

interface TransRow {
  id: string;
  name: string;
  to: string;
}

const COLUMNS: TableColumn<TransRow>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Nome', key: 'name' },
  { header: 'Para', key: 'to' },
];

export const transCommand = defineCommand({
  meta: {
    name: 'trans',
    description: 'Lista transições disponíveis para a issue (somente leitura).',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    for (const key of keys) {
      validateKey(key);
      const transitions = await listTransitions(config, key);
      if (mode.json) {
        jsonOut(transitions);
        continue;
      }
      if (transitions.length === 0) {
        humanLog(process.stdout, `Nenhuma transição disponível para ${key} no estado atual.`);
        continue;
      }
      writeTable<TransRow>(transitions, COLUMNS);
    }
  },
});
