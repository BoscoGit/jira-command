import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface IssueSummary {
  key: string;
  summary: string;
  status: string;
  priority: string | null;
  assignee: string | null;
  updated: string | null;
}

export interface Comment {
  id: string;
  author: string;
  created: string;
  body: string;
}

export interface Issue {
  key: string;
  summary: string;
  status: string;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  description: string | null;
  comments: Comment[];
}

interface RawIssueFields {
  summary?: string;
  status?: { name?: string };
  priority?: { name?: string } | null;
  assignee?: { displayName?: string } | null;
  reporter?: { displayName?: string } | null;
  description?: string | null;
  updated?: string | null;
  comment?: { comments?: RawComment[]; total?: number };
}

interface RawIssue {
  key: string;
  fields?: RawIssueFields;
}

interface RawComment {
  id: string;
  author?: { displayName?: string };
  created?: string;
  body?: string;
}

interface SearchResponse {
  total?: number;
  issues?: RawIssue[];
}

interface CommentsResponse {
  comments?: RawComment[];
  total?: number;
}

function mapSummary(raw: RawIssue): IssueSummary {
  const f = raw.fields ?? {};
  return {
    key: raw.key,
    summary: f.summary ?? '',
    status: f.status?.name ?? '',
    priority: f.priority?.name ?? null,
    assignee: f.assignee?.displayName ?? null,
    updated: f.updated ?? null,
  };
}

function mapComment(raw: RawComment): Comment {
  return {
    id: raw.id,
    author: raw.author?.displayName ?? '',
    created: raw.created ?? '',
    body: raw.body ?? '',
  };
}

/**
 * Busca issues via JQL. Limita campos retornados via `fields` (CSV).
 */
export async function searchIssues(
  config: Config,
  jql: string,
  fields: string,
  maxResults: number,
): Promise<{ issues: IssueSummary[]; total: number }> {
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields,
  });
  const res = await jiraFetch(config, `/rest/api/2/search?${params.toString()}`);
  const body = (await res.json()) as SearchResponse;
  const issues = (body.issues ?? []).map(mapSummary);
  return { issues, total: body.total ?? issues.length };
}

/**
 * Lista comentários de uma issue (mais recentes primeiro).
 */
export async function getIssueComments(config: Config, key: string, max = 10): Promise<Comment[]> {
  validateKey(key);
  const params = new URLSearchParams({
    maxResults: String(max),
    orderBy: '-created',
  });
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/comment?${params.toString()}`);
  const body = (await res.json()) as CommentsResponse;
  return (body.comments ?? []).map(mapComment);
}

/**
 * Detalhes completos de uma issue. Tenta trazer comentários inline via
 * `?fields=*navigable,comment`; se ausente, faz fallback para getIssueComments.
 *
 * Validação local de Key acontece ANTES de qualquer chamada HTTP (RF-008/spec-002).
 */
export async function getIssue(config: Config, key: string): Promise<Issue> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}?fields=*navigable,comment`);
  const raw = (await res.json()) as RawIssue;
  const f = raw.fields ?? {};

  let comments: Comment[];
  if (Array.isArray(f.comment?.comments) && f.comment.comments.length >= 0) {
    comments = (f.comment.comments ?? []).slice(0, 10).map(mapComment);
  } else {
    comments = await getIssueComments(config, key, 10);
  }

  return {
    key: raw.key,
    summary: f.summary ?? '',
    status: f.status?.name ?? '',
    priority: f.priority?.name ?? null,
    assignee: f.assignee?.displayName ?? null,
    reporter: f.reporter?.displayName ?? null,
    description: f.description ?? null,
    comments,
  };
}
