import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as worklogMod from '../../src/jira/worklog.js';
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

describe('jira log', () => {
  it('chama createWorklog sem comment + log padrão', async () => {
    const create = vi.spyOn(worklogMod, 'createWorklog').mockResolvedValueOnce({
      id: '99',
      author: 'B',
      started: '2026-05-10',
      timeSpent: '1h 30m',
      comment: '',
    });
    const code = await runRootSafe(['log', 'ABC-1', '1h 30m']);
    expect(code).toBe(0);
    expect(create).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '1h 30m', undefined);
    expect(stderrText()).toContain('Worklog 1h 30m registrado em ABC-1.');
  });

  it('com 3o arg posicional → comment passado', async () => {
    const create = vi.spyOn(worklogMod, 'createWorklog').mockResolvedValueOnce({
      id: '1',
      author: 'B',
      started: 'd',
      timeSpent: '30m',
      comment: 'investigação bug',
    });
    await runRootSafe(['log', 'ABC-1', '30m', 'investigação bug']);
    expect(create).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '30m', 'investigação bug');
  });

  it('formato inválido (mock 400) → mensagem do servidor + exit 1', async () => {
    vi.spyOn(worklogMod, 'createWorklog').mockRejectedValueOnce(
      new JiraError("Time format invalid: '1h30m'", 1, { httpStatus: 400 }),
    );
    const code = await runRootSafe(['log', 'ABC-1', '1h30m']);
    expect(code).toBe(1);
    expect(stderrText()).toContain('Time format invalid');
  });

  it('--json envelope', async () => {
    vi.spyOn(worklogMod, 'createWorklog').mockResolvedValueOnce({
      id: '99',
      author: 'B',
      started: 'd',
      timeSpent: '1h',
      comment: '',
    });
    const code = await runRootSafe(['--json', 'log', 'ABC-1', '1h']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'log', time: '1h', worklogId: '99' });
  });

  it('Key inválida → exit 2', async () => {
    const create = vi.spyOn(worklogMod, 'createWorklog');
    const code = await runRootSafe(['log', 'lixo', '1h']);
    expect(code).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });
});
