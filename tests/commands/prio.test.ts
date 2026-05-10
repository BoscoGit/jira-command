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

describe('jira prio', () => {
  it('chama updateField com priority + log', async () => {
    const upd = vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['prio', 'ABC-1', 'High']);
    expect(code).toBe(0);
    expect(upd).toHaveBeenCalledWith(expect.anything(), 'ABC-1', { priority: { name: 'High' } });
    expect(stderrSpy.mock.calls.map((c) => String(c[0])).join('')).toContain(
      'ABC-1 prioridade definida para High.',
    );
  });

  it('--json envelope', async () => {
    vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'prio', 'ABC-1', 'High']);
    expect(code).toBe(0);
    const parsed = JSON.parse(
      stdoutSpy.mock.calls
        .map((c) => String(c[0]))
        .join('')
        .trim(),
    ) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'prio', priority: 'High' });
  });

  it('priority inválida (400) → mensagem servidor + exit 1', async () => {
    vi.spyOn(editMod, 'updateField').mockRejectedValueOnce(
      new JiraError("'Lixo' is not a valid priority", 1, { httpStatus: 400 }),
    );
    const code = await runRootSafe(['prio', 'ABC-1', 'Lixo']);
    expect(code).toBe(1);
    expect(stderrSpy.mock.calls.map((c) => String(c[0])).join('')).toContain(
      'not a valid priority',
    );
  });

  it('Key inválida → exit 2', async () => {
    const upd = vi.spyOn(editMod, 'updateField');
    const code = await runRootSafe(['prio', 'lixo', 'High']);
    expect(code).toBe(2);
    expect(upd).not.toHaveBeenCalled();
  });
});
