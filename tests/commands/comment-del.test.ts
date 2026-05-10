import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as commentsMod from '../../src/jira/comments.js';
import { setOutputMode } from '../../src/output.js';
import * as promptMod from '../../src/platform/prompt.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
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

describe('jira comment-del', () => {
  it('--yes deleta direto sem prompt', async () => {
    const del = vi.spyOn(commentsMod, 'deleteComment').mockResolvedValueOnce(undefined);
    const confirm = vi.spyOn(promptMod, 'confirmInteractive');
    const code = await runRootSafe(['comment-del', 'ABC-1', '12345', '--yes']);
    expect(code).toBe(0);
    expect(del).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '12345');
    expect(confirm).not.toHaveBeenCalled();
    expect(stderrText()).toContain('Comentário 12345 deletado.');
  });

  it('interativo + confirm true → deleta', async () => {
    vi.spyOn(promptMod, 'confirmInteractive').mockResolvedValueOnce(true);
    const del = vi.spyOn(commentsMod, 'deleteComment').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['comment-del', 'ABC-1', '12345']);
    expect(code).toBe(0);
    expect(del).toHaveBeenCalledTimes(1);
    expect(stderrText()).toContain('Comentário 12345 deletado.');
  });

  it('interativo + confirm false → "Operação cancelada." exit 0 sem delete', async () => {
    vi.spyOn(promptMod, 'confirmInteractive').mockResolvedValueOnce(false);
    const del = vi.spyOn(commentsMod, 'deleteComment');
    const code = await runRootSafe(['comment-del', 'ABC-1', '12345']);
    expect(code).toBe(0);
    expect(del).not.toHaveBeenCalled();
    expect(stderrText()).toContain('Operação cancelada.');
  });

  it('não-interativo (stdin não-TTY) sem --yes → exit 2', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const del = vi.spyOn(commentsMod, 'deleteComment');
    const confirm = vi.spyOn(promptMod, 'confirmInteractive');
    const code = await runRootSafe(['comment-del', 'ABC-1', '12345']);
    expect(code).toBe(2);
    expect(confirm).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(stderrText()).toContain(
      'Operação cancelada (modo não-interativo). Use --yes para confirmar.',
    );
  });

  it('--json envelope', async () => {
    vi.spyOn(commentsMod, 'deleteComment').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'comment-del', 'ABC-1', '12345', '--yes']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      key: 'ABC-1',
      action: 'comment-del',
      commentId: '12345',
    });
  });

  it('Key inválida → exit 2', async () => {
    const del = vi.spyOn(commentsMod, 'deleteComment');
    const code = await runRootSafe(['comment-del', 'lixo', '1', '--yes']);
    expect(code).toBe(2);
    expect(del).not.toHaveBeenCalled();
  });

  it('403 mapeado para exit 5', async () => {
    vi.spyOn(commentsMod, 'deleteComment').mockRejectedValueOnce(
      new JiraError('Sem permissão: x', 5, { httpStatus: 403 }),
    );
    const code = await runRootSafe(['comment-del', 'ABC-1', '99', '--yes']);
    expect(code).toBe(5);
  });
});
