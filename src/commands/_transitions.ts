import type { Config } from '../config.js';
import { JiraError } from '../errors.js';
import { validateKey } from '../jira/key.js';
import { getPattern, type PatternKind } from '../jira/patterns.js';
import {
  applyTransition,
  findTransition,
  listTransitions,
  type Transition,
} from '../jira/transitions.js';
import { getOutputMode, humanLog, jsonOut } from '../output.js';

const LABELS: Record<PatternKind, string> = {
  start: 'Em Andamento',
  done: 'Concluído',
  stop: 'A Fazer',
};

function listTransitionsLines(transitions: Transition[]): string[] {
  return transitions.map((t) => `  ${t.id} - ${t.name} -> ${t.to}`);
}

/**
 * Aplica transição via match de padrão, comum a `start`, `done`, `stop`.
 * Mensagens e exit codes seguem o spec 003 (RF-007/008).
 *
 * - match=one → applyTransition + log sucesso (humano ou JSON envelope).
 * - match=none → JiraError exitCode 1 com label da action e lista de disponíveis.
 * - match=many → JiraError exitCode 1 instruindo `jira move`.
 * - 403 → JiraError exitCode 5 com mensagem específica de transição.
 */
export async function runTransitionByPattern(
  config: Config,
  key: string,
  kind: PatternKind,
): Promise<void> {
  validateKey(key);
  const transitions = await listTransitions(config, key);
  const result = findTransition(transitions, getPattern(kind));

  if (result.match === 'none') {
    const label = LABELS[kind];
    const lines = [
      `Transição '${label}' não disponível em ${key}. Transições disponíveis:`,
      ...listTransitionsLines(result.available),
    ];
    throw new JiraError(lines.join('\n'), 1);
  }

  if (result.match === 'many') {
    const candidatesStr = result.candidates.map((c) => `${c.id} - ${c.name}`).join(', ');
    throw new JiraError(
      `Várias transições correspondem ao padrão em ${key}: ${candidatesStr}. Use 'jira move ${key} <ID>' para escolha exata.`,
      1,
    );
  }

  // match: 'one'
  const transition = result.transition;
  try {
    await applyTransition(config, key, transition.id);
  } catch (err) {
    if (err instanceof JiraError && err.httpStatus === 403) {
      throw new JiraError(`Sem permissão para realizar esta transição em ${key}.`, 5, {
        httpStatus: 403,
        cause: err,
      });
    }
    throw err;
  }

  const mode = getOutputMode();
  if (mode.json) {
    jsonOut({
      ok: true,
      key,
      action: kind,
      transitionId: transition.id,
      to: transition.to,
    });
  } else {
    humanLog(process.stderr, `${key} movida para '${transition.to}'.`, 'green');
  }
}

/**
 * Aplica transição por ID exato (`jira move`). Lista transições primeiro para
 * validar o ID e obter `to.name` para a mensagem de sucesso.
 */
export async function runTransitionById(
  config: Config,
  key: string,
  transitionId: string,
): Promise<void> {
  validateKey(key);
  const transitions = await listTransitions(config, key);
  const found = transitions.find((t) => t.id === transitionId);

  if (!found) {
    throw new JiraError(
      `Transição ${transitionId} não encontrada para ${key}. Execute 'jira trans ${key}' para ver as disponíveis.`,
      1,
    );
  }

  try {
    await applyTransition(config, key, transitionId);
  } catch (err) {
    if (err instanceof JiraError && err.httpStatus === 403) {
      throw new JiraError(`Sem permissão para realizar esta transição em ${key}.`, 5, {
        httpStatus: 403,
        cause: err,
      });
    }
    throw err;
  }

  const mode = getOutputMode();
  if (mode.json) {
    jsonOut({
      ok: true,
      key,
      action: 'move',
      transitionId,
      to: found.to,
    });
  } else {
    humanLog(
      process.stderr,
      `Transição ${transitionId} aplicada em ${key}. Estado atual: '${found.to}'.`,
      'green',
    );
  }
}
