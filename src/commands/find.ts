import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { searchIssues } from '../jira/issues.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

const FIND_FIELDS = 'summary,status,priority,assignee';

interface FindRow {
  key: string;
  priority: string;
  status: string;
  assignee: string;
  summary: string;
}

const COLUMNS: TableColumn<FindRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'Prioridade', key: 'priority' },
  { header: 'Status', key: 'status' },
  { header: 'Responsável', key: 'assignee' },
  { header: 'Resumo', key: 'summary' },
];

function parseLimit(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw ?? 50);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 200) {
    throw new JiraError(`--limit inválido: '${raw}'. Use inteiro entre 1 e 200.`, 2);
  }
  return n;
}

export const findCommand = defineCommand({
  meta: {
    name: 'find',
    description: 'Busca issues via JQL livre. Use aspas para JQL com espaços.',
  },
  args: {
    jql: {
      type: 'positional',
      required: true,
      description: 'Expressão JQL completa.',
    },
    limit: {
      type: 'string',
      description: 'Máximo de resultados (1..200, padrão 50).',
      default: '50',
    },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const jql = String(args.jql ?? '');
    const limit = parseLimit(args.limit);

    const { issues } = await searchIssues(config, jql, FIND_FIELDS, limit);
    const mode = getOutputMode();

    if (mode.json) {
      jsonOut(issues);
      return;
    }

    if (issues.length === 0) {
      humanLog(process.stdout, 'Nenhuma issue encontrada para o JQL informado.');
      return;
    }

    const rows: FindRow[] = issues.map((i) => ({
      key: i.key,
      priority: i.priority ?? '',
      status: i.status,
      assignee: i.assignee ?? '',
      summary: i.summary,
    }));
    writeTable<FindRow>(rows, COLUMNS);
  },
});
