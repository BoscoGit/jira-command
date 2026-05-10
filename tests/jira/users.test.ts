import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { listAssignableUsers } from '../../src/jira/users.js';

const cfg: Config = Object.freeze({
  token: 'TKN',
  baseUrl: 'https://jira.example.com',
  insecure: false,
  timeoutMs: 30000,
});

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResp(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  resetHttpStateForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listAssignableUsers', () => {
  it('com filter: 1 chamada com username=<filter>', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResp([
        {
          name: 'joao.silva',
          displayName: 'João Silva',
          emailAddress: 'j@x',
          active: true,
        },
      ]),
    );
    const out = await listAssignableUsers(cfg, 'MTET', 'silva');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/rest/api/2/user/assignable/search?');
    expect(url).toContain('project=MTET');
    expect(url).toContain('username=silva');
    expect(url).toContain('maxResults=1000');
    expect(out).toEqual([
      { username: 'joao.silva', name: 'João Silva', email: 'j@x', active: true },
    ]);
  });

  it('sem filter: 26 chamadas paralelas (a-z)', async () => {
    // mock retorna 1 user por letra, todas iguais (testa dedup)
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResp([{ name: 'joao', displayName: 'João', emailAddress: 'j@x', active: true }]),
      ),
    );
    const out = await listAssignableUsers(cfg, 'MTET');
    expect(fetchMock).toHaveBeenCalledTimes(26);
    // dedup: apenas 1 user
    expect(out).toHaveLength(1);
    expect(out[0]?.username).toBe('joao');
  });

  it('dedup mantém primeira ocorrência por username', async () => {
    let count = 0;
    fetchMock.mockImplementation(() => {
      count++;
      // letra "a" retorna joao + maria; outras retornam só joao (dup)
      if (count === 1) {
        return Promise.resolve(
          jsonResp([
            { name: 'joao', displayName: 'João', emailAddress: 'j@x', active: true },
            { name: 'maria', displayName: 'Maria', emailAddress: 'm@x', active: true },
          ]),
        );
      }
      return Promise.resolve(
        jsonResp([{ name: 'joao', displayName: 'João', emailAddress: 'j@x', active: true }]),
      );
    });
    const out = await listAssignableUsers(cfg, 'MTET');
    expect(fetchMock).toHaveBeenCalledTimes(26);
    expect(out).toHaveLength(2);
    expect(out.map((u) => u.username).sort()).toEqual(['joao', 'maria']);
  });

  it('ordena por displayName', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResp([
        { name: 'b', displayName: 'Bruno', emailAddress: '', active: true },
        { name: 'a', displayName: 'Ana', emailAddress: '', active: true },
        { name: 'c', displayName: 'Carlos', emailAddress: '', active: true },
      ]),
    );
    const out = await listAssignableUsers(cfg, 'MTET', 'x');
    expect(out.map((u) => u.name)).toEqual(['Ana', 'Bruno', 'Carlos']);
  });

  it('sem users → []', async () => {
    fetchMock.mockResolvedValueOnce(jsonResp([]));
    expect(await listAssignableUsers(cfg, 'MTET', 'x')).toEqual([]);
  });
});
