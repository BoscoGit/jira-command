import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import type { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import { createIssue, getParentProjectKey, getSubtasks } from '../../src/jira/create.js';

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

describe('createIssue', () => {
  it('POST /rest/api/2/issue com body {fields}, parseia key + monta url', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '10001', key: 'ABC-456', self: '...' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await createIssue(cfg, {
      project: { key: 'ABC' },
      summary: 'X',
      issuetype: { name: 'Task' },
    });
    expect(urlOf(0)).toContain('/rest/api/2/issue');
    expect(bodyOf(0)).toBe(
      JSON.stringify({
        fields: { project: { key: 'ABC' }, summary: 'X', issuetype: { name: 'Task' } },
      }),
    );
    expect(out).toEqual({ key: 'ABC-456', url: 'https://jira.example.com/browse/ABC-456' });
  });

  it('caller decide quais fields enviar (omitindo opcionais ausentes)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ key: 'ABC-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await createIssue(cfg, { project: { key: 'X' }, summary: 's', issuetype: { name: 'Bug' } });
    // body não contém priority, assignee, description
    expect(bodyOf(0)).not.toContain('priority');
    expect(bodyOf(0)).not.toContain('assignee');
    expect(bodyOf(0)).not.toContain('description');
  });
});

describe('getParentProjectKey', () => {
  it('parseia fields.project.key', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: { project: { key: 'XYZ' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await getParentProjectKey(cfg, 'ABC-1');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1?fields=project');
    expect(out).toBe('XYZ');
  });

  it('retorna string vazia quando fields.project ausente', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await getParentProjectKey(cfg, 'ABC-1')).toBe('');
  });

  it('valida Key local', async () => {
    try {
      await getParentProjectKey(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getSubtasks', () => {
  it('parseia fields.subtasks[]', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fields: {
            subtasks: [
              {
                key: 'ABC-501',
                fields: {
                  summary: 's1',
                  status: { name: 'Open' },
                  issuetype: { name: 'Sub-task' },
                },
              },
              { key: 'ABC-502', fields: {} },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await getSubtasks(cfg, 'ABC-1');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1?fields=subtasks');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ key: 'ABC-501', status: 'Open', type: 'Sub-task', summary: 's1' });
    expect(out[1]).toEqual({ key: 'ABC-502', status: '', type: '', summary: '' });
  });

  it('sem subtasks → []', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: { subtasks: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await getSubtasks(cfg, 'ABC-1')).toEqual([]);
  });

  it('valida Key', async () => {
    try {
      await getSubtasks(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
