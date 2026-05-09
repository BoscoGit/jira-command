import { defineCommand, runCommand, showUsage } from 'citty';
import { JiraError } from '../errors.js';
import { getOutputMode, humanError, jsonOut, setOutputMode } from '../output.js';
import { VERSION } from '../version.js';
import { meCommand } from './me.js';

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
  async run({ cmd }) {
    // Sem subcomando: mostra help (RF-005). --help/--version já são interceptados por citty.
    await showUsage(cmd);
  },
  subCommands: {
    me: meCommand,
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

  // Detecta subcomando desconhecido ANTES de citty processar (RF-005, H3 critério 3).
  // citty reportaria "Unknown command X" e exit 1 — queremos mensagem específica e exit 2.
  const firstPositional = filteredArgs.find((a) => !a.startsWith('-'));
  if (
    firstPositional !== undefined &&
    rootCommand.subCommands &&
    !(firstPositional in rootCommand.subCommands)
  ) {
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
