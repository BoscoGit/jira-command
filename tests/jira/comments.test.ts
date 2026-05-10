import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { createComment, deleteComment, listComments } from '../../src/jira/comments.js';

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
function bodyOf(call: number): string {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return String(init?.body ?? '');
}
function methodOf(call: number): string {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return String(init?.method ?? 'GET');
}

describe('createComment', () => {
  it('POST com body {body} e parseia retorno 201', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: '999',
          author: { displayName: 'Bosco' },
          created: '2026-05-10T00:00:00.000Z',
          body: 'PR enviado',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await createComment(cfg, 'ABC-1', 'PR enviado');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1/comment');
    expect(methodOf(0)).toBe('POST');
    expect(bodyOf(0)).toBe(JSON.stringify({ body: 'PR enviado' }));
    expect(out).toEqual({
      id: '999',
      author: 'Bosco',
      created: '2026-05-10T00:00:00.000Z',
      body: 'PR enviado',
    });
  });

  it('valida Key local', async () => {
    try {
      await createComment(cfg, 'lixo', 'x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('listComments', () => {
  it('GET com maxResults e orderBy=-created, parseia comments[]', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          comments: [
            {
              id: '1',
              author: { displayName: 'A' },
              created: '2026-05-01',
              body: 'c1',
            },
            { id: '2', author: { displayName: 'B' }, created: '2026-05-02', body: 'c2' },
          ],
          total: 2,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await listComments(cfg, 'ABC-1');
    const url = urlOf(0);
    expect(url).toContain('/rest/api/2/issue/ABC-1/comment?');
    expect(url).toContain('maxResults=50');
    expect(url).toContain('orderBy=-created');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: '1', author: 'A', body: 'c1' });
  });

  it('aceita custom max', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ comments: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await listComments(cfg, 'ABC-1', 10);
    expect(urlOf(0)).toContain('maxResults=10');
  });

  it('valida Key', async () => {
    try {
      await listComments(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('deleteComment', () => {
  it('DELETE para URL correta + aceita 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteComment(cfg, 'ABC-1', '12345');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1/comment/12345');
    expect(methodOf(0)).toBe('DELETE');
  });

  it('valida Key', async () => {
    try {
      await deleteComment(cfg, 'lixo', '1');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404 propaga via mapHttpToError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404, statusText: 'Not Found' }));
    try {
      await deleteComment(cfg, 'ABC-1', '99');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(4);
    }
  });
});
