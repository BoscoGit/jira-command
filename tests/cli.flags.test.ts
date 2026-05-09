import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../src/commands/root.js';
import { setOutputMode } from '../src/output.js';

const ME_PAYLOAD = {
  name: 'u',
  displayName: 'U',
  emailAddress: 'u@x',
  key: 'K',
};

let fetchMock: ReturnType<typeof vi.fn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function _stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('flags globais', () => {
  it('--json em comando de listagem emite JSON em stdout (RF-009)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(ME_PAYLOAD), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const code = await runRootSafe(['--json', 'me']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('--json em erro de auth emite envelope { ok:false, error, exitCode } (RF-019)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401, statusText: 'Unauthorized' }));
    const code = await runRootSafe(['--json', 'me']);
    expect(code).toBe(3);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as { ok: boolean; error: string; exitCode: number };
    expect(parsed.ok).toBe(false);
    expect(parsed.exitCode).toBe(3);
    expect(parsed.error).toMatch(/Falha na autenticação/);
  });

  it('--json em erro sem env var → envelope no stdout', async () => {
    delete process.env.JIRA_TOKEN;
    const code = await runRootSafe(['--json', 'me']);
    expect(code).toBe(2);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as { ok: boolean; exitCode: number };
    expect(parsed.ok).toBe(false);
    expect(parsed.exitCode).toBe(2);
  });

  it('--no-color suprime cores em saída humana', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(ME_PAYLOAD), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const code = await runRootSafe(['--no-color', 'me']);
    expect(code).toBe(0);
    const out = stdoutText();
    // Escape sequences ANSI: [ ou \x1b[ — picocolors usa essa forma
    expect(out).not.toContain('[');
  });
});
