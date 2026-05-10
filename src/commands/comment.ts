import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { createComment } from '../jira/comments.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

export const commentCommand = defineCommand({
  meta: {
    name: 'comment',
    description: 'Adiciona comentário a uma issue. Aceita Key via stdin.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
    text: { type: 'positional', required: true, description: 'Texto do comentário.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const text = String(args.text ?? '');
    if (text.trim().length === 0) {
      throw new JiraError('O texto do comentário não pode ser vazio.', 2);
    }
    const keys = await resolveKeys(args.key as string | undefined);
    const mode = getOutputMode();
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        validateKey(key);
        const created = await createComment(config, key, text);
        if (mode.json) {
          jsonOut({ ok: true, key, action: 'comment', commentId: created.id });
        } else {
          humanLog(process.stderr, `Comentário adicionado em ${key} (#${created.id}).`, 'green');
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
