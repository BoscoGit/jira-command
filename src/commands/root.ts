import { defineCommand, runCommand, showUsage } from 'citty';
import { JiraError } from '../errors.js';
import { getOutputMode, humanError, jsonOut, setOutputMode } from '../output.js';
import { VERSION } from '../version.js';
import { doneCommand } from './done.js';
import { findCommand } from './find.js';
import { getCommand } from './get.js';
import { meCommand } from './me.js';
import { mineCommand } from './mine.js';
import { moveCommand } from './move.js';
import { openCommand } from './open.js';
import { pickCommand } from './pick.js';
import { startCommand } from './start.js';
import { statusCommand } from './status.js';
import { stopCommand } from './stop.js';
import { transCommand } from './trans.js';

export const rootCommand = defineCommand({
  meta: {
    name: 'jira',
    version: VERSION,
    description:
      'CLI Jira em TypeScript ESM — substituto de jira.ps1. Configure JIRA_TOKEN e JIRA_BASE_URL.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Saída em JSON UTF-8 no stdout (RF-009)',
      default: false,
    },
  },
  setup({ args }) {
    // `--no-color` é pre-processado em runRootSafe (citty trata `--no-X` como
    // negação automática). Aqui apenas propagamos `--json`.
    setOutputMode({
      json: Boolean(args.json),
    });
  },
  // Sem `run` no root: citty dispatcha exclusivamente para o subcomando casado.
  // Caso "sem args" (RF-005) é tratado em runRootSafe ANTES de chamar runCommand
  // — evita que showUsage seja invocado depois de um subcomando bem-sucedido.
  subCommands: {
    me: meCommand,
    mine: mineCommand,
    get: getCommand,
    find: findCommand,
    status: statusCommand,
    open: openCommand,
    pick: pickCommand,
    trans: transCommand,
    start: startCommand,
    done: doneCommand,
    stop: stopCommand,
    move: moveCommand,
  },
});

/**
 * Executa rootCommand com tratamento de erro padronizado (RF-008/019).
 * Retorna o exit code esperado, sem chamar `process.exit` — permite testes.
 *
 * Intercepta `--version`/`-V` ANTES de chamar citty (RF-020/021), pois `runCommand`
 * — diferente de `runMain` — não trata version automaticamente.
 */
export async function runRootSafe(rawArgs: string[]): Promise<number> {
  // `--no-color` ativa o modo sem cores (RF-025). Pré-processado aqui porque
  // citty interpreta o prefixo `--no-` como negação automática de booleano.
  const noColorRequested = rawArgs.includes('--no-color');
  setOutputMode({ noColor: noColorRequested });
  const filteredArgs = noColorRequested ? rawArgs.filter((a) => a !== '--no-color') : rawArgs;

  if (filteredArgs.includes('--version') || filteredArgs.includes('-V')) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  // Trata --help / -h em QUALQUER posição (RF-006/021), antes de carregar config.
  // citty não intercepta --help em subcomando que tenha `run`, então fazemos aqui.
  const wantsHelp = filteredArgs.includes('--help') || filteredArgs.includes('-h');
  if (wantsHelp) {
    const sub = filteredArgs.find(
      (a) =>
        !a.startsWith('-') &&
        rootCommand.subCommands !== undefined &&
        a in (rootCommand.subCommands as Record<string, unknown>),
    );
    if (sub !== undefined) {
      const target = (rootCommand.subCommands as Record<string, typeof rootCommand>)[sub];
      if (target) await showUsage(target, rootCommand);
    } else {
      await showUsage(rootCommand);
    }
    return 0;
  }

  // Sem positional → mostra usage (RF-005). Tratado AQUI (não em root.run) para
  // evitar duplo print quando subcomando válido também causaria root.run a rodar.
  const firstPositional = filteredArgs.find((a) => !a.startsWith('-'));
  if (firstPositional === undefined) {
    await showUsage(rootCommand);
    return 0;
  }

  // Subcomando desconhecido (RF-005, H3 critério 3): citty reportaria "Unknown
  // command X" e exit 1 — queremos mensagem específica e exit 2.
  if (rootCommand.subCommands && !(firstPositional in rootCommand.subCommands)) {
    humanError(
      `Comando desconhecido '${firstPositional}'. Execute 'jira --help' para ver os comandos disponíveis.`,
    );
    return 2;
  }

  try {
    await runCommand(rootCommand, { rawArgs: filteredArgs });
    return typeof process.exitCode === 'number' ? process.exitCode : 0;
  } catch (err) {
    if (err instanceof JiraError) {
      const mode = getOutputMode();
      if (mode.json) {
        jsonOut({ ok: false, error: err.message, exitCode: err.exitCode });
      } else {
        humanError(err.message);
      }
      return err.exitCode;
    }
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    humanError(msg);
    return 1;
  }
}
