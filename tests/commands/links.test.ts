import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as linksMod from '../../src/jira/links.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira links', () => {
  it('tabela DIREÇÃO/TIPO/ISSUE/STATUS/RESUMO', async () => {
    vi.spyOn(linksMod, 'getIssueLinks').mockResolvedValueOnce([
      { direction: '->', type: 'blocks', key: 'ABC-2', status: 'Open', summary: 's' },
      { direction: '<-', type: 'relates', key: 'ABC-3', status: 'Done', summary: 'r' },
    ]);
    const code = await runRootSafe(['links', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('DIREÇÃO');
    expect(out).toContain('TIPO');
    expect(out).toContain('ISSUE');
    expect(out).toContain('->');
    expect(out).toContain('<-');
    expect(out).toContain('ABC-2');
    expect(out).toContain('ABC-3');
  });

  it('vazio → "<KEY> não tem links."', async () => {
    vi.spyOn(linksMod, 'getIssueLinks').mockResolvedValueOnce([]);
    const code = await runRootSafe(['links', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('ABC-1 não tem links.');
  });

  it('--json array', async () => {
    const data = [{ direction: '->', type: 'b', key: 'ABC-2', status: 'O', summary: 's' }];
    vi.spyOn(linksMod, 'getIssueLinks').mockResolvedValueOnce(data);
    const code = await runRootSafe(['--json', 'links', 'ABC-1']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });

  it('Key inválida → exit 2', async () => {
    const spy = vi.spyOn(linksMod, 'getIssueLinks');
    const code = await runRootSafe(['links', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
