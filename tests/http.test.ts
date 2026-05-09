import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../src/config.js';
import { JiraError } from '../src/errors.js';
import { jiraFetch, resetHttpStateForTests } from '../src/http.js';
import { VERSION } from '../src/version.js';

const cfgBase: Config = Object.freeze({
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

describe('jiraFetch headers', () => {
  it('envia Authorization Bearer e User-Agent (RF-017/023)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await jiraFetch(cfgBase, '/x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer TKN');
    expect(headers.get('User-Agent')).toBe(`jira-cli/${VERSION} (Node/${process.version})`);
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('inclui Content-Type quando há body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await jiraFetch(cfgBase, '/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('NÃO inclui Content-Type quando sem body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await jiraFetch(cfgBase, '/x');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get('Content-Type')).toBeNull();
  });
});

describe('jiraFetch error mapping', () => {
  it('401 → JiraError exitCode 3', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401, statusText: 'Unauthorized' }));
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(JiraError);
      expect((err as JiraError).exitCode).toBe(3);
    }
  });

  it('403 → exitCode 5', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403, statusText: 'Forbidden' }));
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(5);
    }
  });

  it('404 → exitCode 4', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404, statusText: 'Not Found' }));
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(4);
    }
  });

  it('chama fetch exatamente 1× mesmo em falha (RF-022 sem retry)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'X' }));
    await expect(jiraFetch(cfgBase, '/x')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AbortError de timeout → exitCode 6', async () => {
    fetchMock.mockImplementationOnce(() => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      return Promise.reject(e);
    });
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(6);
      expect((err as JiraError).message).toMatch(/timeout/);
    }
  });

  it('erro de rede genérico → exitCode 6', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(6);
    }
  });

  it('erro TLS sem JIRA_INSECURE → mensagem RF-014 + exitCode 1', async () => {
    const tlsErr = Object.assign(new Error('cert'), {
      cause: { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' },
    });
    fetchMock.mockRejectedValueOnce(tlsErr);
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).exitCode).toBe(1);
      expect((err as JiraError).message).toMatch(/Falha na verificação SSL/);
    }
  });
});

describe('jiraFetch SSL bypass (RF-003 / US2)', () => {
  it('com insecure=true, erro TLS NÃO produz mensagem de SSL — repassa como erro de rede genérico', async () => {
    const cfgInsecure: Config = { ...cfgBase, insecure: true };
    const tlsErr = Object.assign(new Error('cert'), {
      cause: { code: 'CERT_HAS_EXPIRED' },
    });
    fetchMock.mockRejectedValueOnce(tlsErr);
    try {
      await jiraFetch(cfgInsecure, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).message).not.toMatch(/Falha na verificação SSL/);
      // erro vira "Falha de rede: cert" → exitCode 6
      expect((err as JiraError).exitCode).toBe(6);
    }
  });

  it.each([
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  ])('erro TLS com code=%s sem JIRA_INSECURE → mensagem RF-014', async (code) => {
    const tlsErr = Object.assign(new Error('cert'), { cause: { code } });
    fetchMock.mockRejectedValueOnce(tlsErr);
    try {
      await jiraFetch(cfgBase, '/x');
      expect.fail();
    } catch (err) {
      expect((err as JiraError).message).toMatch(/Falha na verificação SSL/);
      expect((err as JiraError).exitCode).toBe(1);
    }
  });
});
