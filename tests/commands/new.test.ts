import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as createMod from '../../src/jira/create.js';
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

describe('jira new', () => {
  it('--project --summary cria com type=Task default', async () => {
    const create = vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({
      key: 'ABC-456',
      url: 'https://jira.example.com/browse/ABC-456',
    });
    const code = await runRootSafe(['new', '--project', 'ABC', '--summary', 'X']);
    expect(code).toBe(0);
    expect(create).toHaveBeenCalledWith(expect.anything(), {
      project: { key: 'ABC' },
      summary: 'X',
      issuetype: { name: 'Task' },
    });
    expect(stderrText()).toContain('Issue criada: ABC-456');
    expect(stderrText()).toContain('https://jira.example.com/browse/ABC-456');
    expect(stdoutText().trim()).toBe('ABC-456');
  });

  it('--type Bug propaga', async () => {
    const create = vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({
      key: 'ABC-1',
      url: 'u',
    });
    await runRootSafe(['new', '--project', 'ABC', '--summary', 'x', '--type', 'Bug']);
    const fields = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect((fields.issuetype as { name: string }).name).toBe('Bug');
  });

  it('--desc/--priority/--assignee propagam', async () => {
    const create = vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({
      key: 'ABC-1',
      url: 'u',
    });
    await runRootSafe([
      'new',
      '--project',
      'ABC',
      '--summary',
      'x',
      '--desc',
      'desc',
      '--priority',
      'High',
      '--assignee',
      'joao',
    ]);
    const fields = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(fields.description).toBe('desc');
    expect(fields.priority).toEqual({ name: 'High' });
    expect(fields.assignee).toEqual({ name: 'joao' });
  });

  it('opcionais omitidos no body quando ausentes', async () => {
    const create = vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({
      key: 'ABC-1',
      url: 'u',
    });
    await runRootSafe(['new', '--project', 'ABC', '--summary', 'x']);
    const fields = create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(fields).not.toHaveProperty('description');
    expect(fields).not.toHaveProperty('priority');
    expect(fields).not.toHaveProperty('assignee');
  });

  it('--quiet emite só Key (sem URL/mensagem)', async () => {
    vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({ key: 'ABC-9', url: 'u' });
    const code = await runRootSafe(['new', '--project', 'ABC', '--summary', 'x', '--quiet']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe('ABC-9');
    expect(stderrText()).toBe('');
  });

  it('--json envelope', async () => {
    vi.spyOn(createMod, 'createIssue').mockResolvedValueOnce({
      key: 'ABC-10',
      url: 'https://jira.example.com/browse/ABC-10',
    });
    const code = await runRootSafe(['--json', 'new', '--project', 'ABC', '--summary', 'x']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      key: 'ABC-10',
      action: 'new',
      url: 'https://jira.example.com/browse/ABC-10',
    });
  });
});
