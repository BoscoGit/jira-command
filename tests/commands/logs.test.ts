import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as worklogMod from '../../src/jira/worklog.js';
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

describe('jira logs', () => {
  it('imprime tabela ID/AUTOR/DATA/TEMPO/COMENTÁRIO com preview 60', async () => {
    const longComment = 'b'.repeat(80);
    vi.spyOn(worklogMod, 'listWorklog').mockResolvedValueOnce([
      {
        id: '1',
        author: 'Bosco',
        started: '2026-05-10T12:00:00.000Z',
        timeSpent: '1h',
        comment: longComment,
      },
    ]);
    const code = await runRootSafe(['logs', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('ID');
    expect(out).toContain('AUTOR');
    expect(out).toContain('DATA');
    expect(out).toContain('TEMPO');
    expect(out).toContain('COMENTÁRIO');
    expect(out).toContain('Bosco');
    expect(out).toContain('1h');
    // preview 60 → 57 b + '...'
    expect(out).toContain(`${'b'.repeat(57)}...`);
  });

  it('vazio → mensagem específica', async () => {
    vi.spyOn(worklogMod, 'listWorklog').mockResolvedValueOnce([]);
    const code = await runRootSafe(['logs', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhum apontamento em ABC-1.');
  });

  it('--json array sem envelope', async () => {
    const data = [{ id: '1', author: 'B', started: 'd', timeSpent: '1h', comment: 'x' }];
    vi.spyOn(worklogMod, 'listWorklog').mockResolvedValueOnce(data);
    const code = await runRootSafe(['--json', 'logs', 'ABC-1']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });

  it('Key inválida → exit 2', async () => {
    const spy = vi.spyOn(worklogMod, 'listWorklog');
    const code = await runRootSafe(['logs', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
