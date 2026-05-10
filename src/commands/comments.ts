import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { previewText } from '../format/preview.js';
import { type TableColumn, writeTable } from '../format/table.js';
import { listComments } from '../jira/comments.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

interface CommentRow {
  id: string;
  author: string;
  date: string;
  comment: string;
}

const COLUMNS: TableColumn<CommentRow>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Autor', key: 'author' },
  { header: 'Data', key: 'date' },
  { header: 'Comentário', key: 'comment' },
];

function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export const commentsCommand = defineCommand({
  meta: {
    name: 'comments',
    description: 'Lista os 50 comentários mais recentes de uma issue.',
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
      const comments = await listComments(config, key, 50);
      if (mode.json) {
        jsonOut(comments);
        continue;
      }
      if (comments.length === 0) {
        humanLog(process.stdout, `Nenhum comentário em ${key}.`);
        continue;
      }
      const rows: CommentRow[] = comments.map((c) => ({
        id: c.id,
        author: c.author,
        date: shortDate(c.created),
        comment: previewText(c.body, 80),
      }));
      writeTable<CommentRow>(rows, COLUMNS);
    }
  },
});
