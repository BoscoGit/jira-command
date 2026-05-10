import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { validateKey } from '../jira/key.js';
import { getIssueLinks } from '../jira/links.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

interface LinksRow {
  direction: string;
  type: string;
  key: string;
  status: string;
  summary: string;
}

const COLUMNS: TableColumn<LinksRow>[] = [
  { header: 'Direção', key: 'direction' },
  { header: 'Tipo', key: 'type' },
  { header: 'Issue', key: 'key' },
  { header: 'Status', key: 'status' },
  { header: 'Resumo', key: 'summary' },
];

export const linksCommand = defineCommand({
  meta: {
    name: 'links',
    description: 'Lista links de entrada e saída de uma issue.',
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
      const links = await getIssueLinks(config, key);
      if (mode.json) {
        jsonOut(links);
        continue;
      }
      if (links.length === 0) {
        humanLog(process.stdout, `${key} não tem links.`);
        continue;
      }
      writeTable<LinksRow>(links, COLUMNS);
    }
  },
});
