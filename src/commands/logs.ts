import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { previewText } from '../format/preview.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { validateKey } from '../jira/key.js';
import { listWorklog } from '../jira/worklog.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

interface LogsRow {
  id: string;
  author: string;
  date: string;
  time: string;
  comment: string;
}

const COLUMNS: TableColumn<LogsRow>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Autor', key: 'author' },
  { header: 'Data', key: 'date' },
  { header: 'Tempo', key: 'time' },
  { header: 'Comentário', key: 'comment' },
];

function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export const logsCommand = defineCommand({
  meta: {
    name: 'logs',
    description: 'Lista todos os worklogs (apontamentos) de uma issue.',
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
      const worklogs = await listWorklog(config, key);
      if (mode.json) {
        jsonOut(worklogs);
        continue;
      }
      if (worklogs.length === 0) {
        humanLog(process.stdout, `Nenhum apontamento em ${key}.`);
        continue;
      }
      const rows: LogsRow[] = worklogs.map((w) => ({
        id: w.id,
        author: w.author,
        date: shortDate(w.started),
        time: w.timeSpent,
        comment: previewText(w.comment, 60),
      }));
      writeTable<LogsRow>(rows, COLUMNS);
    }
  },
});
