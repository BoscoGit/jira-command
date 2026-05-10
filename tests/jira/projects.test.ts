import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { listAllProjects, listMyProjects } from '../../src/jira/projects.js';

const cfg: Config = Object.freeze({
  token: 'TKN',
  baseUrl: 'https://jira.example.com',
  insecure: false,
  timeoutMs: 30000,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  resetHttpStateForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function urlOf(call: number): string {
  return String(fetchMock.mock.calls[call]?.[0] ?? '');
}

describe('listAllProjects', () => {
  it('GET /project, parseia + ordena por key', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { key: 'XYZ', id: '2', name: 'X' },
          { key: 'ABC', id: '1', name: 'A' },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await listAllProjects(cfg);
    expect(urlOf(0)).toContain('/rest/api/2/project');
    expect(out).toEqual([
      { key: 'ABC', id: '1', name: 'A' },
      { key: 'XYZ', id: '2', name: 'X' },
    ]);
  });

  it('vazio → []', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await listAllProjects(cfg)).toEqual([]);
  });
});

describe('listMyProjects', () => {
  it('agrupa por project.key + conta issues + ordena', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total: 5,
          issues: [
            { fields: { project: { key: 'XYZ', id: '2', name: 'X' } } },
            { fields: { project: { key: 'ABC', id: '1', name: 'A' } } },
            { fields: { project: { key: 'XYZ', id: '2', name: 'X' } } },
            { fields: { project: { key: 'ABC', id: '1', name: 'A' } } },
            { fields: { project: { key: 'ABC', id: '1', name: 'A' } } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await listMyProjects(cfg);
    expect(urlOf(0)).toContain('/rest/api/2/search?');
    expect(urlOf(0)).toContain('maxResults=500');
    expect(urlOf(0)).toContain('fields=project');
    expect(out.projects).toEqual([
      { key: 'ABC', id: '1', name: 'A', issues: 3 },
      { key: 'XYZ', id: '2', name: 'X', issues: 2 },
    ]);
    expect(out.truncated).toBe(false);
  });

  it('truncated=true quando total > 500', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ total: 501, issues: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await listMyProjects(cfg);
    expect(out.truncated).toBe(true);
  });

  it('sem issues → projects vazio', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ total: 0, issues: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await listMyProjects(cfg);
    expect(out.projects).toEqual([]);
    expect(out.truncated).toBe(false);
  });
});
