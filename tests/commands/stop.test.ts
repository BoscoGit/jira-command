import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as transMod from '../../src/jira/transitions.js';
import { setOutputMode } from '../../src/output.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  delete process.env.JIRA_PATTERN_STOP;
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('jira stop', () => {
  it('match único aplica', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '11', name: 'Reabrir', to: 'To Do' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['stop', 'ABC-1']);
    expect(code).toBe(0);
    const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderr).toContain("ABC-1 movida para 'To Do'.");
  });

  it('match nenhum: label "A Fazer"', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '99', name: 'In Progress', to: 'In Progress' },
    ]);
    const code = await runRootSafe(['stop', 'ABC-1']);
    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderr).toContain("Transição 'A Fazer' não disponível em ABC-1");
  });

  it('--json action="stop"', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '11', name: 'Backlog', to: 'Backlog' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'stop', 'ABC-1']);
    expect(code).toBe(0);
    const stdout = stdoutSpy.mock.calls
      .map((c) => String(c[0]))
      .join('')
      .trim();
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    expect(parsed.action).toBe('stop');
  });
});
