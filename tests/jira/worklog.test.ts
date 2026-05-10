import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import type { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { createWorklog, listWorklog } from '../../src/jira/worklog.js';

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

function bodyOf(call: number): string {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return String(init?.body ?? '');
}
function urlOf(call: number): string {
  return String(fetchMock.mock.calls[call]?.[0] ?? '');
}

describe('createWorklog', () => {
  it('sem comment envia body apenas com {timeSpent}', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', timeSpent: '1h' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await createWorklog(cfg, 'ABC-1', '1h');
    expect(bodyOf(0)).toBe(JSON.stringify({ timeSpent: '1h' }));
  });

  it('com comment envia ambos', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', timeSpent: '30m', comment: 'bug' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await createWorklog(cfg, 'ABC-1', '30m', 'bug');
    expect(bodyOf(0)).toBe(JSON.stringify({ timeSpent: '30m', comment: 'bug' }));
  });

  it('comment vazio/whitespace é omitido', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', timeSpent: '1h' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await createWorklog(cfg, 'ABC-1', '1h', '   ');
    expect(bodyOf(0)).toBe(JSON.stringify({ timeSpent: '1h' }));
  });

  it('parseia 201 e retorna Worklog', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: '99',
          author: { displayName: 'Bosco' },
          started: '2026-05-10T00:00:00.000Z',
          timeSpent: '1h',
          comment: 'x',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await createWorklog(cfg, 'ABC-1', '1h', 'x');
    expect(out).toEqual({
      id: '99',
      author: 'Bosco',
      started: '2026-05-10T00:00:00.000Z',
      timeSpent: '1h',
      comment: 'x',
    });
  });

  it('valida Key', async () => {
    try {
      await createWorklog(cfg, 'lixo', '1h');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('listWorklog', () => {
  it('GET parseia worklogs[]', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          worklogs: [
            {
              id: '1',
              author: { displayName: 'A' },
              started: '2026-05-01',
              timeSpent: '1h',
              comment: 'x',
            },
            { id: '2', author: { displayName: 'B' }, started: '2026-05-02', timeSpent: '2h' },
          ],
          total: 2,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await listWorklog(cfg, 'ABC-1');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1/worklog');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: '1', author: 'A', timeSpent: '1h' });
    expect(out[1]?.comment).toBe('');
  });

  it('valida Key', async () => {
    try {
      await listWorklog(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
