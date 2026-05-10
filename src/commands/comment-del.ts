import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { deleteComment } from '../jira/comments.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { confirmInteractive } from '../platform/prompt.js';
import { resolveKeys } from '../stdin.js';

export const commentDelCommand = defineCommand({
  meta: {
    name: 'comment-del',
    description: 'Deleta comentário (com confirmação). Use --yes para pular o prompt.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    id: { type: 'positional', required: true, description: 'ID do comentário.' },
    yes: { type: 'boolean', description: 'Bypass do prompt; obrigatório em pipe.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const id = String(args.id ?? '');
    const yes = Boolean(args.yes);
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    const errors: JiraError[] = [];

    for (const key of keys) {
      try {
        validateKey(key);

        if (!yes) {
          if (!process.stdin.isTTY || !process.stdout.isTTY) {
            throw new JiraError(
              'Operação cancelada (modo não-interativo). Use --yes para confirmar.',
              2,
            );
          }
          const ok = await confirmInteractive(`Deletar comentário ${id} de ${key}? (s/n): `);
          if (!ok) {
            humanLog(process.stderr, 'Operação cancelada.', 'yellow');
            continue;
          }
        }

        await deleteComment(config, key, id);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'comment-del', commentId: id });
        } else {
          humanLog(process.stderr, `Comentário ${id} deletado.`, 'green');
        }
      } catch (err) {
        if (err instanceof JiraError) {
          humanError(err.message);
          errors.push(err);
        } else {
          throw err;
        }
      }
    }

    if (errors.length > 0) {
      const first = errors[0];
      if (first) throw first;
    }
  },
});
