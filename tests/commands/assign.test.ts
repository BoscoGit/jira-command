import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as editMod from '../../src/jira/edit.js';
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

describe('jira assign', () => {
  it('sem --user resolve me e atribui', async () => {
    vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('bosco');
    const upd = vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['assign', 'ABC-1']);
    expect(code).toBe(0);
    expect(upd).toHaveBeenCalledWith(expect.anything(), 'ABC-1', 'bosco');
    expect(stderrText()).toContain('ABC-1 atribuído a bosco.');
  });

  it('--user joao repassa literal', async () => {
    const resolve = vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('joao');
    vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    await runRootSafe(['assign', 'ABC-1', '--user', 'joao']);
    expect(resolve).toHaveBeenCalledWith(expect.anything(), 'joao');
  });

  it('--user me resolve idêntico a sem --user', async () => {
    const resolve = vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('bosco');
    vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    await runRootSafe(['assign', 'ABC-1', '--user', 'me']);
    expect(resolve).toHaveBeenCalledWith(expect.anything(), 'me');
  });

  it('--quiet emite Key em stdout', async () => {
    vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('bosco');
    vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['assign', 'ABC-1', '--quiet']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe('ABC-1');
    expect(stderrText()).toContain('ABC-1 atribuído a bosco.');
  });

  it('--json envelope completo', async () => {
    vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('joao');
    vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'assign', 'ABC-1', '--user', 'joao']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'assign', user: 'joao' });
  });

  it('Key inválida → exit 2 sem chamar update', async () => {
    vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('bosco');
    const upd = vi.spyOn(editMod, 'updateAssignee');
    const code = await runRootSafe(['assign', 'lixo']);
    expect(code).toBe(2);
    expect(upd).not.toHaveBeenCalled();
  });

  it('400 username inexistente → mensagem do servidor + exit 1', async () => {
    vi.spyOn(editMod, 'resolveAssignee').mockResolvedValueOnce('nao-existe');
    vi.spyOn(editMod, 'updateAssignee').mockRejectedValueOnce(
      new JiraError('user not found', 1, { httpStatus: 400 }),
    );
    const code = await runRootSafe(['assign', 'ABC-1', '--user', 'nao-existe']);
    expect(code).toBe(1);
    expect(stderrText()).toContain('user not found');
  });
});
