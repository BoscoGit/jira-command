import { JiraError } from '../errors.js';

export type PatternKind = 'start' | 'done' | 'stop';

export const DEFAULT_PATTERNS: Readonly<Record<PatternKind, RegExp>> = Object.freeze({
  start: /Progress|Iniciar|Start|Em andamento|Andamento/i,
  done: /Done|Concluído|Concluido|Resolved|Resolvido|Finalizar|Fechar|Close/i,
  stop: /To Do|Reopen|Reabrir|Aberto|Pendente|Backlog/i,
});

const ENV_KEY: Readonly<Record<PatternKind, string>> = Object.freeze({
  start: 'JIRA_PATTERN_START',
  done: 'JIRA_PATTERN_DONE',
  stop: 'JIRA_PATTERN_STOP',
});

/**
 * Retorna RegExp case-insensitive para o tipo de transição (RF-001..003 do spec 003).
 * Override via env var `JIRA_PATTERN_<KIND>`. Inválida → JiraError exitCode 2.
 */
export function getPattern(kind: PatternKind): RegExp {
  const envName = ENV_KEY[kind];
  const raw = process.env[envName];
  if (!raw || raw.trim() === '') {
    return DEFAULT_PATTERNS[kind];
  }
  try {
    return new RegExp(raw, 'i');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    throw new JiraError(`${envName} inválido: ${msg}`, 2, { cause: err });
  }
}
