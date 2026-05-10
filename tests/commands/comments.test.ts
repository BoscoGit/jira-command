import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as commentsMod from '../../src/jira/comments.js';
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

describe('jira comments', () => {
  it('imprime tabela ID/AUTOR/DATA/COMENTÁRIO com preview 80', async () => {
    const longBody = 'a'.repeat(100);
    vi.spyOn(commentsMod, 'listComments').mockResolvedValueOnce([
      { id: '1', author: 'Bosco', created: '2026-05-10T12:34:56.000Z', body: longBody },
    ]);
    const code = await runRootSafe(['comments', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText();
    expect(out).toContain('ID');
    expect(out).toContain('AUTOR');
    expect(out).toContain('DATA');
    expect(out).toContain('COMENTÁRIO');
    expect(out).toContain('Bosco');
    expect(out).toContain('2026-05-10');
    // preview 80 → 77 chars + '...'
    expect(out).toContain(`${'a'.repeat(77)}...`);
  });

  it('vazio → mensagem específica', async () => {
    vi.spyOn(commentsMod, 'listComments').mockResolvedValueOnce([]);
    const code = await runRootSafe(['comments', 'ABC-1']);
    expect(code).toBe(0);
    expect(stdoutText()).toContain('Nenhum comentário em ABC-1.');
  });

  it('--json array sem envelope', async () => {
    const data = [{ id: '1', author: 'X', created: 'd', body: 'b' }];
    vi.spyOn(commentsMod, 'listComments').mockResolvedValueOnce(data);
    const code = await runRootSafe(['--json', 'comments', 'ABC-1']);
    expect(code).toBe(0);
    expect(JSON.parse(stdoutText().trim())).toEqual(data);
  });

  it('chama listComments com max=50', async () => {
    const spy = vi.spyOn(commentsMod, 'listComments').mockResolvedValueOnce([]);
    await runRootSafe(['comments', 'ABC-1']);
    expect(spy.mock.calls[0]?.[2]).toBe(50);
  });

  it('Key inválida → exit 2', async () => {
    const spy = vi.spyOn(commentsMod, 'listComments');
    const code = await runRootSafe(['comments', 'lixo']);
    expect(code).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
