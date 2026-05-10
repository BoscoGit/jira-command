import { defineCommand } from 'citty';
import { loadConfigForApi } from '../config.js';
import { JiraError } from '../errors.js';
import { getIssue, type Issue } from '../jira/issues.js';
import { validateKey } from '../jira/key.js';
import { getOutputMode, humanError, humanLog, jsonOut } from '../output.js';
import { resolveKeys } from '../stdin.js';

function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function printHuman(issue: Issue): void {
  humanLog(process.stdout, '');
  humanLog(process.stdout, `=== ${issue.key} ===`, 'cyan');
  humanLog(process.stdout, `Summary  : ${issue.summary}`);
  humanLog(process.stdout, `Status   : ${issue.status}`);
  humanLog(process.stdout, `Priority : ${issue.priority ?? ''}`);
  humanLog(process.stdout, `Assignee : ${issue.assignee ?? ''}`);
  humanLog(process.stdout, `Reporter : ${issue.reporter ?? ''}`);

  humanLog(process.stdout, '');
  humanLog(process.stdout, '--- Description ---', 'yellow');
  humanLog(process.stdout, issue.description ?? '(sem descrição)');

  if (issue.comments.length > 0) {
    humanLog(process.stdout, '');
    humanLog(process.stdout, `--- Comments (${issue.comments.length}) ---`, 'yellow');
    for (const c of issue.comments) {
      humanLog(process.stdout, '');
      humanLog(process.stdout, `[#${c.id} | ${c.author} - ${shortDate(c.created)}]`, 'green');
      humanLog(process.stdout, c.body);
    }
  }
}

async function processOne(config: ReturnType<typeof loadConfigForApi>, key: string): Promise<void> {
  validateKey(key);
  let issue: Issue;
  try {
    issue = await getIssue(config, key);
  } catch (err) {
    if (err instanceof JiraError && err.httpStatus === 404) {
      const opts: { httpStatus: number; statusText?: string; cause: unknown } = {
        httpStatus: 404,
        cause: err,
      };
      if (err.statusText !== undefined) opts.statusText = err.statusText;
      throw new JiraError(`Issue ${key} não encontrada.`, 4, opts);
    }
    throw err;
  }

  const mode = getOutputMode();
  if (mode.json) {
    jsonOut(issue);
  } else {
    printHuman(issue);
  }
}

export const getCommand = defineCommand({
  meta: {
    name: 'get',
    description:
      'Mostra detalhes de uma issue (Summary, Status, Priority, Assignee, Reporter, Description e até 10 comentários). Aceita Key via argumento ou stdin.',
  },
  args: {
    key: {
      type: 'positional',
      required: false,
      description: 'Chave da issue (ex: ABC-123). Se ausente, lê do stdin.',
    },
  },
  async run({ args }) {
    const config = loadConfigForApi();
    const keys = await resolveKeys(args.key as string | undefined);

    const errors: JiraError[] = [];
    for (const key of keys) {
      try {
        await processOne(config, key);
      } catch (err) {
        if (err instanceof JiraError) {
          errors.push(err);
          humanError(err.message);
        } else {
          throw err;
        }
      }
    }

    if (errors.length > 0) {
      // primeiro erro determina exitCode (estratégia simples e previsível)
      const first = errors[0];
      if (first) throw first;
    }
  },
});
