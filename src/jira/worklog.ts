import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface Worklog {
  id: string;
  author: string;
  started: string;
  timeSpent: string;
  comment: string;
}

interface RawWorklog {
  id: string;
  author?: { displayName?: string };
  started?: string;
  timeSpent?: string;
  comment?: string;
}

interface WorklogResponse {
  worklogs?: RawWorklog[];
  total?: number;
}

function mapWorklog(raw: RawWorklog): Worklog {
  return {
    id: raw.id,
    author: raw.author?.displayName ?? '',
    started: raw.started ?? '',
    timeSpent: raw.timeSpent ?? '',
    comment: raw.comment ?? '',
  };
}

/**
 * Cria worklog. `comment` opcional — quando ausente/vazio, omite a chave do body.
 * Retorna o worklog criado (parseia 201).
 */
export async function createWorklog(
  config: Config,
  key: string,
  timeSpent: string,
  comment?: string,
): Promise<Worklog> {
  validateKey(key);
  const payload: { timeSpent: string; comment?: string } = { timeSpent };
  if (comment && comment.trim().length > 0) {
    payload.comment = comment;
  }
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/worklog`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const raw = (await res.json()) as RawWorklog;
  return mapWorklog(raw);
}

/**
 * Lista todos os worklogs de uma issue.
 */
export async function listWorklog(config: Config, key: string): Promise<Worklog[]> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/worklog`);
  const body = (await res.json()) as WorklogResponse;
  return (body.worklogs ?? []).map(mapWorklog);
}
