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

describe('jira label-del', () => {
  it('chama removeLabel(key, "<L>") + log', async () => {
    const rm = vi.spyOn(editMod, 'removeLabel').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['label-del', 'ABC-1', 'backend']);
    expect(code).toBe(0);
    expect(rm).toHaveBeenCalledWith(expect.anything(), 'ABC-1', 'backend');
    expect(stderrSpy.mock.calls.map((c) => String(c[0])).join('')).toContain(
      "Label 'backend' removida de ABC-1.",
    );
  });

  it('--json action=label-del + removed', async () => {
    vi.spyOn(editMod, 'removeLabel').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'label-del', 'ABC-1', 'backend']);
    expect(code).toBe(0);
    const parsed = JSON.parse(
      stdoutSpy.mock.calls
        .map((c) => String(c[0]))
        .join('')
        .trim(),
    ) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'label-del', removed: 'backend' });
  });

  it('Key inválida → exit 2', async () => {
    const rm = vi.spyOn(editMod, 'removeLabel');
    const code = await runRootSafe(['label-del', 'lixo', 'x']);
    expect(code).toBe(2);
    expect(rm).not.toHaveBeenCalled();
  });
});
