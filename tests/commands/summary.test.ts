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

describe('jira summary', () => {
  it('chama updateField com summary + log', async () => {
    const upd = vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['summary', 'ABC-1', 'Novo Título']);
    expect(code).toBe(0);
    expect(upd).toHaveBeenCalledWith(expect.anything(), 'ABC-1', { summary: 'Novo Título' });
    expect(stderrSpy.mock.calls.map((c) => String(c[0])).join('')).toContain(
      'ABC-1 título atualizado.',
    );
  });

  it('--json envelope', async () => {
    vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'summary', 'ABC-1', 'Novo']);
    expect(code).toBe(0);
    const parsed = JSON.parse(
      stdoutSpy.mock.calls
        .map((c) => String(c[0]))
        .join('')
        .trim(),
    ) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'summary', summary: 'Novo' });
  });

  it('Key inválida → exit 2', async () => {
    const upd = vi.spyOn(editMod, 'updateField');
    const code = await runRootSafe(['summary', 'lixo', 'X']);
    expect(code).toBe(2);
    expect(upd).not.toHaveBeenCalled();
  });
});
