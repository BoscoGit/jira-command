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
  delete process.env.JIRA_PATTERN_START;
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

describe('jira start', () => {
  it('match único: aplica transição e loga sucesso com to.name real', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
      { id: '99', name: 'Cancel', to: 'Cancelled' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['start', 'ABC-1']);
    expect(code).toBe(0);
    expect(apply).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '21');
    expect(stderrText()).toContain("ABC-1 movida para 'In Progress'.");
  });

  it('match nenhum: lista disponíveis com label "Em Andamento" e exit 1', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '99', name: 'Resolve', to: 'Resolved' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition');
    const code = await runRootSafe(['start', 'ABC-1']);
    expect(code).toBe(1);
    expect(apply).not.toHaveBeenCalled();
    expect(stderrText()).toContain("Transição 'Em Andamento' não disponível em ABC-1");
    expect(stderrText()).toContain('99 - Resolve -> Resolved');
  });

  it('match ambíguo: recusa aplicar e instrui jira move', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
      { id: '41', name: 'Resume Progress', to: 'In Progress' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition');
    const code = await runRootSafe(['start', 'ABC-1']);
    expect(code).toBe(1);
    expect(apply).not.toHaveBeenCalled();
    expect(stderrText()).toContain('Várias transições correspondem ao padrão em ABC-1');
    expect(stderrText()).toContain('21 - Start Progress');
    expect(stderrText()).toContain('41 - Resume Progress');
    expect(stderrText()).toContain("Use 'jira move ABC-1 <ID>'");
  });

  it('Key inválida → exit 2 antes de chamar listTransitions', async () => {
    const list = vi.spyOn(transMod, 'listTransitions');
    const code = await runRootSafe(['start', 'lixo']);
    expect(code).toBe(2);
    expect(list).not.toHaveBeenCalled();
  });

  it('--json em sucesso emite envelope action="start"', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['--json', 'start', 'ABC-1']);
    expect(code).toBe(0);
    const out = stdoutText().trim();
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed).toEqual({
      ok: true,
      key: 'ABC-1',
      action: 'start',
      transitionId: '21',
      to: 'In Progress',
    });
  });

  it('403 mapeado para "Sem permissão para realizar esta transição em <KEY>." + exit 5', async () => {
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '21', name: 'Start Progress', to: 'In Progress' },
    ]);
    vi.spyOn(transMod, 'applyTransition').mockRejectedValueOnce(
      new JiraError('Sem permissão: x', 5, { httpStatus: 403 }),
    );
    const code = await runRootSafe(['start', 'ABC-1']);
    expect(code).toBe(5);
    expect(stderrText()).toContain('Sem permissão para realizar esta transição em ABC-1.');
  });

  it('respeita override JIRA_PATTERN_START', async () => {
    process.env.JIRA_PATTERN_START = 'Custom';
    vi.spyOn(transMod, 'listTransitions').mockResolvedValueOnce([
      { id: '99', name: 'Custom Workflow Step', to: 'Doing' },
    ]);
    const apply = vi.spyOn(transMod, 'applyTransition').mockResolvedValueOnce(undefined);
    const code = await runRootSafe(['start', 'ABC-1']);
    expect(code).toBe(0);
    expect(apply).toHaveBeenCalledWith(expect.anything(), 'ABC-1', '99');
    expect(stderrText()).toContain("ABC-1 movida para 'Doing'.");
  });
});
