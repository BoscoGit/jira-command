import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { setOutputMode } from '../../src/output.js';

const ME_PAYLOAD = {
  name: 'bosco.silva',
  displayName: 'Bosco Silva',
  emailAddress: 'bosco@example.com',
  key: 'JIRAUSER123',
  active: true,
};

let fetchMock: ReturnType<typeof vi.fn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

const ENV_KEYS = ['JIRA_TOKEN', 'JIRA_BASE_URL', 'JIRA_INSECURE', 'JIRA_TIMEOUT'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira me', () => {
  it('saída humana lista displayName, email, username, key', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(ME_PAYLOAD), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const code = await runRootSafe(['me']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('Logado como: Bosco Silva <bosco@example.com>');
    expect(out).toContain('Username  : bosco.silva');
    expect(out).toContain('Key       : JIRAUSER123');
  });

  it('com --json emite JSON único e nada de decorativo', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(ME_PAYLOAD), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const code = await runRootSafe(['--json', 'me']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed).toEqual({
      name: 'bosco.silva',
      displayName: 'Bosco Silva',
      emailAddress: 'bosco@example.com',
      key: 'JIRAUSER123',
    });
  });

  it('401 propaga mensagem RF-001 e exitCode 3', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401, statusText: 'Unauthorized' }));
    const code = await runRootSafe(['me']);
    expect(code).toBe(3);
    expect(stderrText()).toMatch(/Falha na autenticação/);
  });

  it('sem JIRA_TOKEN → exitCode 2 com mensagem RF-002', async () => {
    delete process.env.JIRA_TOKEN;
    const code = await runRootSafe(['me']);
    expect(code).toBe(2);
    expect(stderrText()).toMatch(/JIRA_TOKEN é obrigatória/);
  });
});
