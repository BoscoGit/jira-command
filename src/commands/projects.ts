import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { listAllProjects, listMyProjects, type Project } from '../jira/projects.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

interface MyRow {
  key: string;
  id: string;
  name: string;
  issues: string;
}

interface AllRow {
  key: string;
  id: string;
  name: string;
}

const COLUMNS_MY: TableColumn<MyRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'ID', key: 'id' },
  { header: 'Nome', key: 'name' },
  { header: 'Issues', key: 'issues', align: 'right' },
];

const COLUMNS_ALL: TableColumn<AllRow>[] = [
  { header: 'Key', key: 'key' },
  { header: 'ID', key: 'id' },
  { header: 'Nome', key: 'name' },
];

export const projectsCommand = defineCommand({
  meta: {
    name: 'projects',
    description: 'Lista projetos do usuário (default) ou todos com --all.',
  },
  args: {
    all: { type: 'boolean', description: 'Lista todos projetos visíveis.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const mode = getOutputMode();

    if (args.all) {
      const projects = await listAllProjects(config);
      if (mode.json) {
        jsonOut(projects);
        return;
      }
      if (projects.length === 0) {
        humanLog(process.stdout, 'Nenhum projeto encontrado.');
        return;
      }
      const rows: AllRow[] = projects.map((p) => ({ key: p.key, id: p.id, name: p.name }));
      writeTable<AllRow>(rows, COLUMNS_ALL);
      return;
    }

    const { projects, truncated } = await listMyProjects(config);
    if (mode.json) {
      jsonOut(projects);
      return;
    }
    if (projects.length === 0) {
      humanLog(process.stdout, 'Nenhum projeto encontrado.');
      return;
    }
    const rows: MyRow[] = projects.map((p: Project) => ({
      key: p.key,
      id: p.id,
      name: p.name,
      issues: String(p.issues ?? 0),
    }));
    writeTable<MyRow>(rows, COLUMNS_MY);
    if (truncated) {
      humanLog(
        process.stderr,
        'Mostrando projetos baseados em até 500 issues — pode estar incompleto. Use --all para listar todos.',
        'yellow',
      );
    }
  },
});
