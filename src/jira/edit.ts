import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

interface MyselfResponse {
  name: string;
}

interface IssueDescriptionResponse {
  fields?: { description?: string | null };
}

let cachedMe: string | null = null;

/** Reset somente para testes — limpa o cache de `/myself`. */
export function resetEditCacheForTests(): void {
  cachedMe = null;
}

/**
 * Atribui ou desatribui (`name = null`) o responsável de uma issue.
 * `PUT /rest/api/2/issue/{key}/assignee` retorna 204.
 */
export async function updateAssignee(
  config: Config,
  key: string,
  name: string | null,
): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}/assignee`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

/**
 * Atualiza campos via `PUT /rest/api/2/issue/{key}` com body `{ fields }`.
 * Use para `priority`, `summary`, `description`.
 */
export async function updateField(
  config: Config,
  key: string,
  fields: Record<string, unknown>,
): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Adiciona label preservando existentes (RF-005, CS-002).
 * Usa `update.labels[].add` em vez de sobrescrever `fields.labels`.
 */
export async function addLabel(config: Config, key: string, label: string): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ update: { labels: [{ add: label }] } }),
  });
}

/**
 * Remove label específica preservando demais (RF-006).
 * Idempotente — Jira não falha se a label não existir.
 */
export async function removeLabel(config: Config, key: string, label: string): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ update: { labels: [{ remove: label }] } }),
  });
}

/**
 * Lê descrição atual via `GET /rest/api/2/issue/{key}?fields=description`.
 * Retorna string vazia quando descrição é null/undefined.
 */
export async function getDescription(config: Config, key: string): Promise<string> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}?fields=description`);
  const body = (await res.json()) as IssueDescriptionResponse;
  return body.fields?.description ?? '';
}

/**
 * Resolve username destino para `jira assign`.
 * - `raw` literal não-vazio e diferente de "me" (case-insensitive) → retorna direto.
 * - `raw` undefined OU "me" → consulta `/rest/api/2/myself` UMA VEZ por processo (cache).
 */
export async function resolveAssignee(config: Config, raw: string | undefined): Promise<string> {
  const trimmed = raw?.trim() ?? '';
  if (trimmed.length > 0 && trimmed.toLowerCase() !== 'me') {
    return trimmed;
  }
  if (cachedMe !== null) return cachedMe;
  const res = await jiraFetch(config, '/rest/api/2/myself');
  const body = (await res.json()) as MyselfResponse;
  cachedMe = body.name;
  return body.name;
}
