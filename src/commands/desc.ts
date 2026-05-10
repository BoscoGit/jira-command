import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { getDescription, updateField } from '../jira/edit.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { openEditor } from '../platform/editor.js';
import { registerTmpFile, unregisterTmpFile } from '../signal.js';
import { resolveKeys } from '../stdin.js';

function trimTrailingNewlines(s: string): string {
  return s.replace(/[\r\n]+$/, '');
}

async function editOne(config: ReturnType<typeof loadConfigForApi>, key: string): Promise<void> {
  if (!process.stdout.isTTY) {
    throw new JiraError('desc requer terminal interativo.', 2);
  }
  validateKey(key);

  const original = await getDescription(config, key);
  const path = join(tmpdir(), `jira-${key}-${randomUUID()}.md`);
  writeFileSync(path, original, 'utf8');
  registerTmpFile(path);

  try {
    await openEditor(path);
    const raw = readFileSync(path, 'utf8');
    const newText = trimTrailingNewlines(raw);
    const oldText = trimTrailingNewlines(original);
    const mode = getOutputMode();

    if (newText === oldText) {
      if (mode.json) {
        jsonOut({ ok: true, key, action: 'desc', updated: false });
      } else {
        humanLog(process.stderr, `Sem alterações em ${key}.`, 'yellow');
      }
      return;
    }

    await updateField(config, key, { description: newText });
    if (mode.json) {
      jsonOut({ ok: true, key, action: 'desc', updated: true });
    } else {
      humanLog(process.stderr, `${key} descrição atualizada.`, 'green');
    }
  } finally {
    unregisterTmpFile(path);
    rmSync(path, { force: true });
  }
}

export const descCommand = defineCommand({
  meta: {
    name: 'desc',
    description: 'Edita descrição em $EDITOR (ou padrão do SO). Salva apenas se mudou.',
  },
  args: {
    key: { type: 'positional', required: false, description: 'Chave da issue.' },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);
    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        await editOne(config, key);
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
