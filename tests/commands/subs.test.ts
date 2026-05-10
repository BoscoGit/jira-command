import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as createMod from '../../src/jira/create.js';
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

describe('jira subs', () => {
  it('tabela KEY/STATUS/TIPO/RESUMO', async () => {
    vi.spyOn(createMod, 'getSubtasks').mockResolvedValueOnce([
      { key: 'ABC-501', status: 'Open', type: 'Sub-task', summary: 'X' },
    ]);
    const code = await runRootSafe(['subs', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('KEY');
    expect(out).toContain('STATUS');
    expect(out).toContain('TIPO');
    expect(out).toContain('RESUMO');
    expect(out).toContain('ABC-501');
  });

  it('vazio → "<KEY> não tem subtasks."', async () => {
    vi.spyOn(createMod, 'getSubtasks').mockResolvedValueOnce([]);
    const code = await runRootSafe(['subs', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('ABC-1 não tem subtasks.');
  });

  it('--json array', async () => {
    const data = [{ key: 'ABC-1', status: 'X', type: 'T', summary: 'S' }];
    vi.spyOn(createMod, 'getSubtasks').mockResolvedValueOnce(data);
    const code = await runRootSafe(['--json', 'subs', 'ABC-1']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });

  it('Key inválida → exit 2', async () => {
    const spy = vi.spyOn(createMod, 'getSubtasks');
    const code = await runRootSafe(['subs', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
