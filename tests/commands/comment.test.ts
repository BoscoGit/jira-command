import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as commentsMod from '../../src/jira/comments.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

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
});

function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira comment', () => {
  it('cria comentário e loga com id retornado', async () => {
    const create = vi.spyOn(commentsMod, 'createComment').mockResolvedValueOnce({
      id: '999',
      author: 'Bosco',
      created: '2026-05-10',
      body: 'PR enviado',
    });
    const code = await runRootSafe(['comment', 'ABC-1', 'PR enviado']);
    expect(code).toBe(0);
    expect(create).toHaveBeenCalledWith(expect.anything(), 'ABC-1', 'PR enviado');
    expect(stderrText()).toContain('Comentário adicionado em ABC-1 (#999).');
  });

  it('texto vazio → exit 2 sem chamar API', async () => {
    const create = vi.spyOn(commentsMod, 'createComment');
    const code = await runRootSafe(['comment', 'ABC-1', '']);
    expect(code).toBe(2);
    expect(create).not.toHaveBeenCalled();
    expect(stderrText()).toContain('O texto do comentário não pode ser vazio.');
  });

  it('texto só com espaços → exit 2 sem chamar API', async () => {
    const create = vi.spyOn(commentsMod, 'createComment');
    const code = await runRootSafe(['comment', 'ABC-1', '   ']);
    expect(code).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });

  it('--json envelope', async () => {
    vi.spyOn(commentsMod, 'createComment').mockResolvedValueOnce({
      id: '42',
      author: 'X',
      created: 'd',
      body: 'b',
    });
    const code = await runRootSafe(['--json', 'comment', 'ABC-1', 'oi']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'comment', commentId: '42' });
  });

  it('Key inválida → exit 2', async () => {
    const create = vi.spyOn(commentsMod, 'createComment');
    const code = await runRootSafe(['comment', 'lixo', 'oi']);
    expect(code).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });
});
