import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import { JiraError } from '../../src/errors.js';
import * as transMod from '../../src/jira/transitions.js';
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

describe('jira move', () => {
  it('ID válido aplica e loga com to.name', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
      { id: '31', name: 'Done', to: 'Done' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['move', 'ABC-1', '21']);
    expect(code).toBe(0);
    expect(apply).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '21');
    expect(stderrText()).toContain("Transição 21 aplicada em ABC-1. Estado atual: 'In Progress'.");
  });

  it('ID inexistente → mensagem com instrução + exit 1, sem applyTransition', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start', to: 'In Progress' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition');
    const code = await runRootSafe(['move', 'ABC-1', '9999']);
    expect(code).toBe(1);
    expect(apply).not.toHaveBeenCalled();
    expect(stderrText()).toContain('Transição 9999 não encontrada para ABC-1');
    expect(stderrText()).toContain("Execute 'jira trans ABC-1'");
  });

  it('Key inválida → exit 2 antes de listar', async () => {
    const list = vi.spyOn(transMod, 'listTransitions');
    const code = await runRootSafe(['move', 'lixo', '21']);
    expect(code).toBe(2);
    expect(list).not.toHaveBeenCalled();
  });

  it('--json action="move"', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start', to: 'In Progress' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'move', 'ABC-1', '21']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      key: 'ABC-1',
      action: 'move',
      transitionId: '21',
      to: 'In Progress',
    });
  });

  it('403 → exit 5 com mensagem específica de transição', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start', to: 'In Progress' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockRejectedValueOnce(
      new JiraError('Sem permissão: x', 5, { httpStatus: 403 }),
    );
    const code = await runRootSafe(['move', 'ABC-1', '21']);
    expect(code).toBe(5);
    expect(stderrText()).toContain('Sem permissão para realizar esta transição em ABC-1.');
  });
});
