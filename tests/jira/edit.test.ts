import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../src/config.js';
import type { JiraError } from '../../src/errors.js';
import { resetHttpStateForTests } from '../../src/http.js';
import {
  addLabel,
  getDescription,
  removeLabel,
  resetEditCacheForTests,
  resolveAssignee,
  updateAssignee,
  updateField,
} from '../../src/jira/edit.js';

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
  resetEditCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetEditCacheForTests();
});

function urlOf(call: number): string {
  return String(fetchMock.mock.calls[call]?.[0] ?? '');
}
function bodyOf(call: number): string {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return String(init?.body ?? '');
}

describe('updateAssignee', () => {
  it('PUT /assignee com body {name}', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateAssignee(cfg, 'ABC-1', 'joao');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1/assignee');
    expect(bodyOf(0)).toBe(JSON.stringify({ name: 'joao' }));
  });

  it('PUT /assignee com body {name: null} desatribui', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateAssignee(cfg, 'ABC-1', null);
    expect(bodyOf(0)).toBe(JSON.stringify({ name: null }));
  });

  it('valida Key local', async () => {
    try {
      await updateAssignee(cfg, 'lixo', 'joao');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateField', () => {
  it('PUT /issue/{key} com body {fields}', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateField(cfg, 'ABC-1', { summary: 'Novo título' });
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1');
    expect(urlOf(0)).not.toContain('/assignee');
    expect(bodyOf(0)).toBe(JSON.stringify({ fields: { summary: 'Novo título' } }));
  });

  it('priority também via fields', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateField(cfg, 'ABC-1', { priority: { name: 'High' } });
    expect(bodyOf(0)).toContain('"priority":{"name":"High"}');
  });

  it('valida Key local', async () => {
    try {
      await updateField(cfg, 'lixo', { summary: 's' });
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('addLabel / removeLabel', () => {
  it('addLabel envia update.labels[].add', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await addLabel(cfg, 'ABC-1', 'backend');
    expect(bodyOf(0)).toBe(JSON.stringify({ update: { labels: [{ add: 'backend' }] } }));
  });

  it('removeLabel envia update.labels[].remove', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await removeLabel(cfg, 'ABC-1', 'backend');
    expect(bodyOf(0)).toBe(JSON.stringify({ update: { labels: [{ remove: 'backend' }] } }));
  });

  it('addLabel valida Key', async () => {
    try {
      await addLabel(cfg, 'lixo', 'x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
  });
});

describe('getDescription', () => {
  it('retorna texto quando presente', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: { description: 'desc' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const out = await getDescription(cfg, 'ABC-1');
    expect(out).toBe('desc');
    expect(urlOf(0)).toContain('/rest/api/2/issue/ABC-1?fields=description');
  });

  it('retorna string vazia quando description é null', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ fields: { description: null } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await getDescription(cfg, 'ABC-1')).toBe('');
  });

  it('retorna string vazia quando fields ausente', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await getDescription(cfg, 'ABC-1')).toBe('');
  });

  it('valida Key', async () => {
    try {
      await getDescription(cfg, 'lixo');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(2);
    }
  });
});

describe('resolveAssignee', () => {
  it('retorna literal quando recebe username', async () => {
    expect(await resolveAssignee(cfg, 'joao')).toBe('joao');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chama /myself quando recebe undefined', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'bosco' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await resolveAssignee(cfg, undefined)).toBe('bosco');
    expect(urlOf(0)).toContain('/rest/api/2/myself');
  });

  it('chama /myself quando recebe "me"', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'bosco' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await resolveAssignee(cfg, 'me')).toBe('bosco');
  });

  it('"ME" / "Me" também resolvem (case-insensitive)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'bosco' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await resolveAssignee(cfg, 'ME')).toBe('bosco');
  });

  it('cacheia entre chamadas — fetch invocado 1× para 2 resolveAssignee(undefined)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'bosco' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await resolveAssignee(cfg, undefined);
    await resolveAssignee(cfg, 'me');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
