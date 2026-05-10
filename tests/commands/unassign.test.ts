import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
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

describe('jira unassign', () => {
  it('chama updateAssignee(key, null) e log "sem responsável"', async () => {
    const upd = vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['unassign', 'ABC-1']);
    expect(code).toBe(0);
    expect(upd).toHaveBeenCalledWith(expect.anything(), 'ABC-1', null);
    expect(stderrSpy.mock.calls.map((c) => String(c[0])).join('')).toContain(
      'ABC-1 sem responsável.',
    );
  });

  it('--json action=unassign', async () => {
    vi.spyOn(editMod, 'updateAssignee').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'unassign', 'ABC-1']);
    expect(code).toBe(0);
    const parsed = JSON.parse(
      stdoutSpy.mock.calls
        .map((c) => String(c[0]))
        .join('')
        .trim(),
    ) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'unassign' });
  });

  it('Key inválida → exit 2', async () => {
    const upd = vi.spyOn(editMod, 'updateAssignee');
    const code = await runRootSafe(['unassign', 'lixo']);
    expect(code).toBe(2);
    expect(upd).not.toHaveBeenCalled();
  });
});
