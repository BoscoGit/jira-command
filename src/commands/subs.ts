import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { getSubtasks } from '../jira/create.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

interface SubsRow {
  key: string;
  status: string;
  type: string;
  summary: string;
}

const COLUMNS: TableColumn<SubsRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'Status', key: 'status' },
  { header: 'Tipo', key: 'type' },
  { header: 'Resumo', key: 'summary' },
];

export const subsCommand = defineCommand({
  meta: {
    name: 'subs',
    description: 'Lista subtasks de uma issue. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue parent.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    for (const key of keys) {
      validateKey(key);
      const subs = await getSubtasks(config, key);
      if (mode.json) {
        jsonOut(subs);
        continue;
      }
      if (subs.length === 0) {
        humanLog(process.stdout, `${key} não tem subtasks.`);
        continue;
      }
      writeTable<SubsRow>(subs, COLUMNS);
    }
  },
});
