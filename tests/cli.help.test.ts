import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../src/commands/root.js';
import { setOutputMode } from '../src/output.js';
import { VERSION } from '../src/version.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

const ENV_KEYS = ['JIRA_TOKEN', 'JIRA_BASE_URL', 'JIRA_INSECURE', 'JIRA_TIMEOUT'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
});

function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('--version / -V (RF-020/021)', () => {
  it('--version imprime VERSION e sai com 0 SEM exigir env vars', async () => {
    const code = await runRootSafe(['--version']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe(VERSION);
  });

  it('-V curto faz o mesmo', async () => {
    const code = await runRootSafe(['-V']);
    expect(code).toBe(0);
    expect(stdoutText().trim()).toBe(VERSION);
  });
});

describe('--help / sem args (RF-005/006/021)', () => {
  // Nota: citty usa `consola` para showUsage, que escreve em stdout via mecanismo
  // próprio. Não conseguimos interceptar via vi.spyOn(process.stdout, 'write').
  // Validação visual fica em quickstart.md V1; aqui validamos exit code e
  // ausência de erro (env vars deletadas — se a validação rodasse, seria exit 2).

  it('--help sai com 0 SEM exigir env vars (RF-021)', async () => {
    const code = await runRootSafe(['--help']);
    expect(code).toBe(0);
    expect(stderrText()).not.toMatch(/JIRA_TOKEN/);
  });

  it('sem args sai com 0 (RF-005)', async () => {
    const code = await runRootSafe([]);
    expect(code).toBe(0);
    expect(stderrText()).not.toMatch(/JIRA_TOKEN/);
  });

  it('jira me --help sai com 0 SEM exigir env vars', async () => {
    const code = await runRootSafe(['me', '--help']);
    expect(code).toBe(0);
    expect(stderrText()).not.toMatch(/JIRA_TOKEN/);
  });
});

describe('comando desconhecido (RF-005, H3 critério 3)', () => {
  it('emite mensagem específica e exit 2', async () => {
    const code = await runRootSafe(['foo']);
    expect(code).toBe(2);
    expect(stderrText()).toMatch(/Comando desconhecido 'foo'/);
    expect(stderrText()).toMatch(/Execute 'jira --help'/);
  });

  it('NÃO exige JIRA_TOKEN (validação só aconteceria no comando real)', async () => {
    delete process.env.JIRA_TOKEN;
    const code = await runRootSafe(['banana']);
    expect(code).toBe(2);
  });
});
