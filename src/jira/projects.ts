import type { Config } from '../config.js';
import { jiraFetch } from '../http.js';

export interface Project {
  key: string;
  id: string;
  name: string;
  issues?: number;
}

interface RawProject {
  key: string;
  id: string;
  name?: string;
}

interface RawSearchProject {
  fields?: { project?: RawProject };
}

interface RawSearchResponse {
  total?: number;
  issues?: RawSearchProject[];
}

const MY_PROJECTS_LIMIT = 500;

function compareByKey(a: Project, b: Project): number {
  return a.key.localeCompare(b.key);
}

/**
 * Lista TODOS projetos visíveis no Jira, ordenados por key.
 */
export async function listAllProjects(config: Config): Promise<Project[]> {
  const res = await jiraFetch(config, '/rest/api/2/project');
  const raw = (await res.json()) as RawProject[];
  const projects: Project[] = raw.map((p) => ({
    key: p.key,
    id: p.id,
    name: p.name ?? '',
  }));
  return projects.sort(compareByKey);
}

/**
 * Lista projetos do usuário (assignee/reporter), com contagem de issues.
 * `truncated=true` quando `total > 500` — caller deve avisar.
 */
export async function listMyProjects(
  config: Config,
): Promise<{ projects: Project[]; truncated: boolean }> {
  const jql = 'assignee = currentUser() OR reporter = currentUser()';
  const params = new URLSearchParams({
    jql,
    fields: 'project',
    maxResults: String(MY_PROJECTS_LIMIT),
  });
  const res = await jiraFetch(config, `/rest/api/2/search?${params.toString()}`);
  const body = (await res.json()) as RawSearchResponse;

  const counts = new Map<string, Project>();
  for (const item of body.issues ?? []) {
    const p = item.fields?.project;
    if (!p) continue;
    const existing = counts.get(p.key);
    if (existing) {
      existing.issues = (existing.issues ?? 0) + 1;
    } else {
      counts.set(p.key, { key: p.key, id: p.id, name: p.name ?? '', issues: 1 });
    }
  }

  const projects = Array.from(counts.values()).sort(compareByKey);
  return { projects, truncated: (body.total ?? 0) > MY_PROJECTS_LIMIT };
}
