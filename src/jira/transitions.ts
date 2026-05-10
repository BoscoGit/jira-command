import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface Transition {
  id: string;
  name: string;
  to: string;
}

export type MatchResult =
  | { match: 'one'; transition: Transition }
  | { match: 'none'; available: Transition[] }
  | { match: 'many'; candidates: Transition[]; available: Transition[] };

interface RawTransition {
  id: string;
  name?: string;
  to?: { name?: string };
}

interface TransitionsResponse {
  transitions?: RawTransition[];
}

function mapTransition(raw: RawTransition): Transition {
  return {
    id: raw.id,
    name: raw.name ?? '',
    to: raw.to?.name ?? '',
  };
}

/**
 * Lista transições disponíveis para uma issue no estado atual.
 * Valida Key local antes do fetch (RF-008 do spec 002).
 */
export async function listTransitions(config: Config, key: string): Promise<Transition[]> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/transitions`);
  const body = (await res.json()) as TransitionsResponse;
  return (body.transitions ?? []).map(mapTransition);
}

/**
 * Aplica transição por ID. POST retorna 204 No Content em sucesso.
 */
export async function applyTransition(
  config: Config,
  key: string,
  transitionId: string,
): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
}

/**
 * Procura transição cujo `name` casa com `regex`. Retorna union discriminada
 * para forçar tratamento exaustivo no caller (RF-007 do spec 003).
 */
export function findTransition(transitions: Transition[], regex: RegExp): MatchResult {
  const candidates = transitions.filter((t) => regex.test(t.name));
  if (candidates.length === 0) return { match: 'none', available: transitions };
  if (candidates.length === 1) {
    const transition = candidates[0];
    if (transition) return { match: 'one', transition };
  }
  return { match: 'many', candidates, available: transitions };
}
