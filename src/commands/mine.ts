import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { searchIssues } from '../jira/issues.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

const MINE_JQL =
  'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC';

const MINE_FIELDS = 'summary,status,priority';
const MINE_LIMIT = 50;

interface MineRow {
  key: string;
  priority: string;
  status: string;
  summary: string;
}

const COLUMNS: TableColumn<MineRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'Prioridade', key: 'priority' },
  { header: 'Status', key: 'status' },
  { header: 'Resumo', key: 'summary' },
];

export const mineCommand = defineCommand({
  meta: {
    name: 'mine',
    description: 'Lista minhas issues abertas (não resolvidas), ordenadas por prioridade.',
  },
  async run() {
    const config = loadConfigForApi();
    const { issues, total } = await searchIssues(config, MINE_JQL, MINE_FIELDS, MINE_LIMIT);
    const mode = getOutputMode();

    if (mode.json) {
      jsonOut(issues);
      return;
    }

    if (issues.length === 0) {
      humanLog(process.stdout, 'Nenhuma issue encontrada.');
      return;
    }

    const rows: MineRow[] = issues.map((i) => ({
      key: i.key,
      priority: i.priority ?? '',
      status: i.status,
      summary: i.summary,
    }));
    writeTable<MineRow>(rows, COLUMNS);

    if (total > MINE_LIMIT) {
      humanLog(process.stderr, `Mostrando ${MINE_LIMIT} de ${total} issues.`);
    }
  },
});
