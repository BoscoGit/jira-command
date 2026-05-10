import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { setOutputMode } from '../../src/output.js';
import * as browserMod from '../../src/platform/browser.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;
const realStdin = process.stdin;

function fakeStdin(text: string, isTTY: boolean): void {
  const stream = Readable.from([Buffer.from(text, 'utf8')]) as NodeJS.ReadStream;
  Object.defineProperty(stream, 'isTTY', { value: isTTY });
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
}

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira open', () => {
  it('saída humana imprime "Abrindo <KEY> no navegador..." em stderr', async () => {
    const spy = vi.spyOn(browserMod, 'openInBrowser').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['open', 'ABC-123']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('https://jira.example.com/browse/ABC-123');
    expect(stderrText()).toContain('Abrindo ABC-123 no navegador...');
  });

  it('--json emite envelope { ok:true, key, action:"open" }', async () => {
    vi.spyOn(browserMod, 'openInBrowser').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'open', 'ABC-123']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as { ok: boolean; key: string; action: string };
    expect(parsed).toEqual({ ok: true, key: 'ABC-123', action: 'open' });
  });

  it('Key inválida → exitCode 2 sem chamar openInBrowser', async () => {
    const spy = vi.spyOn(browserMod, 'openInBrowser');
    const code = await runRootSafe(['open', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('pipe stdin processa múltiplas Keys', async () => {
    fakeStdin('ABC-1\nABC-2\n', false);
    const spy = vi.spyOn(browserMod, 'openInBrowser').mockResolvedValue(undefined);
    const code = await runRootSafe(['open']);
    expect(code).toBe(0);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0]?.[0]).toBe('https://jira.example.com/browse/ABC-1');
    expect(spy.mock.calls[1]?.[0]).toBe('https://jira.example.com/browse/ABC-2');
  });

  it('URL construída como <BASE>/browse/<KEY>', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.suaempresa.com.br/';
    const spy = vi.spyOn(browserMod, 'openInBrowser').mockResolvedValueOnce(undefined);
    await runRootSafe(['open', 'XYZ-9']);
    expect(spy.mock.calls[0]?.[0]).toBe('https://jira.suaempresa.com.br/browse/XYZ-9');
  });
});
