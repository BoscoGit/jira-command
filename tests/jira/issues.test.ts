import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { getIssue, getIssueComments, searchIssues } from '../../src/jira/issues.js';

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

describe('searchIssues', () => {
  it('envia URL com jql encoded, maxResults e fields', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total: 2,
          issues: [
            {
              key: 'ABC-1',
              fields: {
                summary: 's1',
                status: { name: 'Open' },
                priority: { name: 'High' },
                assignee: { displayName: 'Bosco' },
              },
            },
            { key: 'ABC-2', fields: {} },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const out = await searchIssues(
      cfg,
      'project = ABC AND status = Open',
      'summary,status,priority,assignee',
      25,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/rest/api/2/search?');
    expect(url).toContain('jql=project+%3D+ABC+AND+status+%3D+Open');
    expect(url).toContain('maxResults=25');
    expect(url).toContain('fields=summary%2Cstatus%2Cpriority%2Cassignee');

    expect(out.total).toBe(2);
    expect(out.issues).toHaveLength(2);
    expect(out.issues[0]).toMatchObject({
      key: 'ABC-1',
      summary: 's1',
      status: 'Open',
      priority: 'High',
      assignee: 'Bosco',
    });
    expect(out.issues[1]?.priority).toBeNull();
    expect(out.issues[1]?.assignee).toBeNull();
  });

  it('retorna total=0 quando sem issues', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ total: 0, issues: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await searchIssues(cfg, 'x', 'summary', 50);
    expect(out.total).toBe(0);
    expect(out.issues).toEqual([]);
  });
});

describe('getIssue', () => {
  it('valida Key local ANTES de qualquer fetch', async () => {
    try {
      await getIssue(cfg, '123-abc');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('busca com fields=*navigable,comment e usa comentários inline', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          key: 'ABC-1',
          fields: {
            summary: 'Sx',
            status: { name: 'Open' },
            priority: { name: 'High' },
            assignee: { displayName: 'A' },
            reporter: { displayName: 'B' },
            description: 'desc',
            comment: {
              comments: [
                { id: '1', author: { displayName: 'X' }, created: '2026-01-01', body: 'c1' },
              ],
              total: 1,
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const out = await getIssue(cfg, 'ABC-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/rest/api/2/issue/ABC-1?fields=*navigable,comment');

    expect(out).toMatchObject({
      key: 'ABC-1',
      summary: 'Sx',
      status: 'Open',
      priority: 'High',
      assignee: 'A',
      reporter: 'B',
      description: 'desc',
    });
    expect(out.comments).toHaveLength(1);
    expect(out.comments[0]).toMatchObject({ id: '1', author: 'X', body: 'c1' });
  });

  it('faz fallback para /comment quando comentários inline ausentes', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: 'ABC-1',
            fields: { summary: 'S', status: { name: 'Open' } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            comments: [
              { id: '99', author: { displayName: 'Y' }, created: '2026-02-01', body: 'fallback' },
            ],
            total: 1,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const out = await getIssue(cfg, 'ABC-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = String(fetchMock.mock.calls[1]?.[0] ?? '');
    expect(second).toContain('/rest/api/2/issue/ABC-1/comment');
    expect(out.comments).toHaveLength(1);
    expect(out.comments[0]?.body).toBe('fallback');
  });

  it('404 propaga JiraError exitCode 4', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404, statusText: 'Not Found' }));
    try {
      await getIssue(cfg, 'ABC-1');
      expect.fail('deveria ter lançado');
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(4);
    }
  });
});

describe('getIssueComments', () => {
  it('chama endpoint /comment com maxResults e orderBy=-created', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          comments: [{ id: '1', author: { displayName: 'X' }, created: 'd', body: 'b' }],
          total: 1,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await getIssueComments(cfg, 'ABC-1', 5);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/rest/api/2/issue/ABC-1/comment?');
    expect(url).toContain('maxResults=5');
    expect(url).toContain('orderBy=-created');
    expect(out).toHaveLength(1);
  });

  it('valida Key local', async () => {
    try {
      await getIssueComments(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
