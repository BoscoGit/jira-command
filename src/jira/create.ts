import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface CreatedIssue {
  key: string;
  url: string;
}

export interface Subtask {
  key: string;
  status: string;
  type: string;
  summary: string;
}

interface RawIssueCreated {
  id?: string;
  key: string;
  self?: string;
}

interface RawIssueWithProject {
  fields?: { project?: { key?: string } };
}

interface RawSubtask {
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    issuetype?: { name?: string };
  };
}

interface RawIssueWithSubtasks {
  fields?: { subtasks?: RawSubtask[] };
}

/**
 * Cria issue via POST /rest/api/2/issue. `fields` deve ser objeto montado pelo
 * caller (omitindo chaves opcionais ausentes). Retorna `key` + `url` montada.
 */
export async function createIssue(
  config: Config,
  fields: Record<string, unknown>,
): Promise<CreatedIssue> {
  const res = await jiraFetch(config, '/rest/api/2/issue', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  const raw = (await res.json()) as RawIssueCreated;
  return {
    key: raw.key,
    url: `${config.baseUrl}/browse/${raw.key}`,
  };
}

/**
 * Lê apenas `fields.project.key` da issue parent.
 * Usado por `jira sub` para herdar projeto sem o user precisar passá-lo.
 */
export async function getParentProjectKey(config: Config, parentKey: string): Promise<string> {
  validateKey(parentKey);
  const res = await jiraFetch(config, `/rest/api/2/issue/${parentKey}?fields=project`);
  const body = (await res.json()) as RawIssueWithProject;
  const key = body.fields?.project?.key;
  return key ?? '';
}

function mapSubtask(raw: RawSubtask): Subtask {
  const f = raw.fields ?? {};
  return {
    key: raw.key,
    status: f.status?.name ?? '',
    type: f.issuetype?.name ?? '',
    summary: f.summary ?? '',
  };
}

/**
 * Lista subtasks de uma issue (lê `fields.subtasks[]`).
 */
export async function getSubtasks(config: Config, key: string): Promise<Subtask[]> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}?fields=subtasks`);
  const body = (await res.json()) as RawIssueWithSubtasks;
  return (body.fields?.subtasks ?? []).map(mapSubtask);
}
