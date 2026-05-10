import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import type { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { createLink, getIssueLinks } from '../../src/jira/links.js';

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

describe('createLink', () => {
  it('POST /issueLink com body shape correto', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
    await createLink(cfg, 'ABC-1', 'Blocks', 'ABC-2');
    expect(urlOf(0)).toContain('/rest/api/2/issueLink');
    expect(bodyOf(0)).toBe(
      JSON.stringify({
        type: { name: 'Blocks' },
        outwardIssue: { key: 'ABC-1' },
        inwardIssue: { key: 'ABC-2' },
      }),
    );
  });

  it('valida Keys (from inválida)', async () => {
    try {
      await createLink(cfg, 'lixo', 'Blocks', 'ABC-2');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('valida Keys (to inválida)', async () => {
    try {
      await createLink(cfg, 'ABC-1', 'Blocks', 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getIssueLinks', () => {
  it('outwardIssue → direction=->; type=type.outward', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fields: {
            issuelinks: [
              {
                type: { outward: 'blocks', inward: 'is blocked by' },
                outwardIssue: {
                  key: 'ABC-2',
                  fields: { summary: 's', status: { name: 'Open' } },
                },
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await getIssueLinks(cfg, 'ABC-1');
    expect(out).toEqual([
      { direction: '->', type: 'blocks', key: 'ABC-2', status: 'Open', summary: 's' },
    ]);
  });

  it('inwardIssue → direction=<-; type=type.inward', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fields: {
            issuelinks: [
              {
                type: { outward: 'relates to', inward: 'relates to' },
                inwardIssue: {
                  key: 'ABC-3',
                  fields: { summary: 'r', status: { name: 'Done' } },
                },
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await getIssueLinks(cfg, 'ABC-1');
    expect(out).toEqual([
      { direction: '<-', type: 'relates to', key: 'ABC-3', status: 'Done', summary: 'r' },
    ]);
  });

  it('mix de outward + inward', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fields: {
            issuelinks: [
              {
                type: { outward: 'blocks', inward: 'blocked by' },
                outwardIssue: { key: 'A-2', fields: {} },
              },
              {
                type: { outward: 'rel', inward: 'rel' },
                inwardIssue: { key: 'A-3', fields: {} },
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await getIssueLinks(cfg, 'ABC-1');
    expect(out).toHaveLength(2);
    expect(out[0]?.direction).toBe('->');
    expect(out[1]?.direction).toBe('<-');
  });

  it('vazio → []', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: { issuelinks: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await getIssueLinks(cfg, 'ABC-1')).toEqual([]);
  });

  it('valida Key', async () => {
    try {
      await getIssueLinks(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
