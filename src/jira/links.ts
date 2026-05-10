import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface IssueLink {
  direction: '->' | '<-';
  type: string;
  key: string;
  status: string;
  summary: string;
}

interface RawLinkedIssue {
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
  };
}

interface RawIssueLink {
  type?: { outward?: string; inward?: string };
  outwardIssue?: RawLinkedIssue;
  inwardIssue?: RawLinkedIssue;
}

interface RawIssueLinksResponse {
  fields?: { issuelinks?: RawIssueLink[] };
}

/**
 * Cria link entre duas issues.
 * `from` -[type]-> `to` (outwardIssue=from, inwardIssue=to).
 */
export async function createLink(
  config: Config,
  from: string,
  type: string,
  to: string,
): Promise<void> {
  validateKey(from);
  validateKey(to);
  await jiraFetch(config, '/rest/api/2/issueLink', {
    method: 'POST',
    body: JSON.stringify({
      type: { name: type },
      outwardIssue: { key: from },
      inwardIssue: { key: to },
    }),
  });
}

function mapLink(raw: RawIssueLink): IssueLink | null {
  if (raw.outwardIssue) {
    const li = raw.outwardIssue;
    return {
      direction: '->',
      type: raw.type?.outward ?? '',
      key: li.key,
      status: li.fields?.status?.name ?? '',
      summary: li.fields?.summary ?? '',
    };
  }
  if (raw.inwardIssue) {
    const li = raw.inwardIssue;
    return {
      direction: '<-',
      type: raw.type?.inward ?? '',
      key: li.key,
      status: li.fields?.status?.name ?? '',
      summary: li.fields?.summary ?? '',
    };
  }
  return null;
}

/**
 * Lista links de uma issue (entrada e saída).
 */
export async function getIssueLinks(config: Config, key: string): Promise<IssueLink[]> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}?fields=issuelinks`);
  const body = (await res.json()) as RawIssueLinksResponse;
  const out: IssueLink[] = [];
  for (const link of body.fields?.issuelinks ?? []) {
    const mapped = mapLink(link);
    if (mapped) out.push(mapped);
  }
  return out;
}
