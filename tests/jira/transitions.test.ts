import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import {
  applyTransition,
  findTransition,
  listTransitions,
  type Transition,
} from '../../src/jira/transitions.js';

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

describe('listTransitions', () => {
  it('chama URL correta + parseia transitions[]', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          transitions: [
            { id: '21', name: 'Start Progress', to: { name: 'In Progress' } },
            { id: '31', name: 'Resolve', to: { name: 'Resolved' } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const out = await listTransitions(cfg, 'ABC-1');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/rest/api/2/issue/ABC-1/transitions');
    expect(out).toEqual([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
      { id: '31', name: 'Resolve', to: 'Resolved' },
    ]);
  });

  it('valida Key local antes do fetch', async () => {
    try {
      await listTransitions(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('transitions vazio retorna []', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ transitions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await listTransitions(cfg, 'ABC-1')).toEqual([]);
  });

  it('campos opcionais faltando viram strings vazias', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ transitions: [{ id: '99' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await listTransitions(cfg, 'ABC-1');
    expect(out).toEqual([{ id: '99', name: '', to: '' }]);
  });
});

describe('applyTransition', () => {
  it('envia POST com body { transition: { id } }', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await applyTransition(cfg, 'ABC-1', '21');
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(url).toContain('/rest/api/2/issue/ABC-1/transitions');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ transition: { id: '21' } }));
  });

  it('aceita 204 No Content sem JSON parse', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(applyTransition(cfg, 'ABC-1', '21')).resolves.toBeUndefined();
  });

  it('valida Key local', async () => {
    try {
      await applyTransition(cfg, 'lixo', '21');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('403 → exitCode 5', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403, statusText: 'Forbidden' }));
    try {
      await applyTransition(cfg, 'ABC-1', '21');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(5);
    }
  });
});

describe('findTransition', () => {
  const ts: Transition[] = [
    { id: '21', name: 'Start Progress', to: 'In Progress' },
    { id: '31', name: 'Done', to: 'Done' },
    { id: '41', name: 'Resume Progress', to: 'In Progress' },
  ];

  it('1 match → match: "one" com transition', () => {
    const r = findTransition(ts, /Done/i);
    expect(r.match).toBe('one');
    if (r.match === 'one') expect(r.transition.id).toBe('31');
  });

  it('0 matches → match: "none" com available', () => {
    const r = findTransition(ts, /Cancel/i);
    expect(r.match).toBe('none');
    if (r.match === 'none') expect(r.available).toEqual(ts);
  });

  it('2+ matches → match: "many" com candidates e available', () => {
    const r = findTransition(ts, /Progress/i);
    expect(r.match).toBe('many');
    if (r.match === 'many') {
      expect(r.candidates).toHaveLength(2);
      expect(r.candidates.map((c) => c.id)).toEqual(['21', '41']);
      expect(r.available).toEqual(ts);
    }
  });

  it('match respeita flags do regex (caller passa /i quando quer case-insensitive)', () => {
    expect(findTransition(ts, /progress/i).match).toBe('many');
    expect(findTransition(ts, /progress/).match).toBe('none'); // sem flag i não casa "Progress"
    expect(findTransition(ts, /DONE/i).match).toBe('one');
    expect(findTransition(ts, /tart/i).match).toBe('one');
  });

  it('lista vazia → match: "none" com available vazio', () => {
    const r = findTransition([], /x/);
    expect(r.match).toBe('none');
    if (r.match === 'none') expect(r.available).toEqual([]);
  });
});
