import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';
import { validateKey } from './key.js';

export interface Comment {
  id: string;
  author: string;
  created: string;
  body: string;
}

interface RawComment {
  id: string;
  author?: { displayName?: string };
  created?: string;
  body?: string;
}

interface CommentsResponse {
  comments?: RawComment[];
  total?: number;
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
 * Cria comentário e retorna o objeto criado (parseia 201).
 */
export async function createComment(config: Config, key: string, body: string): Promise<Comment> {
  validateKey(key);
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  const raw = (await res.json()) as RawComment;
  return mapComment(raw);
}

/**
 * Lista comentários (mais recentes primeiro, padrão 50).
 */
export async function listComments(config: Config, key: string, max = 50): Promise<Comment[]> {
  validateKey(key);
  const params = new URLSearchParams({ maxResults: String(max), orderBy: '-created' });
  const res = await jiraFetch(config, `/rest/api/2/issue/${key}/comment?${params.toString()}`);
  const body = (await res.json()) as CommentsResponse;
  return (body.comments ?? []).map(mapComment);
}

/**
 * Deleta comentário por ID. Retorna 204 No Content em sucesso.
 */
export async function deleteComment(config: Config, key: string, commentId: string): Promise<void> {
  validateKey(key);
  await jiraFetch(config, `/rest/api/2/issue/${key}/comment/${commentId}`, {
    method: 'DELETE',
  });
}
