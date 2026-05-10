import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';

export interface User {
  username: string;
  name: string;
  email: string;
  active: boolean;
}

interface RawUser {
  name: string;
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function mapUser(raw: RawUser): User {
  return {
    username: raw.name,
    name: raw.displayName ?? '',
    email: raw.emailAddress ?? '',
    active: Boolean(raw.active),
  };
}

async function fetchUsers(config: Config, project: string, username: string): Promise<User[]> {
  const params = new URLSearchParams({
    project,
    username,
    maxResults: '1000',
  });
  const res = await jiraFetch(config, `/rest/api/2/user/assignable/search?${params.toString()}`);
  const raw = (await res.json()) as RawUser[];
  return raw.map(mapUser);
}

/**
 * Lista usuários atribuíveis a um projeto.
 * - Com `filter`: 1 chamada com `username=<filter>`.
 * - Sem `filter`: 26 chamadas paralelas (a-z), deduplicando por username.
 * Resultado ordenado por displayName.
 */
export async function listAssignableUsers(
  config: Config,
  project: string,
  filter?: string,
): Promise<User[]> {
  let users: User[];
  if (filter && filter.length > 0) {
    users = await fetchUsers(config, project, filter);
  } else {
    const batches = await Promise.all(LETTERS.map((l) => fetchUsers(config, project, l)));
    const dedup = new Map<string, User>();
    for (const batch of batches) {
      for (const u of batch) {
        if (!dedup.has(u.username)) dedup.set(u.username, u);
      }
    }
    users = Array.from(dedup.values());
  }
  return users.sort((a, b) => a.name.localeCompare(b.name));
}
