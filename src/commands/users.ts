import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { listAssignableUsers } from '../jira/users.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

interface UserRow {
  username: string;
  name: string;
  email: string;
  active: string;
}

const COLUMNS: TableColumn<UserRow>[] = [
  { header: 'Username', key: 'username' },
  { header: 'Nome', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Ativo', key: 'active' },
];

export const usersCommand = defineCommand({
  meta: {
    name: 'users',
    description:
      'Lista usuários atribuíveis ao projeto. Sem --filter faz varredura a-z (26 chamadas paralelas).',
  },
  args: {
    project: { type: 'positional', required: true, description: 'Chave do projeto.' },
    filter: { type: 'string', description: 'Substring no username/displayName (1 chamada).' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const project = String(args.project ?? '');
    const filter = args.filter as string | undefined;

    const users = await listAssignableUsers(config, project, filter);
    const mode = getOutputMode();

    if (mode.json) {
      jsonOut(users);
      return;
    }

    if (users.length === 0) {
      humanLog(process.stdout, `Nenhum usuário encontrado em ${project}.`);
      return;
    }

    const rows: UserRow[] = users.map((u) => ({
      username: u.username,
      name: u.name,
      email: u.email,
      active: u.active ? 'true' : 'false',
    }));
    writeTable<UserRow>(rows, COLUMNS);
    humanLog(process.stderr, `${users.length} usuários encontrados.`, 'gray');
  },
});
