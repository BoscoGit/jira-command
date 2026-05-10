import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { searchIssues } from '../jira/issues.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

const STATUS_FIELDS = 'summary,status,priority';
const STATUS_LIMIT = 50;

interface StatusRow {
  key: string;
  priority: string;
  status: string;
  summary: string;
}

const COLUMNS: TableColumn<StatusRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'Prioridade', key: 'priority' },
  { header: 'Status', key: 'status' },
  { header: 'Resumo', key: 'summary' },
];

function buildJql(status: string): string {
  // Aspas duplas em volta do STATUS para suportar espaços (ex: "In Progress").
  // Escape simples de aspas duplas internas via barra invertida.
  const escaped = status.replace(/"/g, '\\"');
  return `assignee = currentUser() AND status = "${escaped}" ORDER BY updated DESC`;
}

export const statusCommand = defineCommand({
  meta: {
    name: 'status',
    description: 'Lista minhas issues filtradas por status (ex: "In Progress").',
  },
  args: {
    status: {
      type: 'positional',
      required: true,
      description: 'Nome do status (use aspas para nomes com espaço).',
    },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const status = String(args.status ?? '');
    const jql = buildJql(status);

    const { issues } = await searchIssues(config, jql, STATUS_FIELDS, STATUS_LIMIT);
    const mode = getOutputMode();

    if (mode.json) {
      jsonOut(issues);
      return;
    }

    if (issues.length === 0) {
      humanLog(process.stdout, `Nenhuma issue com status "${status}" encontrada.`);
      return;
    }

    const rows: StatusRow[] = issues.map((i) => ({
      key: i.key,
      priority: i.priority ?? '',
      status: i.status,
      summary: i.summary,
    }));
    writeTable<StatusRow>(rows, COLUMNS);
  },
});
